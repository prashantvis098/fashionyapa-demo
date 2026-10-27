import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, Truck, ShieldCheck } from 'lucide-react';
import { products } from '@/lib/products';
import AddToCartButton from './product-actions';
import { adminDb } from '@/lib/firebase/admin';

export function generateStaticParams() {
  return products.map((product) => ({ id: String(product.id) }));
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  let product = products.find((item) => item.id === Number(id));
  try { const db=adminDb(); const byId=await db.collection('products').doc(String(id)).get(); const match=byId.exists?byId: (await db.collection('products').where('storefront_id','==',Number(id)).limit(1).get()).docs[0]; if(match?.exists){const d=match.data()!; if(d.is_active) product={id:Number(d.storefront_id||id),name:String(d.name),subtitle:String(d.subtitle||d.description||''),price:d.price==null?null:Number(d.price),tag:String(d.tag||'VIRAL COMBO'),image:String(d.image_url||d.image||''),description:String(d.description||'') } as typeof product; else product=undefined;} } catch {}
  if (!product) notFound();

  return (
    <main className="detail-page">
      <div className="detail-topbar"><Link href="/#products"><ArrowLeft size={16} /> Back to Viral Combos</Link><Link href="/checkout">Shopping bag <ArrowRight size={15} /></Link></div>
      <div className="detail-layout">
        <div className="detail-image-wrap"><img src={product.image} alt={product.name} /><span className="detail-tag">{product.tag}</span></div>
        <div className="detail-copy">
          <p className="detail-eyebrow">FASHIONYAPA · VIRAL COMBOS</p>
          <h1>{product.name}</h1>
          <p className="detail-subtitle">{product.subtitle}</p>
          <div className="detail-price">{product.price === null ? 'Price to be confirmed' : `₹${product.price.toLocaleString('en-IN')}`}</div>
          <p className="detail-description">{product.description}</p>
          <ul className="detail-points"><li><CheckCircle2 size={17} /> Carefully curated beauty essentials</li><li><Truck size={17} /> Estimated delivery in 7–10 days</li><li><ShieldCheck size={17} /> COD option with ₹150 advance payment</li></ul>
          <AddToCartButton productId={product.id} disabled={product.price === null} />
          {product.price === null && <p className="detail-pending">We’ll enable ordering once the selling price is confirmed.</p>}
          <div className="detail-policy"><strong>Shipping</strong><span>₹49 below ₹1,999 · Free on orders of ₹1,999 and above</span><strong>Returns</strong><span>No return or exchange, as provided by the brand. Please review the policy before ordering.</span></div>
        </div>
      </div>
    </main>
  );
}
