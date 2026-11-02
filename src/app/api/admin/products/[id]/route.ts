import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { requireAdmin } from '@/lib/firebase/admin-auth';

type Context = { params: { id: string } };

export async function PATCH(request: Request, { params }: Context) {
  const access = await requireAdmin(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid product data.' }, { status: 400 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ['name', 'description', 'category', 'is_active', 'slug', 'tag', 'subtitle']) if (key in body) update[key] = body[key];
  if ('images' in body) {
    if (!Array.isArray(body.images) || !body.images.every((value: unknown) => typeof value === 'string')) return NextResponse.json({ error: 'Invalid product images.' }, { status: 400 });
    update.images = body.images; update.image_url = body.images[0] || ''; update.image = body.images[0] || '';
  }
  if ('image_url' in body && !('images' in body)) { update.image_url = String(body.image_url || ''); update.image = String(body.image_url || ''); }
  if ('price' in body) update.price = body.price === '' || body.price == null ? null : Number(body.price);
  if ('compare_at_price' in body) update.compare_at_price = body.compare_at_price === '' || body.compare_at_price == null ? null : Number(body.compare_at_price);
  if ('stock' in body) { const stock = Number(body.stock); if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: 'Stock must be a non-negative whole number.' }, { status: 400 }); update.stock = stock; }
  try {
    const ref = adminDb().collection('products').doc(params.id);
    await ref.update(update);
    const snap = await ref.get();
    return NextResponse.json({ product: { id: snap.id, ...snap.data() } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update product.' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const access = await requireAdmin(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const ref = adminDb().collection('products').doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const data = snap.data() || {};
    const urls = Array.isArray(data.images) ? data.images : [data.image_url || data.image].filter(Boolean);
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (bucketName) {
      const bucket = getStorage(adminAuth().app).bucket(bucketName);
      await Promise.all(urls.map(async (url: unknown) => {
        if (typeof url !== 'string') return;
        try {
          const parsed = new URL(url);
          const match = parsed.pathname.match(/\/o\/(.+)$/);
          if (parsed.hostname === 'firebasestorage.googleapis.com' && match) {
            const path = decodeURIComponent(match[1]);
            if (path.startsWith('products/')) await bucket.file(path).delete({ ignoreNotFound: true });
          }
        } catch { /* keep deletion resilient for legacy/local image paths */ }
      }));
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete product.' }, { status: 400 });
  }
}