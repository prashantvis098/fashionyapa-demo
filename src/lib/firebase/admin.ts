import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  let serviceAccount: Record<string, unknown>;
  try { serviceAccount = JSON.parse(raw); } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON.'); }
  return initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
}
export function adminAuth() { return getAuth(getAdminApp()); }
export function adminDb() { return getFirestore(getAdminApp()); }
