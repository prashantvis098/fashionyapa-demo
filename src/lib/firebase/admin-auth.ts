import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './admin';

export async function getAdminUser() {
  try {
    const token = (await cookies()).get('fy_admin_token')?.value;
    if (!token) return { user: null, isAdmin: false };
    const decoded = await adminAuth().verifySessionCookie(token, true);
    const allowed = (process.env.FIREBASE_ADMIN_UIDS || '').split(',').map(v => v.trim()).filter(Boolean);
    const doc = await adminDb().collection('admin_users').doc(decoded.uid).get();
    const isAdmin = allowed.includes(decoded.uid) || doc.exists;
    return { user: { uid: decoded.uid, email: decoded.email || '' }, isAdmin };
  } catch { return { user: null, isAdmin: false }; }
}
export async function requireAdmin(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.split(';').map(v => v.trim()).find(v => v.startsWith('fy_admin_token='))?.slice('fy_admin_token='.length) || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.headers.get('x-firebase-token');
    if (!token) return { ok: false as const, status: 401, error: 'Please sign in again.' };
    const decoded = await adminAuth().verifySessionCookie(token, true);
    const allowed = (process.env.FIREBASE_ADMIN_UIDS || '').split(',').map(v => v.trim()).filter(Boolean);
    const doc = await adminDb().collection('admin_users').doc(decoded.uid).get();
    if (!allowed.includes(decoded.uid) && !doc.exists) return { ok: false as const, status: 403, error: 'Admin access required.' };
    return { ok: true as const, uid: decoded.uid };
  } catch { return { ok: false as const, status: 401, error: 'Authentication expired. Please sign in again.' }; }
}
