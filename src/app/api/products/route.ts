import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const snap = await adminDb()
      .collection('products')
      .get();

    const products = snap.docs
      .map((doc) => {
        const data = doc.data();

        // Firestore boolean ko strictly check karo.
        // Agar missing hai to product hidden rahega.
        const isActive = data.is_active === true;

        if (!isActive) return null;

        const id = Number(
          data.storefront_id ?? data.id ?? doc.id
        );

        const fallbackImage =
          id >= 1 && id <= 7
            ? `/images/combos/combo-${id}/image-1.webp`
            : id === 8
              ? '/images/combo-gallery/combo-8/01.jpg'
              : '';

        const suppliedImage = String(
          data.image_url || data.image || ''
        ).trim();

        const mainImage =
          /^https?:\/\//i.test(suppliedImage)
            ? suppliedImage
            : fallbackImage || suppliedImage;

        const images =
          Array.isArray(data.images) && data.images.length
            ? data.images
            : mainImage
              ? [mainImage]
              : [];

        return {
          ...data,
          id,
          image: mainImage,
          images,
          price: data.price ?? null,
          mrp: data.compare_at_price ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        products,
        configured: true,
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
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
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}