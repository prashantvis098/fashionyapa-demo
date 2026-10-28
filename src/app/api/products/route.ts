
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { products as localProducts } from '@/lib/products';

export async function GET() {
  try {
    const snap = await adminDb()
      .collection('products')
      .where('is_active', '==', true)
      .get();

    const products = snap.docs.map((doc) => {
      const data = doc.data();
      const id = Number(data.storefront_id ?? data.id ?? doc.id);
      const fallbackImage =
        id >= 1 && id <= 7
          ? `/images/combos/combo-${id}/image-1.webp`
          : id === 8
            ? '/images/combo-gallery/combo-8/01.jpg'
            : '';
      const suppliedImage = String(data.image_url || data.image || '').trim();
      const localProduct = localProducts.find((item) => item.id === id);
      const rawPrice = data.price;
      const parsedPrice = rawPrice == null || rawPrice === '' ? null : Number(rawPrice);
      const price = parsedPrice !== null && Number.isFinite(parsedPrice) && parsedPrice > 0
        ? parsedPrice
        : (localProduct?.price ?? null);

      return {
        ...data,
        id,
        // Keep valid hosted image URLs; replace old local .jpg paths with the shipped WebP assets.
        image: /^https?:\/\//i.test(suppliedImage)
          ? suppliedImage
          : fallbackImage || suppliedImage,
        price,
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
      { products: [], configured: false, error: 'Check server terminal' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
