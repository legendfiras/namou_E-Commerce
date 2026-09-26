import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.tsx';
import { ProductImage } from '../components/product/ProductImage.tsx';
import { formatStorageLabel } from '../domain/catalogQuery.ts';
import { formatUsd } from '../domain/money.ts';
import { fetchOwnOrder } from '../services/orderService.ts';
import type { Order } from '../types/store.ts';

export function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'missing' | 'unauthorized' | 'error'
  >('loading');

  useEffect(() => {
    let active = true;
    if (!orderId) {
      setStatus('missing');
      return;
    }

    setStatus('loading');
    void fetchOwnOrder(orderId)
      .then((result) => {
        if (!active) {
          return;
        }
        if (!result.ok) {
          setOrder(null);
          setStatus(result.reason);
          return;
        }
        setOrder(result.order);
        setStatus('ready');
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  if (status === 'loading') {
    return (
      <main id="main">
        <p role="status">Loading your order…</p>
      </main>
    );
  }

  if (status === 'unauthorized') {
    return (
      <main id="main" className="empty-state">
        <h1>Sign in to view this order</h1>
        <p>Order details are available only to the account that placed it.</p>
        <Link
          className="primary-button"
          to={`/login?from=${encodeURIComponent(`/orders/${orderId ?? ''}`)}`}
        >
          Sign in
        </Link>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main id="main" className="empty-state">
        <h1>Order could not be loaded</h1>
        <p className="feedback-error">
          The order confirmation could not be loaded. If the order was placed,
          it is saved on this account.
        </p>
        <Link className="primary-button" to="/products">
          Continue shopping
        </Link>
      </main>
    );
  }

  if (status === 'missing' || !order) {
    return (
      <main id="main" className="empty-state">
        <h1>Order not found</h1>
        <p>That order is not available for this account.</p>
        <Link className="primary-button" to="/products">
          Continue shopping
        </Link>
      </main>
    );
  }

  const date = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(order.createdAt));

  return (
    <main id="main" className="order-confirmation">
      <Breadcrumbs
        items={[{ label: 'Home', to: '/' }, { label: `Order ${order.id}` }]}
      />
      <p className="product-kicker">Demo order</p>
      <h1>Thank you for choosing us.</h1>
      <p className="confirmation-lead">
        Your demo order was placed successfully.
      </p>
      <p>
        Order number <strong>{order.id}</strong>
      </p>
      <p className="muted">
        Status placed · {date}. No payment was charged.
      </p>
      <section className="cart-list" aria-label="Ordered items">
        {order.items.map((item) => (
          <article key={item.variantId} className="cart-line">
            <ProductImage
              src={item.image}
              alt={`${item.productName} ${item.color}`}
            />
            <div>
              <h2>{item.productName}</h2>
              <p className="muted">
                {item.color} · {formatStorageLabel(item.storage)} · Qty{' '}
                {item.quantity}
              </p>
              <p>{formatUsd(item.unitPriceCents)}</p>
            </div>
            <p>{formatUsd(item.unitPriceCents * item.quantity)}</p>
          </article>
        ))}
      </section>
      <p className="confirmation-total">
        <strong>Total {formatUsd(order.totalCents)}</strong>
      </p>
      <Link className="primary-button" to="/products">
        Continue shopping
      </Link>
    </main>
  );
}
