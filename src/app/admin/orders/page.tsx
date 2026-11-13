"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const token = await firebaseAuth.currentUser?.getIdToken();

  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });
}

type OrderItem = {
  product_id?: string;
  storefront_id?: number;
  name?: string;
  unit_price?: number;
  quantity?: number;
  image_url?: string;
};

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

  items?: OrderItem[];

  subtotal_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  amount_paid: number;
  amount_due?: number;

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
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "payment_pending",
];

const money = (amount: number) =>
  `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [paymentIds, setPaymentIds] = useState<
    Record<string, string>
  >({});
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  async function load() {
    const response = await apiFetch("/api/admin/orders");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Could not load orders."
      );
    }

    setOrders(data.orders || []);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function update(
    id: string,
    payload: Record<string, unknown>
  ) {
    setSaving(id);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch(
        `/api/admin/orders/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not update order."
        );
      }

      setOrders((old) =>
        old.map((order) =>
          order.id === id
            ? {
                ...order,
                ...data.order,
              }
            : order
        )
      );

      setSelectedOrder((old) =>
        old && old.id === id
          ? {
              ...old,
              ...data.order,
            }
          : old
      );

      setMessage("Order updated successfully.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not update order."
      );
    } finally {
      setSaving(null);
    }
  }

  async function reconcilePayment(order: Order) {
    const paymentId = String(
      paymentIds[order.id] ?? ""
    ).trim();

    if (!paymentId) {
      setError(
        "Enter the Razorpay Payment ID first."
      );
      return;
    }

    setSaving(order.id);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch(
        `/api/admin/orders/${order.id}/reconcile-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not verify Razorpay payment."
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

      const refreshed = orders.find(
        (item) => item.id === order.id
      );

      if (refreshed) {
        setSelectedOrder({
          ...refreshed,
          ...data.order,
        });
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not verify Razorpay payment."
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
      .join(", ");

    navigator.clipboard
      .writeText(fullAddress)
      .then(() => {
        setMessage(
          `Address copied for ${order.order_number}`
        );
      })
      .catch(() => {
        setError("Could not copy address.");
      });
  }

  function getDueAmount(order: Order) {
    if (
      order.amount_due !== undefined &&
      order.amount_due !== null
    ) {
      return Number(order.amount_due);
    }

    return Math.max(
      0,
      Number(order.total_amount || 0) -
        Number(order.amount_paid || 0)
    );
  }

  return (
    <main className="admin-main">
      {/* HEADER */}
      <div className="admin-topline">
        <div>
          <p className="admin-kicker">
            FULFILMENT
          </p>

          <h1>Orders</h1>

          <p className="admin-muted">
            Manage order status, payment verification
            and courier tracking.
          </p>
        </div>

        <Link
          className="admin-secondary"
          href="/admin"
        >
          ← Dashboard
        </Link>
      </div>

      {/* MAIN PANEL */}
      <div
        className="admin-panel"
        style={{ marginTop: 24 }}
      >
        <div className="admin-topline">
          <div>
            <h2>
              Recent orders ({orders.length})
            </h2>

            <p className="admin-muted">
              Click any order to view complete
              details.
            </p>
          </div>

          <button
            type="button"
            className="admin-secondary"
            onClick={() =>
              load().catch((e) =>
                setError(e.message)
              )
            }
          >
            Refresh
          </button>
        </div>

        {error && (
          <p className="admin-error">
            {error}
          </p>
        )}

        {message && (
          <p className="admin-success">
            {message}
          </p>
        )}

        {loading ? (
          <p className="admin-muted">
            Loading orders…
          </p>
        ) : orders.length === 0 ? (
          <p className="admin-empty">
            No orders found.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    Order / Customer
                  </th>

                  <th>
                    Delivery Address
                  </th>

                  <th>
                    Placed
                  </th>

                  <th>
                    Total / Paid
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Order status
                  </th>

                  <th>
                    Verify payment
                  </th>

                  <th>
                    Courier tracking
                  </th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    {/* ORDER / CUSTOMER */}
                    <td>
                      <button
                        type="button"
                        className="order-number-button"
                        onClick={() =>
                          setSelectedOrder(
                            order
                          )
                        }
                      >
                        {order.order_number}
                      </button>

                      <br />

                      <span>
                        {order.customer_name}
                      </span>

                      <br />

                      <small>
                        {order.customer_phone}
                      </small>

                      <br />

                      <small>
                        {order.customer_email}
                      </small>

                      <br />

                      <button
                        type="button"
                        className="view-details-button"
                        onClick={() =>
                          setSelectedOrder(
                            order
                          )
                        }
                      >
                        View Details →
                      </button>
                    </td>

                    {/* ADDRESS */}
                    <td>
                      {order.address ? (
                        <div className="delivery-address">
                          <b>
                            {
                              order.address
                                .address ||
                              "—"
                            }
                          </b>

                          <br />

                          <small>
                            {
                              order.address
                                .city ||
                              "—"
                            }
                            ,{" "}
                            {
                              order.address
                                .state ||
                              "—"
                            }
                          </small>

                          <br />

                          <small>
                            PIN:{" "}
                            {
                              order.address
                                .pincode ||
                              "—"
                            }
                          </small>

                          <br />

                          <button
                            type="button"
                            className="copy-address"
                            onClick={() =>
                              copyAddress(
                                order
                              )
                            }
                          >
                            Copy Address
                          </button>
                        </div>
                      ) : (
                        <small>
                          Address not available
                        </small>
                      )}
                    </td>

                    {/* DATE */}
                    <td>
                      {order.created_at
                        ? new Date(
                            order.created_at
                          ).toLocaleDateString(
                            "en-IN"
                          )
                        : "—"}
                    </td>

                    {/* TOTAL */}
                    <td>
                      {money(
                        Number(
                          order.total_amount ||
                            0
                        )
                      )}

                      <br />

                      <small>
                        Paid{" "}
                        {money(
                          Number(
                            order.amount_paid ||
                              0
                          )
                        )}
                      </small>
                    </td>

                    {/* PAYMENT */}
                    <td>
                      <span className="payment-method">
                        {order.payment_method ||
                          "—"}
                      </span>

                      <br />

                      <span className="payment-status">
                        {(
                          order.payment_status ||
                          "—"
                        ).replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td>
                      <select
                        aria-label={`Status for ${order.order_number}`}
                        value={
                          order.status
                        }
                        disabled={
                          saving ===
                          order.id
                        }
                        onChange={(e) =>
                          update(
                            order.id,
                            {
                              status:
                                e.target
                                  .value,
                            }
                          )
                        }
                      >
                        {statuses.map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {status.replaceAll(
                                "_",
                                " "
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    {/* PAYMENT VERIFICATION */}
                    <td>
                      {order.payment_status ===
                        "paid" ||
                      order.payment_status ===
                        "advance_paid" ? (
                        <div className="verified-payment">
                          <span>
                            ✓ Verified
                          </span>

                          <small>
                            {order.razorpay_payment_id ||
                              "Razorpay"}
                          </small>
                        </div>
                      ) : (
                        <form
                          className="admin-reconcile-form"
                          onSubmit={(e) => {
                            e.preventDefault();

                            reconcilePayment(
                              order
                            );
                          }}
                        >
                          <input
                            aria-label={`Razorpay Payment ID for ${order.order_number}`}
                            placeholder="pay_..."
                            value={
                              paymentIds[
                                order.id
                              ] ??
                              ""
                            }
                            onChange={(
                              e
                            ) =>
                              setPaymentIds(
                                (
                                  old
                                ) => ({
                                  ...old,
                                  [order.id]:
                                    e
                                      .target
                                      .value,
                                })
                              )
                            }
                          />

                          <button
                            type="submit"
                            className="admin-secondary"
                            disabled={
                              saving ===
                              order.id
                            }
                          >
                            {saving ===
                            order.id
                              ? "Verifying…"
                              : "Verify & mark paid"}
                          </button>
                        </form>
                      )}
                    </td>

                    {/* TRACKING */}
                    <td>
                      <form
                        className="admin-tracking-form"
                        onSubmit={(e) => {
                          e.preventDefault();

                          const form =
                            new FormData(
                              e.currentTarget
                            );

                          update(
                            order.id,
                            {
                              tracking:
                                {
                                  courier:
                                    String(
                                      form.get(
                                        "courier"
                                      ) ||
                                        ""
                                    ),
                                  awb:
                                    String(
                                      form.get(
                                        "awb"
                                      ) ||
                                        ""
                                    ),
                                  url:
                                    String(
                                      form.get(
                                        "url"
                                      ) ||
                                        ""
                                    ),
                                },
                            }
                          );
                        }}
                      >
                        <input
                          name="courier"
                          aria-label="Courier"
                          placeholder="Courier name"
                          defaultValue={
                            order
                              .tracking
                              ?.courier ||
                            ""
                          }
                        />

                        <input
                          name="awb"
                          aria-label="AWB number"
                          placeholder="AWB / tracking ID"
                          defaultValue={
                            order
                              .tracking
                              ?.awb ||
                            ""
                          }
                        />

                        <input
                          name="url"
                          aria-label="Tracking URL"
                          placeholder="https:// tracking link"
                          defaultValue={
                            order
                              .tracking
                              ?.url ||
                            ""
                          }
                        />

                        <button
                          type="submit"
                          className="admin-secondary"
                          disabled={
                            saving ===
                            order.id
                          }
                        >
                          {saving ===
                          order.id
                            ? "Saving…"
                            : "Save tracking"}
                        </button>
                      </form>

                      {order.tracking
                        ?.url && (
                        <a
                          href={
                            order.tracking
                              .url
                          }
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

      {/* ========================= */}
      {/* ORDER DETAILS MODAL */}
      {/* ========================= */}

      {selectedOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() =>
            setSelectedOrder(null)
          }
        >
          <div
            className="order-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* MODAL HEADER */}
            <div className="order-modal-header">
              <div>
                <p className="admin-kicker">
                  ORDER DETAILS
                </p>

                <h2>
                  {
                    selectedOrder.order_number
                  }
                </h2>

                <p className="admin-muted">
                  {selectedOrder.created_at
                    ? new Date(
                        selectedOrder.created_at
                      ).toLocaleString(
                        "en-IN"
                      )
                    : "—"}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setSelectedOrder(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="order-detail-grid">
              {/* CUSTOMER */}
              <section className="detail-card">
                <h3>
                  Customer
                </h3>

                <div className="detail-info">
                  <p>
                    <span>
                      Name
                    </span>

                    <b>
                      {
                        selectedOrder.customer_name
                      }
                    </b>
                  </p>

                  <p>
                    <span>
                      Phone
                    </span>

                    <b>
                      {
                        selectedOrder.customer_phone
                      }
                    </b>
                  </p>

                  <p>
                    <span>
                      Email
                    </span>

                    <b>
                      {
                        selectedOrder.customer_email
                      }
                    </b>
                  </p>
                </div>
              </section>

              {/* STATUS */}
              <section className="detail-card">
                <h3>
                  Order Status
                </h3>

                <select
                  className="modal-status-select"
                  value={
                    selectedOrder.status
                  }
                  disabled={
                    saving ===
                    selectedOrder.id
                  }
                  onChange={(e) => {
                    const status =
                      e.target
                        .value;

                    setSelectedOrder(
                      (
                        old
                      ) =>
                        old
                          ? {
                              ...old,
                              status,
                            }
                          : old
                    );

                    update(
                      selectedOrder.id,
                      {
                        status,
                      }
                    );
                  }}
                >
                  {statuses.map(
                    (status) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {status.replaceAll(
                          "_",
                          " "
                        )}
                      </option>
                    )
                  )}
                </select>

                <div
                  className={`status-badge status-${selectedOrder.status}`}
                >
                  {selectedOrder.status.replaceAll(
                    "_",
                    " "
                  )}
                </div>
              </section>

              {/* DELIVERY ADDRESS */}
              <section className="detail-card detail-card-wide">
                <div className="detail-card-title">
                  <h3>
                    Delivery Address
                  </h3>

                  <button
                    type="button"
                    className="copy-address"
                    onClick={() =>
                      copyAddress(
                        selectedOrder
                      )
                    }
                  >
                    Copy Address
                  </button>
                </div>

                {selectedOrder.address ? (
                  <div className="full-address">
                    <b>
                      {
                        selectedOrder
                          .address
                          .address ||
                        "—"
                      }
                    </b>

                    <br />

                    {
                      selectedOrder
                        .address
                        .city ||
                      "—"
                    }
                    ,{" "}
                    {
                      selectedOrder
                        .address
                        .state ||
                      "—"
                    }

                    <br />

                    PIN:{" "}
                    {
                      selectedOrder
                        .address
                        .pincode ||
                      "—"
                    }
                  </div>
                ) : (
                  <p>
                    Address not
                    available.
                  </p>
                )}
              </section>

              {/* PRODUCTS */}
              <section className="detail-card detail-card-wide">
                <div className="detail-card-title">
                  <h3>
                    Ordered Products
                  </h3>

                  <span className="items-count">
                    {
                      selectedOrder
                        .items
                        ?.length ||
                      0
                    }{" "}
                    item(s)
                  </span>
                </div>

                {selectedOrder.items &&
                selectedOrder.items
                  .length > 0 ? (
                  <div className="order-items">
                    {selectedOrder.items.map(
                      (
                        item,
                        index
                      ) => {
                        const quantity =
                          Number(
                            item.quantity ||
                              0
                          );

                        const price =
                          Number(
                            item.unit_price ||
                              0
                          );

                        const lineTotal =
                          price *
                          quantity;

                        return (
                          <div
                            className="order-item"
                            key={`${item.product_id || "item"}-${index}`}
                          >
                            <div className="order-item-image">
                              {item.image_url ? (
                                <img
                                  src={
                                    item.image_url
                                  }
                                  alt={
                                    item.name ||
                                    "Product"
                                  }
                                />
                              ) : (
                                <div className="no-image">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="order-item-info">
                              <b>
                                {item.name ||
                                  "Product"}
                              </b>

                              <small>
                                Qty:{" "}
                                {
                                  quantity
                                }
                              </small>

                              <small>
                                {money(
                                  price
                                )}{" "}
                                ×{" "}
                                {
                                  quantity
                                }
                              </small>
                            </div>

                            <strong>
                              {money(
                                lineTotal
                              )}
                            </strong>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="empty-items">
                    <p>
                      Product details
                      unavailable
                      for this order.
                    </p>
                  </div>
                )}
              </section>

              {/* PAYMENT */}
              <section className="detail-card">
                <h3>
                  Payment
                </h3>

                <div className="payment-summary">
                  <div>
                    <span>
                      Method
                    </span>

                    <b>
                      {
                        selectedOrder.payment_method ||
                        "—"
                      }
                    </b>
                  </div>

                  <div>
                    <span>
                      Status
                    </span>

                    <b>
                      {(
                        selectedOrder.payment_status ||
                        "—"
                      ).replaceAll(
                        "_",
                        " "
                      )}
                    </b>
                  </div>

                  <div>
                    <span>
                      Order Total
                    </span>

                    <strong>
                      {money(
                        Number(
                          selectedOrder.total_amount ||
                            0
                        )
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Paid
                    </span>

                    <strong className="paid-amount">
                      {money(
                        Number(
                          selectedOrder.amount_paid ||
                            0
                        )
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Due
                    </span>

                    <strong className="due-amount">
                      {money(
                        getDueAmount(
                          selectedOrder
                        )
                      )}
                    </strong>
                  </div>
                </div>

                {selectedOrder.razorpay_payment_id && (
                  <div className="razorpay-id">
                    <span>
                      Razorpay Payment ID
                    </span>

                    <code>
                      {
                        selectedOrder.razorpay_payment_id
                      }
                    </code>
                  </div>
                )}
              </section>

              {/* SHIPPING */}
              <section className="detail-card">
                <h3>
                  Shipping
                </h3>

                <div className="shipping-summary">
                  <p>
                    <span>
                      Courier
                    </span>

                    <b>
                      {
                        selectedOrder
                          .tracking
                          ?.courier ||
                        "—"
                      }
                    </b>
                  </p>

                  <p>
                    <span>
                      AWB
                    </span>

                    <b>
                      {
                        selectedOrder
                          .tracking
                          ?.awb ||
                        "—"
                      }
                    </b>
                  </p>
                </div>

                {selectedOrder.tracking
                  ?.url && (
                  <a
                    href={
                      selectedOrder
                        .tracking
                        .url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="tracking-button"
                  >
                    Open Tracking ↗
                  </a>
                )}
              </section>
            </div>

            {/* MODAL FOOTER */}
            <div className="order-modal-footer">
              <button
                type="button"
                className="admin-secondary"
                onClick={() =>
                  setSelectedOrder(
                    null
                  )
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* STYLES */}
      {/* ========================= */}

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

        .order-number-button {
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0;
          font: inherit;
          font-weight: 700;
          color: #755c3d;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .order-number-button:hover {
          color: #4f3b26;
        }

        .view-details-button {
          margin-top: 8px;
          padding: 6px 9px;
          border: 1px solid #ded5c9;
          border-radius: 5px;
          background: #fffdf9;
          color: #755c3d;
          font-size: 10px;
          cursor: pointer;
        }

        .view-details-button:hover {
          background: #f5eee5;
        }

        .payment-method {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .payment-status {
          font-size: 10px;
          color: #81766a;
          text-transform: capitalize;
        }

        .verified-payment {
          display: grid;
          gap: 4px;
        }

        .verified-payment span {
          color: #397a52;
          font-weight: 700;
          font-size: 11px;
        }

        .verified-payment small {
          max-width: 150px;
          word-break: break-all;
        }

        /* MODAL */

        .order-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(
            20,
            16,
            12,
            0.58
          );
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
        }

        .order-modal {
          width: min(1000px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: #fffdf9;
          border: 1px solid #ded5c9;
          border-radius: 12px;
          box-shadow:
            0 25px 80px rgba(
              0,
              0,
              0,
              0.24
            );
        }

        .order-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 22px 24px;
          border-bottom: 1px solid #e8dfd4;
          position: sticky;
          top: 0;
          background: #fffdf9;
          z-index: 2;
        }

        .order-modal-header h2 {
          margin: 4px 0;
          font-size: 22px;
          color: #302820;
        }

        .modal-close {
          width: 36px;
          height: 36px;
          border: 1px solid #ded5c9;
          border-radius: 50%;
          background: #fffdf9;
          font-size: 25px;
          line-height: 1;
          color: #81766a;
          cursor: pointer;
        }

        .modal-close:hover {
          background: #f5eee5;
          color: #302820;
        }

        .order-detail-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);
          gap: 14px;
          padding: 20px 24px;
        }

        .detail-card {
          border: 1px solid #e8dfd4;
          border-radius: 8px;
          padding: 16px;
          background: #fff;
        }

        .detail-card-wide {
          grid-column: 1 / -1;
        }

        .detail-card h3 {
          margin: 0 0 14px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #755c3d;
        }

        .detail-card-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .detail-card-title h3 {
          margin: 0;
        }

        .detail-info {
          display: grid;
          gap: 10px;
        }

        .detail-info p {
          margin: 0;
          display: grid;
          gap: 3px;
        }

        .detail-info span {
          color: #81766a;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .detail-info b {
          color: #302820;
          font-size: 12px;
          font-weight: 600;
          word-break: break-word;
        }

        .modal-status-select {
          width: 100%;
          min-height: 40px;
          border: 1px solid #ded5c9;
          border-radius: 6px;
          padding: 7px 9px;
          background: #fffdf9;
          color: #302820;
          text-transform: capitalize;
        }

        .status-badge {
          display: inline-block;
          margin-top: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f2eee8;
          color: #755c3d;
          font-size: 10px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .status-delivered {
          background: #e8f4eb;
          color: #397a52;
        }

        .status-shipped {
          background: #e9f0f8;
          color: #456b91;
        }

        .status-cancelled,
        .status-refunded {
          background: #f8e8e8;
          color: #9a4d4d;
        }

        .status-processing,
        .status-confirmed {
          background: #f5efe1;
          color: #8a6a2f;
        }

        .status-payment_pending,
        .status-pending {
          background: #f3eeee;
          color: #796969;
        }

        .full-address {
          padding: 12px 14px;
          border-radius: 6px;
          background: #faf7f2;
          font-size: 12px;
          line-height: 1.8;
          color: #302820;
        }

        .full-address b {
          font-size: 12px;
        }

        .items-count {
          font-size: 10px;
          color: #81766a;
        }

        .order-items {
          display: grid;
          gap: 10px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px;
          border: 1px solid #eee6dc;
          border-radius: 7px;
          background: #fffdfb;
        }

        .order-item-image {
          width: 62px;
          height: 62px;
          flex: 0 0 62px;
          overflow: hidden;
          border-radius: 6px;
          background: #f4eee7;
          border: 1px solid #eee6dc;
        }

        .order-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 9px;
          color: #81766a;
        }

        .order-item-info {
          flex: 1;
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .order-item-info b {
          font-size: 12px;
          color: #302820;
        }

        .order-item-info small {
          font-size: 10px;
          color: #81766a;
        }

        .order-item > strong {
          font-size: 13px;
          color: #302820;
          white-space: nowrap;
        }

        .empty-items {
          padding: 20px;
          border: 1px dashed #ded5c9;
          border-radius: 7px;
          text-align: center;
          color: #81766a;
        }

        .empty-items p {
          margin: 0;
          font-size: 11px;
        }

        .payment-summary {
          display: grid;
          gap: 10px;
        }

        .payment-summary > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .payment-summary span {
          color: #81766a;
          font-size: 10px;
        }

        .payment-summary b {
          font-size: 11px;
          color: #302820;
          text-transform: capitalize;
        }

        .payment-summary strong {
          font-size: 13px;
          color: #302820;
        }

        .paid-amount {
          color: #397a52 !important;
        }

        .due-amount {
          color: #a25a43 !important;
        }

        .razorpay-id {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #eee6dc;
          display: grid;
          gap: 5px;
        }

        .razorpay-id span {
          color: #81766a;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .razorpay-id code {
          font-size: 9px;
          color: #755c3d;
          word-break: break-all;
          background: #faf7f2;
          padding: 6px;
          border-radius: 4px;
        }

        .shipping-summary {
          display: grid;
          gap: 10px;
        }

        .shipping-summary p {
          margin: 0;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .shipping-summary span {
          color: #81766a;
          font-size: 10px;
        }

        .shipping-summary b {
          font-size: 11px;
          color: #302820;
          text-align: right;
        }

        .tracking-button {
          display: inline-block;
          margin-top: 14px;
          padding: 9px 12px;
          border-radius: 6px;
          background: #755c3d;
          color: #fff !important;
          text-decoration: none !important;
          font-size: 11px !important;
        }

        .tracking-button:hover {
          background: #5e4931;
        }

        .order-modal-footer {
          display: flex;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e8dfd4;
          position: sticky;
          bottom: 0;
          background: #fffdf9;
        }

        @media (max-width: 900px) {
          .order-detail-grid {
            grid-template-columns: 1fr;
          }

          .detail-card-wide {
            grid-column: auto;
          }
        }

        @media (max-width: 700px) {
          .order-modal-backdrop {
            padding: 8px;
          }

          .order-modal {
            max-height: 95vh;
            border-radius: 9px;
          }

          .order-modal-header {
            padding: 16px;
          }

          .order-modal-header h2 {
            font-size: 18px;
          }

          .order-detail-grid {
            grid-template-columns: 1fr;
            padding: 12px;
            gap: 10px;
          }

          .detail-card-wide {
            grid-column: auto;
          }

          .detail-card {
            padding: 13px;
          }

          .order-item {
            align-items: flex-start;
            gap: 10px;
          }

          .order-item-image {
            width: 52px;
            height: 52px;
            flex-basis: 52px;
          }

          .order-item > strong {
            font-size: 11px;
          }

          .payment-summary > div {
            align-items: flex-start;
          }

          .shipping-summary p {
            align-items: flex-start;
          }

          .order-modal-footer {
            padding: 12px 16px;
          }
        }
      `}</style>
    </main>
  );
}