
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  const raw = await request.text();
  const signature =
    request.headers.get('x-razorpay-signature') || '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook secret is not configured.' },
      { status: 503 }
    );
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(raw)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return NextResponse.json(
      { error: 'Invalid webhook signature.' },
      { status: 400 }
    );
  }

  try {
    const event = JSON.parse(raw);

    if (event.event !== 'payment.captured') {
      return NextResponse.json({ received: true });
    }

    const entity = event.payload?.payment?.entity;
    const orderId = entity?.notes?.fashionyapa_order_id;

    if (!orderId || !entity?.order_id || !entity?.id) {
      return NextResponse.json({ received: true });
    }

    const db = adminDb();
    const orderRef = db
      .collection('orders')
      .doc(String(orderId));

    await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);

      if (!orderSnap.exists) {
        return;
      }

      const order = orderSnap.data()!;

      if (
        order.razorpay_order_id !== entity.order_id ||
        ['paid', 'advance_paid'].includes(order.payment_status)
      ) {
        return;
      }

      const items = (order.items || []) as Array<{
        product_id: string;
        quantity: number;
      }>;

      const productRefs = items.map((item) =>
        db
          .collection('products')
          .doc(String(item.product_id))
      );

      // Infer the snapshot type directly from Firestore.
      const productSnaps = await Promise.all(
        productRefs.map((productRef) => tx.get(productRef))
      );

      const paidAmount = Number(entity.amount) / 100;
      const now = new Date().toISOString();

      tx.update(orderRef, {
        razorpay_payment_id: entity.id,
        payment_status:
          order.payment_method === 'cod'
            ? 'advance_paid'
            : 'paid',
        amount_paid: paidAmount,
        amount_due: Math.max(
          0,
          Number(order.total_amount) - paidAmount
        ),
        status: 'confirmed',
        paid_at: now,
        updated_at: now,
      });

      items.forEach((item, index) => {
        const productSnap = productSnaps[index];

        if (productSnap.exists) {
          tx.update(productRefs[index], {
            stock: Math.max(
              0,
              Number(productSnap.data()?.stock || 0) -
                Number(item.quantity)
            ),
            updated_at: now,
          });
        }
      });
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: 'Could not process webhook.' },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const snap = await adminDb()
      .collection('products')
      .where('is_active', '==', true)
      .get();

    const products = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        ...data,
        id: Number(data.storefront_id || doc.id),
        image: data.image_url || data.image || '',
        price: data.price ?? null,
        mrp: data.compare_at_price ?? null,
      };
    });

    return NextResponse.json(
      { products, configured: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Products API error:', error);

    return NextResponse.json(
      {
        products: [],
        configured: false,
        error: 'Check server terminal',
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
