'use client';
import { FormEvent, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth, firebaseConfigured } from '@/lib/firebase/client';
import Link from 'next/link';
export default function AdminLoginPage() {
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setError('');setBusy(true);try{if(!firebaseConfigured)throw new Error('Firebase setup pending: fill the NEXT_PUBLIC_FIREBASE values in .env.local.');const cred=await signInWithEmailAndPassword(firebaseAuth,email,password);const token=await cred.user.getIdToken(true);const r=await fetch('/api/admin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Admin access not granted.');window.location.href='/admin';}catch(err){setError(err instanceof Error?err.message:'Could not sign in.');setBusy(false);}}
 return <main className="admin-auth-shell"><form className="admin-auth-card" onSubmit={submit}><Link href="/" className="admin-wordmark">FASHIONYAPA</Link><p className="admin-kicker">STORE MANAGEMENT</p><h1>Welcome back</h1><p className="admin-muted">Sign in with your authorised store administrator account.</p><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="admin-error" role="alert">{error}</p>}<button className="admin-primary" disabled={busy}>{busy?'Signing in…':'Sign in securely'}</button><Link className="admin-back-link" href="/">← Back to storefront</Link></form></main>
}
