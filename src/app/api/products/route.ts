
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const snap = await adminDb()
      .collection('products')
      .where('is_active', '==', true)
      .get();

    const products = snap.docs.map((doc) => ({
      id: Number(doc.data().storefront_id || doc.id),
      ...doc.data(),
      image: doc.data().image_url || doc.data().image || '',
      price: doc.data().price ?? null,
      mrp: doc.data().compare_at_price ?? null,
    }));

    return NextResponse.json(
      { products, configured: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Products API error:', error);

    return NextResponse.json(
      { products: [], configured: false, error: 'Check server terminal' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
