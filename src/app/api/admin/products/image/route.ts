import { NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { adminAuth } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/firebase/admin-auth';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const { url } = await request.json();
    if (typeof url !== 'string' || !url) return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
    const parsed = new URL(url);
    if (parsed.hostname !== 'firebasestorage.googleapis.com') return NextResponse.json({ ok: true });
    const match = parsed.pathname.match(/\/o\/(.+)$/);
    if (!match) return NextResponse.json({ ok: true });
    const path = decodeURIComponent(match[1]);
    if (!path.startsWith('products/')) return NextResponse.json({ error: 'Only product uploads can be deleted here.' }, { status: 400 });
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return NextResponse.json({ error: 'Storage bucket is not configured.' }, { status: 503 });
    await getStorage(adminAuth().app).bucket(bucketName).file(path).delete({ ignoreNotFound: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Product image delete failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete image.' }, { status: 500 });
  }
}