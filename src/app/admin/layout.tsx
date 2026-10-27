import Link from 'next/link';
import './admin.css';
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="admin-logo" href="/admin">FASHIONYAPA</Link><nav className="admin-nav"><Link href="/admin">Overview</Link><Link href="/admin/products">Products</Link><Link href="/admin/orders">Orders</Link></nav><p className="admin-sidebar-note">Store admin<br/>Keep your catalogue and orders up to date.</p></aside><section className="admin-content">{children}</section></div>;
}
