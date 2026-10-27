
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Truck,
  ShieldCheck,
} from 'lucide-react';

import { products } from '@/lib/products';
import AddToCartButton from './product-actions';
import ProductGallery from './product-gallery';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  let product = products.find((item) => item.id === Number(id));

  try {
    const db = adminDb();

    const byId = await db.collection('products').doc(String(id)).get();

    const queryMatch = byId.exists
      ? undefined
      : (
          await db
            .collection('products')
            .where('storefront_id', '==', Number(id))
            .limit(1)
            .get()
        ).docs[0];

    const match = byId.exists ? byId : queryMatch;

    if (match?.exists) {
      const data = match.data();

      if (data?.is_active) {
        product = {
          id: Number(data.storefront_id || id),
          name: String(data.name),
          subtitle: String(data.subtitle || data.description || ''),
          price: data.price == null ? null : Number(data.price),
          tag: String(data.tag || 'VIRAL COMBO'),
          image: String(data.image_url || data.image || ''),
          description: String(data.description || ''),
        } as typeof product;
      } else {
        product = undefined;
      }
    }
  } catch (error) {
    console.error('Could not load product from Firestore:', error);
  }

  if (!product) {
    notFound();
  }

  // Combo 1–7 use image-1.webp ... image-6.webp.
  // Combo 8 uses a different set of filenames.
  const galleryImages =
    Number(id) === 8
      ? [
          '/images/combos/combo-8/combo-1.webp',
          '/images/combos/combo-8/combo-2.webp',
          '/images/combos/combo-8/image-3.webp',
          '/images/combos/combo-8/combo-4.webp',
          '/images/combos/combo-8/combo-5.webp',
          '/images/combos/combo-8/combo-6.webp',
        ]
      : Array.from(
          { length: 6 },
          (_, index) =>
            `/images/combos/combo-${id}/image-${index + 1}.webp`
        );

  return (
    <main className="detail-page">
      <div className="detail-topbar">
        <Link href="/#products">
          <ArrowLeft size={16} />
          Back to Viral Combos
        </Link>

        <Link href="/checkout">
          Shopping bag
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="detail-layout">
        <ProductGallery
          images={galleryImages}
          name={product.name}
        />

        <div className="detail-copy">
          <p className="detail-eyebrow">
            FASHIONYAPA · VIRAL COMBOS
          </p>

          <h1>{product.name}</h1>

          <p className="detail-subtitle">
            {product.subtitle}
          </p>

          <div className="detail-price">
            {product.price === null
              ? 'Price to be confirmed'
              : `₹${product.price.toLocaleString('en-IN')}`}
          </div>

          <p className="detail-description">
            {product.description}
          </p>

          <ul className="detail-points">
            <li>
              <CheckCircle2 size={17} />
              Carefully curated beauty essentials
            </li>

            <li>
              <Truck size={17} />
              Estimated delivery in 7–10 days
            </li>

            <li>
              <ShieldCheck size={17} />
              COD option with ₹150 advance payment
            </li>
          </ul>

          <AddToCartButton
            productId={product.id}
            disabled={product.price === null}
          />

          {product.price === null && (
            <p className="detail-pending">
              We’ll enable ordering once the selling price is confirmed.
            </p>
          )}

          <div className="detail-policy">
            <strong>Shipping</strong>
            <span>
              ₹49 below ₹1,999 · Free on orders of ₹1,999 and above
            </span>

            <strong>Returns</strong>
            <span>
              No return or exchange, as provided by the brand.
              Please review the policy before ordering.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
