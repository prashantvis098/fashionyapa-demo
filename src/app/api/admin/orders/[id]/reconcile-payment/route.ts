import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/firebase/admin-auth';

type Body = { paymentId?: string };

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay live server keys are not configured.' },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    const paymentId = String(body?.paymentId ?? '').trim();
    if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
      return NextResponse.json({ error: 'Enter a valid Razorpay Payment ID.' }, { status: 400 });
    }

    const db = adminDb();
    const orderRef = db.collection('orders').doc(params.id);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Fashionyapa order not found.' }, { status: 404 });
    }
    const order = orderSnap.data()!;
    if (!order.razorpay_order_id) {
      return NextResponse.json({ error: 'This order has no Razorpay Order ID saved.' }, { status: 409 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status !== 'captured') {
      return NextResponse.json(
        { error: `Razorpay reports payment status "${payment.status}", not captured. No changes made.` },
        { status: 409 }
      );
    }
    if (payment.currency !== 'INR' || payment.order_id !== order.razorpay_order_id) {
      return NextResponse.json(
        { error: 'Payment currency or Razorpay Order ID does not match this Fashionyapa order.' },
        { status: 409 }
      );
    }

    const notes = (payment.notes ?? {}) as Record<string, string>;
    if (
      String(notes.fashionyapa_order_id ?? '') !== params.id ||
      String(notes.order_number ?? '') !== String(order.order_number ?? '')
    ) {
      return NextResponse.json(
        { error: 'Razorpay notes do not match this Fashionyapa order. No changes made.' },
        { status: 409 }
      );
    }

    const expectedPaise = Math.round(Number(order.amount_due_now ?? order.total_amount) * 100);
    if (!Number.isFinite(expectedPaise) || Number(payment.amount) !== expectedPaise) {
      return NextResponse.json(
        { error: 'Captured amount does not match the amount due for this order. No changes made.' },
        { status: 409 }
      );
    }

    const paidAmount = Number(payment.amount) / 100;
    const now = new Date().toISOString();

    const result = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(orderRef);
      if (!fresh.exists) throw new Error('Fashionyapa order disappeared during reconciliation.');
      const current = fresh.data()!;

      if (current.razorpay_order_id !== payment.order_id) {
        throw new Error('Order changed during reconciliation. Refresh and try again.');
      }

      if (current.payment_status === 'paid' || current.payment_status === 'advance_paid') {
        if (String(current.razorpay_payment_id ?? '') === paymentId) {
          return { alreadyReconciled: true, amountPaid: Number(current.amount_paid ?? paidAmount) };
        }
        throw new Error('This order is already marked paid with a different payment. Manual review is required.');
      }

      tx.update(orderRef, {
        razorpay_payment_id: paymentId,
        payment_status: current.payment_method === 'cod' ? 'advance_paid' : 'paid',
        amount_paid: paidAmount,
        amount_due: Math.max(0, Number(current.total_amount ?? paidAmount) - paidAmount),
        ...(current.status === 'payment_pending' ? { status: 'confirmed' } : {}),
        paid_at: now,
        payment_reconciled_at: now,
        payment_reconciled_by: auth.uid,
        updated_at: now,
      });

      return { alreadyReconciled: false, amountPaid: paidAmount };
    });

    return NextResponse.json({
      success: true,
      alreadyReconciled: result.alreadyReconciled,
      orderNumber: String(order.order_number ?? ''),
      paymentStatus: order.payment_method === 'cod' ? 'advance_paid' : 'paid',
      amountPaid: result.amountPaid,
    });
  } catch (error) {
    console.error('Admin Razorpay payment reconciliation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not reconcile payment.' },
      { status: 500 }
    );
  }
}
