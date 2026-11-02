import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/firebase/admin-auth';

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const snap = await adminDb().collection('products').orderBy('updated_at', 'desc').limit(500).get();
    return NextResponse.json({ products: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load products.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || !body.name.trim()) return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
  const price = body.price === '' || body.price == null ? null : Number(body.price);
  const stock = Number(body.stock ?? 0);
  const compareAt = body.compare_at_price === '' || body.compare_at_price == null ? null : Number(body.compare_at_price);
  const images = Array.isArray(body.images) ? body.images.filter((value: unknown) => typeof value === 'string' && value.startsWith('https://')) : [];
  if (!images.length) return NextResponse.json({ error: 'Upload at least one product image.' }, { status: 400 });
  if (price !== null && (!Number.isFinite(price) || price < 0)) return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 });
  if (compareAt !== null && (!Number.isFinite(compareAt) || compareAt < 0)) return NextResponse.json({ error: 'Enter a valid compare-at price.' }, { status: 400 });
  if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: 'Stock must be a non-negative whole number.' }, { status: 400 });
  try {
    const now = new Date().toISOString();
    const collection = adminDb().collection('products');
    const existing = await collection.get();
    const nextId = existing.docs.reduce((max, doc) => Math.max(max, Number(doc.data().storefront_id || 0)), 0) + 1;
    const product = {
      storefront_id: nextId, name: body.name.trim(),
      slug: String(body.slug || body.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: String(body.description || ''), images, image_url: images[0], image: images[0],
      price, compare_at_price: compareAt, stock, is_active: Boolean(body.is_active),
      category: String(body.category || 'Viral Combos'), tag: String(body.tag || 'NEW ARRIVAL'),
      subtitle: String(body.subtitle || ''), created_at: now, updated_at: now,
    };
    const ref = await collection.add(product);
    return NextResponse.json({ product: { id: ref.id, ...product } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create product.' }, { status: 500 });
  }
}