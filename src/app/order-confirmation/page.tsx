'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, PackageCheck, ArrowRight, MessageCircle, ShieldCheck, Truck } from 'lucide-react';

type ConfirmationItem = {
  id: number;
  name: string;
  image: string;
  price: number | null;
  quantity: number;
};

type ConfirmationData = {
  orderNumber: string;
  customer: { name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string };
  paymentMethod: 'prepaid' | 'cod';
  items: ConfirmationItem[];
  subtotal: number;
  shipping: number;
  total: number;
  advance: number;
  confirmedAt?: string;
};

const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<ConfirmationData | null>(null);
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedOrder = params.get('order') || '';
    setOrderNumber(requestedOrder);

    try {
      const raw = sessionStorage.getItem('fashionyapa_order_confirmation');
      if (!raw) return;
      const parsed = JSON.parse(raw) as ConfirmationData;
      if (requestedOrder && parsed.orderNumber === requestedOrder) setOrder(parsed);
    } catch {
      // Keep the page useful even if this browser session has no saved summary.
    }
  }, []);

  const isCod = order?.paymentMethod === 'cod';

  return (
    <main className="fy-confirm-page">
      <header className="fy-confirm-header">
        <Link href="/" className="fy-confirm-brand" aria-label="Fashionyapa home">
          <img src="/images/fashionyapa-logo.png" alt="" />
          <span>FASHIONYAPA</span>
        </Link>
        <span className="fy-confirm-secure"><ShieldCheck size={15} /> Secure checkout</span>
      </header>

      <div className="fy-confirm-wrap">
        <section className="fy-confirm-hero">
          <div className="fy-confirm-check"><Check size={34} strokeWidth={2.5} /></div>
          <p className="fy-confirm-eyebrow">THANK YOU FOR SHOPPING WITH US</p>
          <h1>Your order is confirmed!</h1>
          <p className="fy-confirm-lead">
            Your Viral Combos are one step closer to you. We’ve successfully verified your payment and confirmed your order.
          </p>
          {orderNumber ? (
            <div className="fy-confirm-order-number">
              <span>ORDER NUMBER</span>
              <strong>{orderNumber}</strong>
            </div>
          ) : (
            <p className="fy-confirm-warning">We couldn’t find an order reference in this link. Please check your order confirmation message or contact support before placing another order.</p>
          )}
        </section>

        {order && (
          <div className="fy-confirm-grid">
            <section className="fy-confirm-card">
              <div className="fy-confirm-card-title"><PackageCheck size={20} /><h2>Order summary</h2></div>
              <div className="fy-confirm-items">
                {order.items.map((item, index) => (
                  <div className="fy-confirm-item" key={`${item.id}-${index}`}>
                    <img src={item.image || '/images/fashionyapa-logo.png'} alt={item.name} />
                    <div className="fy-confirm-item-info">
                      <strong>{item.name}</strong>
                      <span>Quantity: {item.quantity}</span>
                    </div>
                    <b>{item.price == null ? 'Price pending' : money(item.price * item.quantity)}</b>
                  </div>
                ))}
              </div>
              <div className="fy-confirm-totals">
                <p><span>Subtotal</span><b>{money(order.subtotal)}</b></p>
                <p><span>Shipping</span><b>{order.shipping ? money(order.shipping) : 'FREE'}</b></p>
                <p className="fy-confirm-total"><span>Order total</span><b>{money(order.total)}</b></p>
                <p><span>{isCod ? 'Paid online (COD advance)' : 'Paid online'}</span><b>{money(order.advance)}</b></p>
                {isCod && <p><span>Due at delivery</span><b>{money(Math.max(0, order.total - order.advance))}</b></p>}
              </div>
              <div className="fy-confirm-payment"><Check size={16} /> {isCod ? 'COD advance payment verified' : 'Online payment verified'}</div>
            </section>

            <aside className="fy-confirm-side">
              <section className="fy-confirm-card">
                <div className="fy-confirm-card-title"><Truck size={20} /><h2>Delivery details</h2></div>
                <p className="fy-confirm-customer">{order.customer.name}</p>
                <p>{order.customer.address}</p>
                <p>{order.customer.city}, {order.customer.state} — {order.customer.pincode}</p>
                <p>{order.customer.phone}</p>
                <p>{order.customer.email}</p>
                <div className="fy-confirm-delivery-note"><Truck size={18} /><span><strong>Estimated delivery</strong><br />7–10 days</span></div>
              </section>
              <section className="fy-confirm-card fy-confirm-next">
                <h2>What happens next?</h2>
                <p>We’ll prepare your order and keep you updated as it moves towards delivery.</p>
                <p className="fy-confirm-policy">Please note: Fashionyapa currently follows a no-return, no-exchange policy.</p>
              </section>
            </aside>
          </div>
        )}

        {!order && orderNumber && (
          <section className="fy-confirm-card fy-confirm-fallback">
            <h2>Keep your order number handy</h2>
            <p>Your payment was verified by checkout. This page was opened without the temporary order summary for this browser session, so item and address details aren’t available here.</p>
            <p>If you need help, contact Fashionyapa support and share your order number.</p>
          </section>
        )}

        <div className="fy-confirm-actions">
          <Link href="/#products" className="fy-confirm-primary">Continue shopping <ArrowRight size={17} /></Link>
          <a href="https://wa.me/919630777096" target="_blank" rel="noreferrer" className="fy-confirm-secondary"><MessageCircle size={17} /> WhatsApp support</a>
        </div>
        <p className="fy-confirm-footer">Made for your everyday style · FASHIONYAPA</p>
      </div>

      <style jsx>{`
        .fy-confirm-page{min-height:100vh;background:#f7f3ec;color:#28231e;font-family:Arial,Helvetica,sans-serif;padding-bottom:52px}
        .fy-confirm-header{height:76px;padding:0 clamp(20px,6vw,88px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e7dfd3;background:#fbf9f5}
        .fy-confirm-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#28231e;font-size:14px;letter-spacing:2.4px;font-weight:700}
        .fy-confirm-brand img{width:35px;height:35px;object-fit:contain}
        .fy-confirm-secure{display:flex;align-items:center;gap:7px;color:#74695c;font-size:12px}
        .fy-confirm-wrap{max-width:1050px;margin:0 auto;padding:48px 22px 0}
        .fy-confirm-hero{text-align:center;max-width:650px;margin:0 auto 34px}
        .fy-confirm-check{width:70px;height:70px;border-radius:50%;margin:0 auto 21px;background:#e5eadc;color:#4d6541;display:grid;place-items:center}
        .fy-confirm-eyebrow{font-size:10px;letter-spacing:2.6px;font-weight:700;color:#8b7965;margin:0 0 12px}
        .fy-confirm-hero h1{font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:clamp(34px,5vw,49px);line-height:1.12;margin:0 0 14px;letter-spacing:-1px}
        .fy-confirm-lead{font-size:14px;line-height:1.8;color:#756b60;margin:0 auto;max-width:540px}
        .fy-confirm-order-number{display:inline-flex;flex-direction:column;gap:7px;margin-top:24px;padding:14px 25px;background:#fffdf9;border:1px solid #e6ddd0;border-radius:10px;min-width:210px}
        .fy-confirm-order-number span{font-size:9px;letter-spacing:2px;color:#8a7c6c;font-weight:700}
        .fy-confirm-order-number strong{font-size:17px;letter-spacing:.6px;overflow-wrap:anywhere}
        .fy-confirm-grid{display:grid;grid-template-columns:1.25fr .85fr;gap:18px;align-items:start}
        .fy-confirm-side{display:grid;gap:18px}
        .fy-confirm-card{background:#fffdf9;border:1px solid #e9e1d6;border-radius:13px;padding:23px}
        .fy-confirm-card-title{display:flex;align-items:center;gap:10px;margin-bottom:20px;color:#76644f}
        .fy-confirm-card-title h2,.fy-confirm-next h2,.fy-confirm-fallback h2{font-family:Georgia,'Times New Roman',serif;font-weight:400;color:#302820;font-size:22px;margin:0}
        .fy-confirm-items{display:grid;gap:16px}
        .fy-confirm-item{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:12px;align-items:center}
        .fy-confirm-item img{width:60px;height:68px;object-fit:cover;border-radius:7px;background:#f2ede5}
        .fy-confirm-item-info{display:grid;gap:6px;min-width:0}
        .fy-confirm-item-info strong{font-size:13px;line-height:1.4}
        .fy-confirm-item-info span{font-size:11px;color:#8b8074}
        .fy-confirm-item>b{font-size:12px;white-space:nowrap}
        .fy-confirm-totals{border-top:1px solid #ece4da;margin-top:20px;padding-top:12px}
        .fy-confirm-totals p{display:flex;justify-content:space-between;gap:14px;font-size:12px;color:#766d63;margin:11px 0}
        .fy-confirm-totals b{color:#302820;font-weight:600;text-align:right}
        .fy-confirm-totals .fy-confirm-total{font-size:15px;color:#302820;border-top:1px solid #ece4da;padding-top:14px;margin-top:14px}
        .fy-confirm-payment{display:flex;align-items:center;gap:8px;padding:11px 12px;background:#eef2e9;color:#506346;border-radius:7px;font-size:11px;font-weight:700;margin-top:18px}
        .fy-confirm-customer{font-weight:700;color:#302820!important}
        .fy-confirm-card>p{font-size:12px;line-height:1.7;color:#766d63;margin:7px 0;overflow-wrap:anywhere}
        .fy-confirm-delivery-note{display:flex;gap:10px;align-items:center;background:#f5f0e7;border-radius:8px;padding:13px;margin-top:19px;color:#806b52;font-size:12px;line-height:1.7}
        .fy-confirm-delivery-note strong{color:#302820}
        .fy-confirm-next h2{margin-bottom:12px}
        .fy-confirm-next .fy-confirm-policy{border-top:1px solid #ece4da;padding-top:12px;margin-top:14px;font-size:11px}
        .fy-confirm-fallback{max-width:650px;margin:0 auto}
        .fy-confirm-fallback h2{margin-bottom:12px}
        .fy-confirm-fallback p{font-size:13px;line-height:1.8;color:#766d63}
        .fy-confirm-warning{font-size:13px;line-height:1.7;color:#8b5e3c;background:#fff8ee;border:1px solid #ead9c3;padding:12px 16px;border-radius:8px;margin-top:20px}
        .fy-confirm-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:28px}
        .fy-confirm-primary,.fy-confirm-secondary{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:47px;padding:0 19px;border-radius:7px;text-decoration:none;font-size:12px;font-weight:700;transition:transform .2s,background .2s}
        .fy-confirm-primary{background:#302820;color:#fff}
        .fy-confirm-primary:hover{background:#514335;transform:translateY(-1px)}
        .fy-confirm-secondary{border:1px solid #d9cebf;color:#514335;background:#fffdf9}
        .fy-confirm-secondary:hover{background:#f0e8dc}
        .fy-confirm-footer{text-align:center;font-size:10px;letter-spacing:1px;color:#a09384;margin-top:34px}
        @media(max-width:720px){.fy-confirm-header{height:65px;padding:0 17px}.fy-confirm-brand{font-size:11px;letter-spacing:1.5px;gap:7px}.fy-confirm-brand img{width:29px;height:29px}.fy-confirm-wrap{padding:35px 15px 0}.fy-confirm-grid{grid-template-columns:1fr}.fy-confirm-card{padding:19px}.fy-confirm-hero{margin-bottom:25px}.fy-confirm-lead{font-size:13px}.fy-confirm-item{grid-template-columns:53px minmax(0,1fr) auto;gap:10px}.fy-confirm-item img{width:53px;height:61px}.fy-confirm-actions{display:grid}.fy-confirm-primary,.fy-confirm-secondary{width:100%;box-sizing:border-box}}
      `}</style>
    </main>
  );
}
