import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebase/admin';
import { products as localProducts } from '@/lib/products';

type CheckoutCustomer = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

type CheckoutLine = { id?: string | number; quantity?: number };

const toPaise = (rupees: number) => Math.round(rupees * 100);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let orderRef: FirebaseFirestore.DocumentReference | undefined;

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Online payments are not configured yet. Check the Razorpay environment variables.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const customer = body?.customer as CheckoutCustomer | undefined;
    const items = body?.items as CheckoutLine[] | undefined;

    if (!customer || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer and cart details are required.' },
        { status: 400 }
      );
    }

    const name = String(customer.name ?? '').trim();
    const email = String(customer.email ?? '').trim();
    const phone = String(customer.phone ?? '').trim();
    const address = String(customer.address ?? '').trim();
    const city = String(customer.city ?? '').trim();
    const state = String(customer.state ?? '').trim();
    const pincode = String(customer.pincode ?? '').trim();

    if (
      !name ||
      !/^\d{10}$/.test(phone) ||
      !/^\d{6}$/.test(pincode) ||
      !address ||
      !city ||
      !state ||
      !emailPattern.test(email)
    ) {
      return NextResponse.json(
        { error: 'Please enter valid delivery and contact details.' },
        { status: 400 }
      );
    }

    const db = adminDb();
    let subtotal = 0;
    const verifiedItems: Array<{
      product_id: string;
      storefront_id: number;
      name: string;
      unit_price: number;
      quantity: number;
      image_url: string;
    }> = [];

    for (const line of items) {
      const id = String(line?.id ?? '').trim();
      const quantity = Number(line?.quantity);

      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return NextResponse.json({ error: 'Invalid cart item.' }, { status: 400 });
      }

      let productDoc = await db.collection('products').doc(id).get();

      if (!productDoc.exists) {
        const match = await db
          .collection('products')
          .where('storefront_id', '==', Number(id))
          .limit(1)
          .get();

        if (!match.empty) productDoc = match.docs[0] as typeof productDoc;
      }

      if (!productDoc.exists) {
        return NextResponse.json(
          { error: 'A product in your cart is no longer available. Please refresh your cart.' },
          { status: 400 }
        );
      }

      const product = productDoc.data();
      if (!product || !product.is_active) {
        return NextResponse.json(
          { error: `${product?.name ?? 'This product'} is unavailable.` },
          { status: 400 }
        );
      }

      // Use the same canonical local catalogue as the storefront if Firestore
      // has a missing/invalid price. Never trust a price sent by the browser.
      const storefrontId = Number(product.storefront_id ?? id);
      const rawDbPrice = product.price;
      const parsedDbPrice =
        rawDbPrice == null || rawDbPrice === '' ? null : Number(rawDbPrice);
      const localProduct = localProducts.find((item) => item.id === storefrontId);
      const unitPrice =
        parsedDbPrice !== null && Number.isFinite(parsedDbPrice) && parsedDbPrice > 0
          ? parsedDbPrice
          : (localProduct?.price ?? null);

      if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice <= 0) {
        return NextResponse.json(
          { error: `${product.name ?? 'This product'} is not priced yet.` },
          { status: 400 }
        );
      }

      // Enforce stock only when a stock value is explicitly configured.
      if (product.stock != null && Number(product.stock) < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${String(product.name ?? 'this product')}.` },
          { status: 400 }
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return NextResponse.json(
          { error: `Invalid price for ${String(product.name ?? 'this product')}.` },
          { status: 400 }
        );
      }

      subtotal += unitPrice * quantity;
      verifiedItems.push({
        product_id: productDoc.id,
        storefront_id: storefrontId,
        name: String(product.name ?? 'Fashionyapa product'),
        unit_price: unitPrice,
        quantity,
        image_url: String(product.image_url ?? product.image ?? ''),
      });
    }

    const shipping = subtotal >= 1999 ? 0 : 49;
    const total = subtotal + shipping;
    const method = body.paymentMethod === 'cod' ? 'cod' : 'prepaid';
    const amountDueNow = method === 'cod' ? Math.min(150, total) : total;

    if (amountDueNow <= 0) {
      return NextResponse.json({ error: 'The order total must be greater than zero.' }, { status: 400 });
    }

    const orderNumber = `FY-${Date.now().toString().slice(-8)}`;
    orderRef = db.collection('orders').doc();
    const now = new Date().toISOString();

    await orderRef.set({
      order_number: orderNumber,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      address: { address, city, state, pincode },
      items: verifiedItems,
      subtotal_amount: subtotal,
      shipping_amount: shipping,
      total_amount: total,
      amount_paid: 0,
      amount_due: total,
      amount_due_now: amountDueNow,
      payment_method: method,
      payment_status: 'payment_pending',
      status: 'payment_pending',
      created_at: now,
      updated_at: now,
    });

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const razorpayOrder = await razorpay.orders.create({
      amount: toPaise(amountDueNow),
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        fashionyapa_order_id: orderRef.id,
        order_number: orderNumber,
        payment_method: method,
      },
    });

    await orderRef.update({
      razorpay_order_id: razorpayOrder.id,
      amount_due_now: amountDueNow,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      orderId: orderRef.id,
      orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId,
      amountDueNow,
      total,
      method,
    });
  } catch (error: unknown) {
    console.error('Checkout create-order failed:', error);

    // Mark the Firestore record as failed if it was created before Razorpay failed.
    if (orderRef) {
      try {
        await orderRef.update({
          status: 'checkout_creation_failed',
          payment_status: 'checkout_creation_failed',
          updated_at: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error('Could not mark failed checkout order:', updateError);
      }
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Unexpected error while creating the checkout order. Check the server terminal logs.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
