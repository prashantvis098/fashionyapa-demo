import { NextResponse } from 'next/server';
export async function POST(request:Request){const response=NextResponse.redirect(new URL('/admin/login',request.url),{status:303});response.cookies.set('fy_admin_token','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});return response;}
