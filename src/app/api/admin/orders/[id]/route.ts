import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/firebase/admin-auth';
const statuses=['pending','confirmed','processing','shipped','delivered','cancelled','refunded','payment_pending','checkout_creation_failed'];
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 const a=await requireAdmin(request);if(!a.ok)return NextResponse.json({error:a.error},{status:a.status});
 const b=await request.json().catch(()=>null);if(!b||(!statuses.includes(b.status)&&b.tracking===undefined))return NextResponse.json({error:'Invalid order update.'},{status:400});
 try{const ref=adminDb().collection('orders').doc(params.id);const update:Record<string,unknown>={updated_at:new Date().toISOString()};
  if(b.status!==undefined){if(!statuses.includes(b.status))return NextResponse.json({error:'Invalid order status.'},{status:400});update.status=b.status;}
  if(b.tracking!==undefined){const courier=String(b.tracking?.courier??'').trim().slice(0,80);const awb=String(b.tracking?.awb??'').trim().slice(0,100);const url=String(b.tracking?.url??'').trim().slice(0,500);if(url&&!/^https:\/\//i.test(url))return NextResponse.json({error:'Tracking URL must start with https://.'},{status:400});update.tracking={courier,awb,url,updated_at:new Date().toISOString()};}
  await ref.update(update);const snap=await ref.get();return NextResponse.json({order:{id:snap.id,...snap.data()}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not update order.'},{status:400});}
}
