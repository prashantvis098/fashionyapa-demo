"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { firebaseAuth } from '@/lib/firebase/client';

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await firebaseAuth.currentUser?.getIdToken();

  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;

  address?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };

  total_amount: number;
  amount_paid: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
  razorpay_payment_id?: string;

  tracking?: {
    courier?: string;
    awb?: string;
    url?: string;
  };
};

const statuses = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'payment_pending',
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [paymentIds, setPaymentIds] = useState<Record<string, string>>({});

  async function load() {
    const response = await apiFetch('/api/admin/orders');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load orders.');
    }

    setOrders(data.orders || []);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function update(id: string, payload: Record<string, unknown>) {
    setSaving(id);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not update order.');
      }

      setOrders((old) =>
        old.map((order) =>
          order.id === id ? { ...order, ...data.order } : order
        )
      );

      setMessage('Order updated successfully.');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not update order.'
      );
    } finally {
      setSaving(null);
    }
  }

  async function reconcilePayment(order: Order) {
    const paymentId = String(paymentIds[order.id] ?? '').trim();

    if (!paymentId) {
      setError('Enter the Razorpay Payment ID first.');
      return;
    }

    setSaving(order.id);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch(
        `/api/admin/orders/${order.id}/reconcile-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not verify Razorpay payment.'
        );
      }

      await load();

      setPaymentIds((old) => ({
        ...old,
        [order.id]: paymentId,
      }));

      setMessage(
        data.alreadyReconciled
          ? `${data.orderNumber}: payment was already reconciled.`
          : `${data.orderNumber}: Razorpay payment verified and order updated.`
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not verify Razorpay payment.'
      );
    } finally {
      setSaving(null);
    }
  }

  function copyAddress(order: Order) {
    if (!order.address) return;

    const fullAddress = [
      order.address.address,
      order.address.city,
      order.address.state,
      order.address.pincode,
    ]
      .filter(Boolean)
      .join(', ');

    navigator.clipboard
      .writeText(fullAddress)
      .then(() => {
        setMessage(`Address copied for ${order.order_number}`);
      })
      .catch(() => {
        setError('Could not copy address.');
      });
  }

  return (
    <main className="admin-main">
      <div className="admin-topline">
        <div>
          <p className="admin-kicker">FULFILMENT</p>

          <h1>Orders</h1>

          <p className="admin-muted">
            Manage order status, payment verification and courier tracking.
          </p>
        </div>

        <Link className="admin-secondary" href="/admin">
          ← Dashboard
        </Link>
      </div>

      <div className="admin-panel" style={{ marginTop: 24 }}>
        <div className="admin-topline">
          <h2>Recent orders ({orders.length})</h2>

          <button
            className="admin-secondary"
            onClick={() =>
              load().catch((e) => setError(e.message))
            }
          >
            Refresh
          </button>
        </div>

        {error && <p className="admin-error">{error}</p>}

        {message && <p className="admin-success">{message}</p>}

        {loading ? (
          <p className="admin-muted">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="admin-empty">No orders found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order / Customer</th>

                  <th>Delivery Address</th>

                  <th>Placed</th>

                  <th>Total / Paid</th>

                  <th>Payment</th>

                  <th>Order status</th>

                  <th>Verify payment</th>

                  <th>Courier tracking</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b>{order.order_number}</b>
                      <br />

                      {order.customer_name}
                      <br />

                      <small>{order.customer_phone}</small>
                      <br />

                      <small>{order.customer_email}</small>
                    </td>

                    <td>
                      {order.address ? (
                        <div className="delivery-address">
                          <b>
                            {order.address.address || '—'}
                          </b>

                          <br />

                          <small>
                            {order.address.city || '—'},
                            {' '}
                            {order.address.state || '—'}
                          </small>

                          <br />

                          <small>
                            PIN: {order.address.pincode || '—'}
                          </small>

                          <br />

                          <button
                            type="button"
                            className="copy-address"
                            onClick={() => copyAddress(order)}
                          >
                            Copy Address
                          </button>
                        </div>
                      ) : (
                        <small>Address not available</small>
                      )}
                    </td>

                    <td>
                      {order.created_at
                        ? new Date(
                            order.created_at
                          ).toLocaleDateString('en-IN')
                        : '—'}
                    </td>

                    <td>
                      ₹
                      {Number(
                        order.total_amount || 0
                      ).toLocaleString('en-IN')}

                      <br />

                      <small>
                        Paid ₹
                        {Number(
                          order.amount_paid || 0
                        ).toLocaleString('en-IN')}
                      </small>
                    </td>

                    <td>
                      {order.payment_method} /{' '}
                      {order.payment_status}
                    </td>

                    <td>
                      <select
                        aria-label={`Status for ${order.order_number}`}
                        value={order.status}
                        disabled={saving === order.id}
                        onChange={(e) =>
                          update(order.id, {
                            status: e.target.value,
                          })
                        }
                      >
                        {statuses.map((status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status.replaceAll('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      {order.payment_status === 'paid' ||
                      order.payment_status === 'advance_paid' ? (
                        <small>
                          Verified
                          <br />
                          {order.razorpay_payment_id ||
                            'Razorpay'}
                        </small>
                      ) : (
                        <form
                          className="admin-reconcile-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            reconcilePayment(order);
                          }}
                        >
                          <input
                            aria-label={`Razorpay Payment ID for ${order.order_number}`}
                            placeholder="pay_..."
                            value={
                              paymentIds[order.id] ?? ''
                            }
                            onChange={(e) =>
                              setPaymentIds((old) => ({
                                ...old,
                                [order.id]:
                                  e.target.value,
                              }))
                            }
                          />

                          <button
                            className="admin-secondary"
                            disabled={
                              saving === order.id
                            }
                          >
                            {saving === order.id
                              ? 'Verifying…'
                              : 'Verify & mark paid'}
                          </button>
                        </form>
                      )}
                    </td>

                    <td>
                      <form
                        className="admin-tracking-form"
                        onSubmit={(e) => {
                          e.preventDefault();

                          const form = new FormData(
                            e.currentTarget
                          );

                          update(order.id, {
                            tracking: {
                              courier:
                                form.get('courier'),
                              awb: form.get('awb'),
                              url: form.get('url'),
                            },
                          });
                        }}
                      >
                        <input
                          name="courier"
                          aria-label="Courier"
                          placeholder="Courier name"
                          defaultValue={
                            order.tracking?.courier ||
                            ''
                          }
                        />

                        <input
                          name="awb"
                          aria-label="AWB number"
                          placeholder="AWB / tracking ID"
                          defaultValue={
                            order.tracking?.awb || ''
                          }
                        />

                        <input
                          name="url"
                          aria-label="Tracking URL"
                          placeholder="https:// tracking link"
                          defaultValue={
                            order.tracking?.url || ''
                          }
                        />

                        <button
                          className="admin-secondary"
                          disabled={
                            saving === order.id
                          }
                        >
                          {saving === order.id
                            ? 'Saving…'
                            : 'Save tracking'}
                        </button>
                      </form>

                      {order.tracking?.url && (
                        <a
                          href={order.tracking.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open tracking ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-reconcile-form,
        .admin-tracking-form {
          display: grid;
          gap: 6px;
          min-width: 170px;
        }

        .admin-reconcile-form input,
        .admin-tracking-form input {
          width: 100%;
          box-sizing: border-box;
          min-height: 32px;
          padding: 6px 8px;
          border: 1px solid #ded5c9;
          border-radius: 5px;
          font-size: 11px;
          background: #fffdf9;
          color: #302820;
        }

        .admin-reconcile-form button,
        .admin-tracking-form button {
          font-size: 11px;
          min-height: 30px;
        }

        .admin-table td {
          vertical-align: top;
        }

        .admin-table td small {
          color: #81766a;
          font-size: 10px;
        }

        .admin-table td a {
          font-size: 11px;
          color: #755c3d;
          display: inline-block;
          margin-top: 6px;
        }

        .delivery-address {
          min-width: 220px;
          line-height: 1.5;
        }

        .delivery-address b {
          font-size: 11px;
          color: #302820;
          font-weight: 600;
        }

        .delivery-address small {
          font-size: 10px;
          color: #81766a;
        }

        .copy-address {
          margin-top: 7px;
          padding: 5px 8px;
          border: 1px solid #ded5c9;
          border-radius: 5px;
          background: #fffdf9;
          color: #755c3d;
          font-size: 10px;
          cursor: pointer;
        }

        .copy-address:hover {
          background: #f6efe7;
        }
      `}</style>
    </main>
  );
}