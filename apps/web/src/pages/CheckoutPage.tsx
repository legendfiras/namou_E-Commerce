import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AvailabilityNotice,
  confirmedStockText,
} from '../components/layout/AvailabilityNotice.tsx';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.tsx';
import { ProductImage } from '../components/product/ProductImage.tsx';
import { findProduct, findVariant } from '../domain/checkout.ts';
import { formatStorageLabel } from '../domain/catalogQuery.ts';
import { formatUsd } from '../domain/money.ts';
import { useStorefrontCatalog } from '../hooks/useStorefrontCatalog.ts';
import { useStore } from '../store/StoreContext.tsx';

export function CheckoutPage({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const store = useStore();
  const navigate = useNavigate();
  const { products } = useStorefrontCatalog();
  const stockKnown = store.stockStatus === 'ready';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = store.cart
    .map((item) => {
      const product = findProduct(products, item.productId);
      const variant = product
        ? findVariant(product, item.variantId)
        : undefined;
      if (!product || !variant) {
        return null;
      }
      return { item, product, variant };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  const total = lines.reduce(
    (sum, line) => sum + line.variant.priceCents * line.item.quantity,
    0,
  );
  const empty = lines.length === 0;
  const overStock =
    stockKnown &&
    lines.some((line) => line.item.quantity > store.stockFor(line.variant.id));

  return (
    <main id="main">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Cart', to: '/cart' },
          { label: 'Checkout' },
        ]}
      />
      <h1>Checkout</h1>
      <AvailabilityNotice />
      <p className="notice-box">
        Demo checkout. Placing this order records it for your account and does
        not charge a payment.
      </p>
      {empty ? (
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <Link className="primary-button" to="/products">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="checkout-grid">
          <section className="cart-list">
            {lines.map(({ item, product, variant }) => (
              <article key={item.variantId} className="cart-line">
                <ProductImage
                  src={variant.images[0] ?? '/images/products/fallback.svg'}
                  fallbacks={variant.images.slice(1)}
                  alt={`${product.name} ${variant.color}`}
                />
                <div className="cart-line-copy">
                  <div className="cart-line-head">
                    <h2>{product.name}</h2>
                    <p className="cart-line-total">
                      {formatUsd(variant.priceCents * item.quantity)}
                    </p>
                  </div>
                  <p className="muted">
                    {variant.color} · {formatStorageLabel(variant.storage)} ·
                    Qty {item.quantity}
                  </p>
                  <p
                    className={
                      stockKnown && store.stockFor(variant.id) < item.quantity
                        ? 'feedback-error'
                        : 'muted'
                    }
                  >
                    {confirmedStockText(
                      store.stockStatus,
                      store.stockFor(variant.id),
                      (stock) =>
                        stock === 0 ? 'Out of stock' : `${stock} available`,
                    )}
                  </p>
                </div>
              </article>
            ))}
          </section>
          <aside className="summary-card">
            <div className="summary-row">
              <strong>Total</strong>
              <strong>{formatUsd(total)}</strong>
            </div>
            {error ? (
              <p className="feedback-error" role="alert">
                {error} Your cart is still here so you can change it.
              </p>
            ) : null}
            {overStock ? (
              <p className="feedback-error" role="status">
                Reduce quantities to the stock shown before placing the order.
              </p>
            ) : null}
            <button
              type="button"
              className="primary-button"
              disabled={empty || busy || overStock || !stockKnown}
              onClick={() => {
                setBusy(true);
                setError(null);
                void store.checkout().then((result) => {
                  setBusy(false);
                  if (!result.ok) {
                    setError(result.message);
                    onFeedback(result.message);
                    return;
                  }
                  navigate(`/orders/${result.order.id}`);
                });
              }}
            >
              {busy
                ? 'Placing demo order…'
                : !stockKnown
                  ? 'Checking availability'
                  : 'Place demo order'}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
