
import Link from 'next/link';
import { getAdminUser } from '@/lib/firebase/admin-auth';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

type Order = {
  order_number?: string;
  customer_name?: string;
  total_amount?: number;
  amount_paid?: number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  created_at?: string;
};

const money = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

const dateFormat = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN');
};

export default async function AdminDashboard() {
  const { user, isAdmin } = await getAdminUser();

  if (!user) {
    return (
      <main className="admin-main">
        <p className="admin-kicker">STORE MANAGEMENT</p>
        <h1>Admin sign-in required</h1>
        <Link className="admin-primary" href="/admin/login">
          Go to admin login
        </Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-main">
        <h1>Admin access not granted</h1>
      </main>
    );
  }

  let orders: Order[] = [];
  let productCount = 0;
  let loadError = false;

  try {
    const db = adminDb();

    const [products, orderSnapshot] = await Promise.all([
      db.collection('products').get(),
      db.collection('orders').get(),
    ]);

    productCount = products.size;
    orders = orderSnapshot.docs.map(
      (doc) => doc.data() as Order
    );
  } catch (error) {
    console.error('Admin dashboard error:', error);
    loadError = true;
  }

  const status = (order: Order) =>
    String(order.status || '').toLowerCase();

  const payment = (order: Order) =>
    String(order.payment_status || '').toLowerCase();

  const totalOrders = orders.length;

  const paidOrders = orders.filter((o) =>
    ['paid', 'captured', 'success', 'completed', 'advance_paid']
      .includes(payment(o))
  );

  const revenue = paidOrders.reduce(
    (sum, order) => sum + Number(order.amount_paid || 0),
    0
  );

  const pendingOrders = orders.filter((o) =>
    ['pending', 'payment_pending', 'checkout_creation_failed']
      .includes(status(o))
  ).length;

  const processing = orders.filter(
    (o) => status(o) === 'processing'
  ).length;

  const shipped = orders.filter(
    (o) => status(o) === 'shipped'
  ).length;

  const delivered = orders.filter(
    (o) => status(o) === 'delivered'
  ).length;

  const cancelled = orders.filter(
    (o) => status(o) === 'cancelled'
  ).length;

  const codOrders = orders.filter((o) =>
    String(o.payment_method || '').toLowerCase().includes('cod')
  ).length;

  const pendingPayments = orders.filter((o) =>
    ['pending', 'payment_pending', 'unpaid'].includes(payment(o))
  ).length;

  const recentOrders = [...orders]
    .sort((a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    )
    .slice(0, 5);

  const stats = [
    ['Total orders', totalOrders, 'All customer orders'],
    ['Collected revenue', money(revenue), 'Verified payment records'],
    ['Pending orders', pendingOrders, 'Need attention'],
    ['Paid orders', paidOrders.length, 'Payment records'],
    ['Processing', processing, 'Being prepared'],
    ['Shipped', shipped, 'Dispatched orders'],
    ['Delivered', delivered, 'Successfully delivered'],
    ['COD orders', codOrders, 'Cash on delivery'],
  ];

  return (
    <main className="admin-main">
      <div className="admin-topline">
        <div>
          <p className="admin-kicker">FASHIONYAPA STORE</p>
          <h1>Dashboard</h1>
          <p className="admin-muted">
            Monitor your store performance and orders.
          </p>
        </div>

        <form action="/auth/signout" method="post">
          <button className="admin-secondary">Sign out</button>
        </form>
      </div>

      {loadError && (
        <p className="admin-error">
          Could not load dashboard data. Please refresh.
        </p>
      )}

      <section className="admin-card-grid">
        {stats.map(([label, value, description]) => (
          <div className="admin-stat" key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{description}</small>
          </div>
        ))}
      </section>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="admin-topline">
          <div>
            <p className="admin-kicker">STORE FULFILMENT</p>
            <h2>Order overview</h2>
          </div>
          <Link className="admin-secondary" href="/admin/orders">
            Manage orders →
          </Link>
        </div>

        <div className="admin-card-grid">
          {[
            ['Pending', pendingOrders],
            ['Processing', processing],
            ['Shipped', shipped],
            ['Delivered', delivered],
            ['Cancelled', cancelled],
          ].map(([label, count]) => (
            <div className="admin-stat" key={String(label)}>
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel" style={{ marginTop: 20 }}>
        <p className="admin-kicker">PAYMENT SUMMARY</p>
        <h2>Payment overview</h2>

        <div className="admin-card-grid">
          <div className="admin-stat">
            <span>Collected revenue</span>
            <strong>{money(revenue)}</strong>
          </div>

          <div className="admin-stat">
            <span>Pending payments</span>
            <strong>{pendingPayments}</strong>
          </div>

          <div className="admin-stat">
            <span>COD orders</span>
            <strong>{codOrders}</strong>
          </div>

          <div className="admin-stat">
            <span>Products in catalogue</span>
            <strong>{productCount}</strong>
          </div>
        </div>
      </section>

      <section className="admin-panel" style={{ marginTop: 20 }}>
        <div className="admin-topline">
          <div>
            <p className="admin-kicker">LATEST ACTIVITY</p>
            <h2>Recent orders</h2>
          </div>
          <Link className="admin-secondary" href="/admin/orders">
            View all orders →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="admin-empty">No orders found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order, index) => (
                  <tr key={`${order.order_number}-${index}`}>
                    <td>
                      <strong>{order.order_number || '—'}</strong>
                    </td>
                    <td>{order.customer_name || '—'}</td>
                    <td>{dateFormat(order.created_at)}</td>
                    <td>
                      {money(Number(order.total_amount || 0))}
                    </td>
                    <td>{order.payment_status || '—'}</td>
                    <td>{order.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-actions" style={{ marginTop: 24 }}>
        <Link className="admin-primary" href="/admin/orders">
          Manage orders
        </Link>

        <Link className="admin-secondary" href="/admin/products">
          Manage products ({productCount})
        </Link>
      </div>
    </main>
  );
}
