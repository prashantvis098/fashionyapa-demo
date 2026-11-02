import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// Guest order lookup: both order number and checkout phone are required.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderNumber = String(body?.orderNumber ?? '').trim().toUpperCase();
    const phone = String(body?.phone ?? '').replace(/\D/g, '').slice(-10);
    if (!/^FY-[A-Z0-9-]{5,24}$/.test(orderNumber) || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Enter a valid order number and 10-digit phone number.' }, { status: 400 });
    }
    const snap = await adminDb().collection('orders').where('order_number', '==', orderNumber).limit(1).get();
    if (snap.empty) return NextResponse.json({ error: 'Order not found. Check your details and try again.' }, { status: 404 });
    const doc = snap.docs[0];
    const order = doc.data();
    if (String(order.customer_phone ?? '').replace(/\D/g, '').slice(-10) !== phone) {
      return NextResponse.json({ error: 'Order not found. Check your details and try again.' }, { status: 404 });
    }
    return NextResponse.json({ order: {
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      total: Number(order.total_amount ?? 0),
      amountPaid: Number(order.amount_paid ?? 0),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      tracking: order.tracking ?? null,
      items: Array.isArray(order.items) ? order.items.map((item: any) => ({ name: item.name, quantity: item.quantity, image: item.image_url })) : [],
      deliveryCity: order.address?.city ?? '',
      deliveryState: order.address?.state ?? '',
    }});
  } catch (error) {
    console.error('Order lookup failed:', error);
    return NextResponse.json({ error: 'Unable to retrieve this order right now.' }, { status: 500 });
  }
}
