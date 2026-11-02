import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebase/admin';

type VerifyBody = {
  orderId?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

const safeEqualHex = (left: string, right: string) => {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
};

export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay server keys are not configured.' }, { status: 503 });
    }

    const body = (await request.json()) as VerifyBody;
    const orderId = String(body.orderId ?? '').trim();
    const razorpayOrderId = String(body.razorpay_order_id ?? '').trim();
    const paymentId = String(body.razorpay_payment_id ?? '').trim();
    const signature = String(body.razorpay_signature ?? '').trim();

    if (!orderId || !razorpayOrderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Payment verification details are incomplete.' }, { status: 400 });
    }

    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'The order could not be found.' }, { status: 404 });
    }

    const order = orderSnap.data()!;
    // Always use the Razorpay order ID stored on our server, never trust the browser value.
    if (!order.razorpay_order_id || order.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json({ error: 'This payment does not match the order.' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${order.razorpay_order_id}|${paymentId}`)
      .digest('hex');

    if (!safeEqualHex(expectedSignature, signature)) {
      return NextResponse.json({ error: 'Razorpay payment signature could not be verified.' }, { status: 400 });
    }

    // Verify the payment directly with Razorpay as well as checking the Checkout signature.
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.order_id !== order.razorpay_order_id) {
      return NextResponse.json({ error: 'Razorpay payment is linked to a different order.' }, { status: 400 });
    }

    const expectedAmountPaise = Math.round(Number(order.amount_due_now) * 100);
    if (
      payment.currency !== 'INR' ||
      Number(payment.amount) !== expectedAmountPaise
    ) {
      return NextResponse.json({ error: 'The Razorpay payment amount does not match this order.' }, { status: 400 });
    }

    if (payment.status !== 'captured') {
      return NextResponse.json(
        { error: `Payment is verified but its Razorpay status is "${payment.status}". The order will be confirmed after capture.` },
        { status: 202 }
      );
    }

    const result = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(orderRef);
      if (!freshSnap.exists) throw new Error('Order not found during payment update.');
      const freshOrder = freshSnap.data()!;

      if (freshOrder.razorpay_order_id !== order.razorpay_order_id) {
        throw new Error('Order/payment mismatch.');
      }

      if (['paid', 'advance_paid'].includes(String(freshOrder.payment_status))) {
        return {
          orderNumber: String(freshOrder.order_number ?? ''),
          paymentStatus: String(freshOrder.payment_status),
          amountPaid: Number(freshOrder.amount_paid ?? 0),
        };
      }

      const items = (freshOrder.items || []) as Array<{ product_id?: string; quantity?: number }>;
      const productRefs = items
        .filter((item) => item.product_id)
        .map((item) => db.collection('products').doc(String(item.product_id)));
      const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
      const paidAmount = Number(payment.amount) / 100;
      const now = new Date().toISOString();
      const paymentStatus = freshOrder.payment_method === 'cod' ? 'advance_paid' : 'paid';

      tx.update(orderRef, {
        razorpay_payment_id: paymentId,
        payment_status: paymentStatus,
        amount_paid: paidAmount,
        amount_due: Math.max(0, Number(freshOrder.total_amount) - paidAmount),
        status: 'confirmed',
        paid_at: now,
        updated_at: now,
      });

      let productIndex = 0;
      items.forEach((item) => {
        if (!item.product_id) return;
        const productRef = productRefs[productIndex];
        const productSnap = productSnaps[productIndex];
        productIndex += 1;
        if (productSnap?.exists) {
          const currentStock = Number(productSnap.data()?.stock ?? 0);
          tx.update(productRef, {
            stock: Math.max(0, currentStock - Number(item.quantity ?? 0)),
            updated_at: now,
          });
        }
      });

      return {
        orderNumber: String(freshOrder.order_number ?? ''),
        paymentStatus,
        amountPaid: paidAmount,
      };
    });

    return NextResponse.json({
      verified: true,
      orderNumber: result.orderNumber,
      paymentStatus: result.paymentStatus,
      amountPaid: result.amountPaid,
    });
  } catch (error) {
    console.error('Razorpay checkout payment verification failed:', error);
    return NextResponse.json(
      { error: 'Payment was received, but the order update could not be completed. Please contact Fashionyapa support; do not pay again.' },
      { status: 500 }
    );
  }
}
