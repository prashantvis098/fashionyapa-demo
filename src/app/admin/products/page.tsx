'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { firebaseAuth } from '@/lib/firebase/client';

async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const user = firebaseAuth.currentUser;
  const token = user ? await user.getIdToken() : null;

  return fetch(input, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

type Product = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  stock: number;
  is_active: boolean;
  image_url: string;
  description: string;
  slug: string;
  compare_at_price: number | null;
};

type ProductForm = {
  name: string;
  category: string;
  price: string;
  compare_at_price: string;
  stock: string;
  image_url: string;
  description: string;
  is_active: boolean;
};

const blank: ProductForm = {
  name: '',
  category: 'Viral Combos',
  price: '',
  compare_at_price: '',
  stock: '0',
  image_url: '',
  description: '',
  is_active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>({ ...blank });
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/admin/products');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Could not load products (${response.status}).`);
        return;
      }

      setProducts(data.products || []);
    } catch {
      setError('Network error while loading products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(product: Product) {
    setEditing(String(product.id));

    setForm({
      name: product.name || '',
      category: product.category || 'Viral Combos',
      price: product.price == null ? '' : String(product.price),
      compare_at_price:
        product.compare_at_price == null
          ? ''
          : String(product.compare_at_price),
      stock: String(product.stock ?? 0),
      image_url: product.image_url || '',
      description: product.description || '',
      is_active: Boolean(product.is_active),
    });

    setError('');
    setMessage('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm({ ...blank });
    setError('');
    setMessage('');
  }

  function updateField(
    key: keyof ProductForm,
    value: string | boolean
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const stock = Number(form.stock);
    const price = form.price.trim() === '' ? null : Number(form.price);
    const compareAtPrice =
      form.compare_at_price.trim() === ''
        ? null
        : Number(form.compare_at_price);

    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a whole number of 0 or more.');
      return;
    }

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setError('Enter a valid selling price.');
      return;
    }

    if (
      compareAtPrice !== null &&
      (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)
    ) {
      setError('Enter a valid compare-at price.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const url = editing
        ? `/api/admin/products/${encodeURIComponent(editing)}`
        : '/api/admin/products';

      const response = await apiFetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: price === null ? '' : String(price),
          compare_at_price:
            compareAtPrice === null ? '' : String(compareAtPrice),
          stock,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || `Could not save product (${response.status}).`
        );
        return;
      }

      setMessage(editing ? 'Product updated.' : 'Product created.');
      setEditing(null);
      setForm({ ...blank });
      await load();
    } catch {
      setError('Network error while saving product.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this product? This cannot be undone.')) {
      return;
    }

    setError('');
    setMessage('');

    try {
      const response = await apiFetch(
        `/api/admin/products/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Could not delete product (${response.status}).`);
        return;
      }

      if (editing === id) reset();

      setMessage('Product deleted.');
      await load();
    } catch {
      setError('Network error while deleting product.');
    }
  }

  return (
    <main className="admin-main">
      <div className="admin-topline">
        <div>
          <p className="admin-kicker">CATALOGUE</p>
          <h1>Products</h1>
          <p className="admin-muted">
            Add products, update pricing and control stock visibility.
          </p>
        </div>

        <Link className="admin-secondary" href="/admin">
          ← Dashboard
        </Link>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      <section
        id="product-editor"
        className="admin-panel"
        style={{ margin: '24px 0' }}
      >
        <h2>{editing ? 'Edit product' : 'Add a product'}</h2>

        <form onSubmit={submit}>
          <div className="admin-form-grid">
            <label>
              Product name
              <input
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                <option>Viral Combos</option>
                <option>Hair Accessories</option>
                <option>Baddie Jewels</option>
              </select>
            </label>

            <label>
              Selling price (₹)
              <input
                type="number"
                min="0"
                step="1"
                value={form.price}
                placeholder="Leave blank if unconfirmed"
                onChange={(e) => updateField('price', e.target.value)}
              />
            </label>

            <label>
              Compare-at price (₹)
              <input
                type="number"
                min="0"
                step="1"
                value={form.compare_at_price}
                onChange={(e) =>
                  updateField('compare_at_price', e.target.value)
                }
              />
            </label>

            <label>
              Stock quantity
              <input
                type="number"
                min="0"
                step="1"
                required
                value={form.stock}
                onChange={(e) => updateField('stock', e.target.value)}
              />
            </label>

            <label>
              Image URL / public path
              <input
                value={form.image_url}
                placeholder="/images/combos/combo-1.png"
                onChange={(e) => updateField('image_url', e.target.value)}
              />
            </label>

            <label className="admin-field-wide">
              Description
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </label>

            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
              />
              Visible in storefront
            </label>
          </div>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-primary"
              disabled={busy}
            >
              {busy
                ? 'Saving…'
                : editing
                  ? 'Save changes'
                  : 'Create product'}
            </button>

            {editing && (
              <button
                type="button"
                className="admin-secondary"
                disabled={busy}
                onClick={reset}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-topline">
          <h2>All products ({products.length})</h2>

          <button
            type="button"
            className="admin-secondary"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p className="admin-muted">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="admin-empty">No products found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>
                      {product.price == null
                        ? 'Unpriced'
                        : `₹${Number(product.price).toLocaleString('en-IN')}`}
                    </td>
                    <td>{product.stock}</td>
                    <td>
                      <span
                        className="admin-status"
                        style={
                          !product.is_active || product.stock <= 0
                            ? { background: '#fff0f0', color: '#9a3535' }
                            : {}
                        }
                      >
                        {!product.is_active
                          ? 'Hidden'
                          : product.stock <= 0
                            ? 'Out of stock'
                            : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() => startEdit(product)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="admin-danger"
                          onClick={() => void remove(product.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

