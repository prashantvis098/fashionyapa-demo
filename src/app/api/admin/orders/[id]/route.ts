import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/firebase/admin-auth';
const statuses=['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
export async function PATCH(request:Request,{params}:{params:{id:string}}){const a=await requireAdmin(request);if(!a.ok)return NextResponse.json({error:a.error},{status:a.status});const b=await request.json().catch(()=>null);if(!statuses.includes(b?.status))return NextResponse.json({error:'Invalid order status.'},{status:400});try{const ref=adminDb().collection('orders').doc(params.id);await ref.update({status:b.status,updated_at:new Date().toISOString()});const snap=await ref.get();return NextResponse.json({order:{id:snap.id,...snap.data()}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not update order.'},{status:400});}}
