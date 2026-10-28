'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, ShoppingBag } from 'lucide-react';
import { CART_STORAGE_KEY, products } from '@/lib/products';

type CheckoutItem = { id: number; quantity: number };
export default function CheckoutPage() {
  const [cart, setCart] = useState<number[]>([]);
  const [catalog, setCatalog] = useState(products);
  const [payment, setPayment] = useState<'prepaid' | 'cod'>('prepaid');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: 'Madhya Pradesh', pincode: '' });
  useEffect(() => { try { setCart(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]')); } catch { setCart([]); } fetch('/api/products', { cache: 'no-store' }).then(r=>r.json()).then(d=>{ if(Array.isArray(d.products)&&d.products.length) setCatalog(d.products.map((p: Record<string,unknown>)=>({id:Number(p.storefront_id??p.id),name:String(p.name||''),subtitle:String(p.subtitle||p.description||''),price:p.price==null?(products.find((fallback)=>fallback.id===Number(p.storefront_id??p.id))?.price??null):Number(p.price),tag:String(p.tag||''),image:((String(p.image_url||p.image||'').trim().startsWith('https://') || String(p.image_url||p.image||'').trim().startsWith('http://')) ? String(p.image_url||p.image).trim() : (Number(p.storefront_id??p.id) >= 1 && Number(p.storefront_id??p.id) <= 7 ? `/images/combos/combo-${Number(p.storefront_id??p.id)}/image-1.webp` : Number(p.storefront_id??p.id) === 8 ? '/images/combo-gallery/combo-8/01.jpg' : '')),description:String(p.description||'')}))); }).catch(()=>{}); }, []);
  const lines = useMemo(() => catalog.map(p => ({ ...p, quantity: cart.filter(id => id === p.id).length })).filter(p => p.quantity > 0), [cart, catalog]);
  const subtotal = lines.reduce((sum, p) => sum + (p.price || 0) * p.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 1999 ? 0 : 49;
  const total = subtotal + shipping;
  const advance = payment === 'cod' ? Math.min(150, total) : total;
  function update(key: keyof typeof form, value: string) { setForm(current => ({ ...current, [key]: value })); }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setNotice('Preparing secure checkout…');
    try {
      if (lines.some(p => p.price === null || !Number.isFinite(p.price) || p.price <= 0)) throw new Error('A product price is awaiting confirmation. Please remove it from your bag or check back later.');
      const response = await fetch('/api/checkout/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: form, paymentMethod: payment, items: lines.map(p => ({ id: p.id, quantity: p.quantity })) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not prepare checkout.');
      type RzWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } };
      if (!(window as RzWindow).Razorpay) await new Promise<void>((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = () => resolve(); script.onerror = () => reject(new Error('Could not load Razorpay checkout.')); document.body.appendChild(script); });
      const Rz = (window as RzWindow).Razorpay; if (!Rz) throw new Error('Razorpay checkout is unavailable. Please try again.');
      const checkout = new Rz({ key: data.keyId, amount: data.amount, currency: data.currency, name: 'Fashionyapa', description: payment === 'cod' ? 'COD booking advance' : 'Order payment', order_id: data.razorpayOrderId, prefill: { name: form.name, email: form.email, contact: form.phone }, notes: { order_number: data.orderNumber }, theme: { color: '#171717' }, handler: async (result: Record<string,string>) => {
        setNotice('Verifying payment securely…'); const verify = await fetch('/api/checkout/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: data.orderId, razorpay_order_id: result.razorpay_order_id, razorpay_payment_id: result.razorpay_payment_id, razorpay_signature: result.razorpay_signature }) }); const verified = await verify.json(); if (!verify.ok) { setNotice(verified.error || 'Payment verification failed. Contact support before retrying.'); return; } try {
          const confirmation = {
            orderNumber: verified.orderNumber,
            customer: form,
            paymentMethod: payment,
            items: lines.map(p => ({ id: p.id, name: p.name, image: p.image, price: p.price, quantity: p.quantity })),
            subtotal,
            shipping,
            total,
            advance,
            confirmedAt: new Date().toISOString()
          };
          sessionStorage.setItem('fashionyapa_order_confirmation', JSON.stringify(confirmation));
          localStorage.removeItem(CART_STORAGE_KEY);
        } catch {}
        window.location.href = `/order-confirmation?order=${encodeURIComponent(verified.orderNumber)}`;
      }, modal: { ondismiss: () => setNotice('Payment window closed. Your order is not confirmed until payment verification succeeds.') } }); checkout.open();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Checkout could not be started.'); }
  }
  return <main className="checkout-page">
    <style jsx>{`
      .checkout-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.8fr);gap:28px;align-items:start}
      .checkout-form{min-width:0}
      .checkout-summary{min-width:0;position:sticky;top:24px;align-self:start}
      .summary-item{display:grid;grid-template-columns:76px minmax(0,1fr);gap:14px;align-items:center}
      .summary-item img{width:76px;height:84px;object-fit:cover;border-radius:8px;background:#f3e9e3;display:block}
      .summary-item>div{min-width:0}
      .summary-item strong{display:block;overflow-wrap:anywhere;line-height:1.4}
      @media(max-width:900px){.checkout-grid{grid-template-columns:minmax(0,1fr)}.checkout-summary{position:static;grid-row:1}}
      @media(max-width:560px){.summary-item{grid-template-columns:64px minmax(0,1fr);gap:11px}.summary-item img{width:64px;height:72px}}
    `}</style>
    <header className="checkout-header"><Link href="/" className="checkout-brand"><img src="/images/fashionyapa-logo.webp" alt="Fashionyapa" /><span>FASHIONYAPA</span></Link><span><LockKeyhole size={15} /> Secure checkout setup</span></header>
    <div className="checkout-wrap"><Link href="/#products" className="checkout-back"><ArrowLeft size={15} /> Continue shopping</Link><div className="checkout-title"><p className="detail-eyebrow">ALMOST YOURS</p><h1>Checkout</h1><p>Share your delivery details and choose how you’d like to pay.</p></div>
      {!lines.length ? <div className="checkout-empty"><ShoppingBag size={35} /><h2>Your bag is empty</h2><p>Choose a Viral Combo to get started.</p><Link href="/#products" className="detail-add-button">Explore combos <ArrowRight size={16} /></Link></div> : <div className="checkout-grid">
        <form className="checkout-form" onSubmit={submit}>
          <section className="checkout-card"><h2>1. Contact & delivery</h2><div className="checkout-fields">
            <label>Full name<input required autoComplete="name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Name on the delivery" /></label>
            <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" /></label>
            <label>Mobile number<input required type="tel" pattern="[0-9]{10}" maxLength={10} autoComplete="tel" value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile number" /></label>
            <label className="field-wide">Address<input required autoComplete="street-address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="House / flat, street, landmark" /></label>
            <label>City<input required autoComplete="address-level2" value={form.city} onChange={e => update('city', e.target.value)} placeholder="City" /></label>
            <label>State<input required autoComplete="address-level1" value={form.state} onChange={e => update('state', e.target.value)} /></label>
            <label>PIN code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" value={form.pincode} onChange={e => update('pincode', e.target.value.replace(/\D/g, ''))} placeholder="6-digit PIN" /></label>
          </div></section>
          <section className="checkout-card"><h2>2. Payment method</h2><label className={`payment-option ${payment === 'prepaid' ? 'selected' : ''}`}><input type="radio" name="payment" checked={payment === 'prepaid'} onChange={() => setPayment('prepaid')} /><span><strong>Pay online</strong><small>Pay the full order amount online using Razorpay.</small></span><b>₹{total.toLocaleString('en-IN')}</b></label><label className={`payment-option ${payment === 'cod' ? 'selected' : ''}`}><input type="radio" name="payment" checked={payment === 'cod'} onChange={() => setPayment('cod')} /><span><strong>Cash on delivery</strong><small>Pay ₹150 advance online; remaining balance at delivery.</small></span><b>₹{advance.toLocaleString('en-IN')} advance</b></label><p className="payment-disclaimer">Online payment opens Razorpay securely. Your order is confirmed only after server-side verification.</p></section>
          <button className="place-order-button" type="submit">Continue to secure payment <ArrowRight size={17} /></button>
          {notice && <p className="checkout-notice" role="status">{notice}</p>}
        </form>
        <aside className="checkout-summary"><h2>Your order</h2>{lines.map(p => <div className="summary-item" key={p.id}><img src={p.image || `/images/combos/combo-${p.id}/image-1.webp`} alt={p.name} onError={e => { const img = e.currentTarget; img.onerror = null; img.src = `/images/combos/combo-${p.id}/image-1.webp`; }} /><div><strong>{p.name}</strong><small>Qty: {p.quantity}</small><span>{p.price === null ? 'Price pending' : `₹${(p.price * p.quantity).toLocaleString('en-IN')}`}</span></div></div>)}<div className="summary-totals"><p><span>Subtotal</span><b>₹{subtotal.toLocaleString('en-IN')}</b></p><p><span>Shipping</span><b>{shipping ? `₹${shipping}` : 'FREE'}</b></p><p className="summary-grand"><span>Total</span><b>₹{total.toLocaleString('en-IN')}</b></p>{payment === 'cod' && <p><span>Pay now (advance)</span><b>₹{advance.toLocaleString('en-IN')}</b></p>}</div><div className="summary-note">Delivery estimate: 7–10 days<br />Free shipping on orders of ₹1,999 and above.</div></aside>
      </div>}
    </div>
  </main>;
}
