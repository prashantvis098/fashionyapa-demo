'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { firebaseAuth } from '@/lib/firebase/client';

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
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
  images?: string[];
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
  description: string;
  is_active: boolean;
};

const blank: ProductForm = {
  name: '',
  category: 'Viral Combos',
  price: '',
  compare_at_price: '',
  stock: '0',
  description: '',
  is_active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>({ ...blank });
  const [images, setImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [loading, setLoading] = useState(true);
  const pickerRef = useRef<HTMLInputElement>(null);

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
        product.compare_at_price == null ? '' : String(product.compare_at_price),
      stock: String(product.stock ?? 0),
      description: product.description || '',
      is_active: Boolean(product.is_active),
    });

    const currentImages =
      Array.isArray(product.images) && product.images.length
        ? product.images
        : product.image_url
          ? [product.image_url]
          : [];

    setImages(currentImages);
    setRemovedImages([]);
    setError('');
    setMessage('');
    setUploadProgress('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm({ ...blank });
    setImages([]);
    setRemovedImages([]);
    setError('');
    setMessage('');
    setUploadProgress('');

    if (pickerRef.current) {
      pickerRef.current.value = '';
    }
  }

  function updateField(key: keyof ProductForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    // Copy the FileList immediately; the browser input is reset after selection.
    const files = Array.from(fileList);

    const invalidFile = files.find((file) => !file.type.startsWith('image/'));
    if (invalidFile) {
      setError(`${invalidFile.name} is not an image. Please select image files only.`);
      if (pickerRef.current) pickerRef.current.value = '';
      return;
    }

    const oversizedFile = files.find((file) => file.size > 8 * 1024 * 1024);
    if (oversizedFile) {
      setError(`${oversizedFile.name} is larger than 8 MB. Please choose a smaller image.`);
      if (pickerRef.current) pickerRef.current.value = '';
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');
    setUploadProgress(`Preparing ${files.length} image(s)…`);

    let uploadedCount = 0;
    const failedFiles: string[] = [];

    // Upload one by one to avoid overwhelming the server, but add each
    // successful image to the preview immediately.
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setUploadProgress(`Uploading ${index + 1} of ${files.length}: ${file.name}`);

      try {
        const body = new FormData();
        body.append('file', file);

        const response = await apiFetch('/api/admin/products/upload', {
          method: 'POST',
          body,
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          throw new Error(data.error || `Could not upload ${file.name}.`);
        }

        setImages((current) => [...current, data.url as string]);
        uploadedCount += 1;
      } catch (uploadError) {
        failedFiles.push(
          uploadError instanceof Error
            ? `${file.name}: ${uploadError.message}`
            : `${file.name}: upload failed`,
        );
      }
    }

    setUploading(false);
    setUploadProgress('');

    if (pickerRef.current) {
      pickerRef.current.value = '';
    }

    if (failedFiles.length === 0) {
      setMessage(
        `${uploadedCount} image(s) uploaded successfully. You can select more images if needed.`,
      );
    } else {
      setMessage(`${uploadedCount} of ${files.length} image(s) uploaded.`);
      setError(failedFiles.join(' | '));
    }
  }

  function removeImage(url: string) {
    if (!window.confirm('Remove this image from the product?')) return;

    setImages((current) => current.filter((item) => item !== url));
    setRemovedImages((current) =>
      current.includes(url) ? current : [...current, url],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploading) return;

    if (!images.length) {
      setError('Please upload at least one product image.');
      return;
    }

    const stock = Number(form.stock);
    const price = form.price.trim() === '' ? null : Number(form.price);
    const compareAtPrice =
      form.compare_at_price.trim() === '' ? null : Number(form.compare_at_price);

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
          images,
          image_url: images[0],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Could not save product (${response.status}).`);
        return;
      }

      // Delete removed storage files only after the product update succeeds.
      for (const removedUrl of removedImages) {
        await apiFetch('/api/admin/products/image', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: removedUrl }),
        }).catch(() => undefined);
      }

      setMessage(editing ? 'Product updated successfully.' : 'Product created successfully.');
      setEditing(null);
      setForm({ ...blank });
      setImages([]);
      setRemovedImages([]);
      await load();
    } catch {
      setError('Network error while saving product.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;

    setError('');
    setMessage('');

    try {
      const response = await apiFetch(
        `/api/admin/products/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Could not delete product (${response.status}).`);
        return;
      }

      if (editing === id) reset();
      setMessage('Product deleted successfully.');
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
            Add products, upload photos and manage your catalogue.
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
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={(event) => updateField('category', event.target.value)}
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
                onChange={(event) => updateField('price', event.target.value)}
              />
            </label>

            <label>
              Compare-at price (₹)
              <input
                type="number"
                min="0"
                step="1"
                value={form.compare_at_price}
                onChange={(event) =>
                  updateField('compare_at_price', event.target.value)
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
                onChange={(event) => updateField('stock', event.target.value)}
              />
            </label>

            <label className="admin-field-wide">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
              />
            </label>

            <div
              className="admin-field-wide"
              style={{
                display: 'grid',
                gap: 12,
                padding: 16,
                border: '1px dashed #b98da6',
                borderRadius: 14,
                background: '#fffafd',
              }}
            >
              <strong>Product photos</strong>
              <p className="admin-muted" style={{ margin: 0 }}>
                Select multiple photos together, or add more photos in another
                selection. Every uploaded photo will appear below. The first
                photo is the main product image.
              </p>

              <input
                ref={pickerRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                disabled={uploading || busy}
                onChange={(event) => {
                  void uploadFiles(event.currentTarget.files);
                }}
              />

              <p className="admin-muted" style={{ margin: 0 }}>
                {images.length} image(s) added · Maximum 8 MB per image
              </p>

              {uploading && (
                <p className="admin-muted" aria-live="polite">
                  {uploadProgress || 'Uploading images…'}
                </p>
              )}

              {images.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 12,
                  }}
                >
                  {images.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      style={{
                        border: index === 0 ? '2px solid #854d70' : '1px solid #e7e0dc',
                        borderRadius: 12,
                        padding: 8,
                        background: '#fff',
                        minWidth: 0,
                      }}
                    >
                      <img
                        src={url}
                        alt={`Product image ${index + 1}`}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                        }}
                      />

                      <small
                        style={{
                          display: 'block',
                          marginTop: 7,
                          fontWeight: 700,
                          color: index === 0 ? '#854d70' : '#66545f',
                        }}
                      >
                        {index === 0 ? '★ Main image' : `Image ${index + 1}`}
                      </small>

                      {index > 0 && (
                        <button
                          type="button"
                          className="admin-secondary"
                          style={{ marginTop: 7, width: '100%' }}
                          disabled={uploading || busy}
                          onClick={() =>
                            setImages((current) => [
                              url,
                              ...current.filter((item) => item !== url),
                            ])
                          }
                        >
                          Set as main
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-danger"
                        style={{ marginTop: 7, width: '100%' }}
                        disabled={uploading || busy}
                        onClick={() => removeImage(url)}
                      >
                        Remove image
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="admin-muted" style={{ margin: 0 }}>
                  No photos added yet. Choose one or more image files to begin.
                </p>
              )}
            </div>

            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField('is_active', event.target.checked)
                }
              />
              Visible in storefront
            </label>
          </div>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-primary"
              disabled={busy || uploading}
            >
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
            </button>

            {editing && (
              <button
                type="button"
                className="admin-secondary"
                disabled={busy || uploading}
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
                {products.map((product) => {
                  const thumbnail = product.image_url || product.images?.[0] || '';

                  return (
                    <tr key={product.id}>
                      <td
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        {thumbnail && /^https?:\/\//i.test(thumbnail) ? (
                          <img
                            src={thumbnail}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                            style={{
                              width: 48,
                              height: 48,
                              objectFit: 'cover',
                              borderRadius: 8,
                              background: '#f5edf2',
                            }}
                          />
                        ) : (
                          <span
                            aria-label="No product image"
                            style={{
                              width: 48,
                              height: 48,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 8,
                              background: '#f5edf2',
                              color: '#854d70',
                              fontSize: 11,
                              textAlign: 'center',
                            }}
                          >
                            No image
                          </span>
                        )}
                        {product.name}
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
