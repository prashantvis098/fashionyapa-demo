import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/firebase/admin-auth';
export async function GET(request:Request){const a=await requireAdmin(request);if(!a.ok)return NextResponse.json({error:a.error},{status:a.status});try{const snap=await adminDb().collection('orders').orderBy('created_at','desc').limit(200).get();return NextResponse.json({orders:snap.docs.map(d=>({id:d.id,...d.data()}))});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load orders.'},{status:500});}}
