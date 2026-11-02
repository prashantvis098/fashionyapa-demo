import { NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import { adminAuth } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/firebase/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image first.' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image must be 8 MB or smaller.' }, { status: 400 });

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return NextResponse.json({ error: 'Firebase Storage bucket is not configured on the server.' }, { status: 503 });
    const app = adminAuth().app;
    const bucket = getStorage(app).bucket(bucketName);
    const ext = file.type.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `products/${randomUUID()}.${ext}`;
    const token = randomUUID();
    const bytes = Buffer.from(await file.arrayBuffer());
    await bucket.file(path).save(bytes, {
      resumable: false,
      metadata: { contentType: file.type, cacheControl: 'public,max-age=31536000,immutable', metadata: { firebaseStorageDownloadTokens: token } },
    });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return NextResponse.json({ url, path }, { status: 201 });
  } catch (error) {
    console.error('Product image upload failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Image upload failed.' }, { status: 500 });
  }
}