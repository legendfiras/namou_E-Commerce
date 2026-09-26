import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AvailabilityNotice,
  confirmedStockText,
} from '../components/layout/AvailabilityNotice.tsx';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.tsx';
import { ColorPicker } from '../components/product/ColorPicker.tsx';
import { ProductImage } from '../components/product/ProductImage.tsx';
import { findProduct, findVariant } from '../domain/checkout.ts';
import { formatStorageLabel, uniqueColors } from '../domain/catalogQuery.ts';
import { formatUsd } from '../domain/money.ts';
import { useStorefrontCatalog } from '../hooks/useStorefrontCatalog.ts';
import { useStore } from '../store/StoreContext.tsx';

export function CartPage({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const store = useStore();
  const { session, authStatus, stockStatus, retryStorefront } = store;
  const { products } = useStorefrontCatalog();
  const stockKnown = stockStatus === 'ready';
  const [busyId, setBusyId] = useState<string | null>(null);

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

  if (authStatus === 'loading') {
    return (
      <main id="main">
        <h1>Cart</h1>
        <p className="status-panel" role="status">
          Checking your saved cart…
        </p>
      </main>
    );
  }

  if (authStatus === 'error') {
    return (
      <main id="main" className="empty-state">
        <h1>Cart</h1>
        <p>Your saved cart could not be loaded.</p>
        <button
          type="button"
          className="primary-button"
          onClick={retryStorefront}
        >
          Try again
        </button>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main id="main">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
        <div className="empty-state">
          <h1>Your cart is empty</h1>
          <p className="muted">
            Add something from the shop to start checkout.
          </p>
          <Link className="primary-button" to="/products">
            Shop Apple products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1>Cart</h1>
      <AvailabilityNotice />
      <div className="checkout-grid">
        <section className="cart-list">
          {lines.map(({ item, product, variant }) => {
            const colors = uniqueColors(product);
            return (
              <article key={item.variantId} className="cart-line">
                <ProductImage
                  src={variant.images[0] ?? '/images/products/fallback.svg'}
                  fallbacks={variant.images.slice(1)}
                  alt={`${product.name} ${variant.color}`}
                />
                <div>
                  <h2>{product.name}</h2>
                  <p className="muted">
                    {variant.color} · {formatStorageLabel(variant.storage)}
                  </p>
                  <p className={stockKnown && store.stockFor(variant.id) <= 3 ? 'status-warn' : 'muted'}>
                    {confirmedStockText(
                      stockStatus,
                      store.stockFor(variant.id),
                      (stock) =>
                        stock === 0 ? 'Out of stock' : `${stock} in stock`,
                    )}
                  </p>
                  <p>{formatUsd(variant.priceCents)}</p>
                  {colors.length > 1 ? (
                    <ColorPicker
                      options={colors}
                      value={variant.colorSlug}
                      onChange={(colorSlug) => {
                        const next = product.variants.find(
                          (option) => option.colorSlug === colorSlug,
                        );
                        if (!next || busyId === item.variantId) {
                          return;
                        }
                        setBusyId(item.variantId);
                        void store
                          .changeVariant(item.variantId, next.id, product.id)
                          .then((result) => {
                            setBusyId(null);
                            if (!result.ok) {
                              onFeedback(result.message);
                            }
                          });
                      }}
                      unavailable={(colorSlug) => {
                        if (!stockKnown) {
                          return false;
                        }
                        const option = product.variants.find(
                          (candidate) => candidate.colorSlug === colorSlug,
                        );
                        return !option || store.stockFor(option.id) <= 0;
                      }}
                    />
                  ) : null}
                  <label className="field">
                    Quantity
                    <input
                      type="number"
                      min={1}
                      max={Math.max(stockKnown ? store.stockFor(variant.id) : item.quantity, 1)}
                      step={1}
                      value={item.quantity}
                      disabled={
                        !stockKnown ||
                        busyId === item.variantId ||
                        store.stockFor(variant.id) === 0
                      }
                      onChange={(event) => {
                        setBusyId(item.variantId);
                        void store
                          .updateQuantity(
                            item.variantId,
                            Number(event.target.value),
                          )
                          .then((result) => {
                            setBusyId(null);
                            if (!result.ok) {
                              onFeedback(result.message);
                            }
                          });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      void store.removeFromCart(item.variantId);
                    }}
                  >
                    Remove
                  </button>
                </div>
                <p>{formatUsd(variant.priceCents * item.quantity)}</p>
              </article>
            );
          })}
        </section>
        <aside className="summary-card">
          <h2>Order summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatUsd(total)}</span>
          </div>
          {session ? (
            <Link className="primary-button" to="/checkout">
              Checkout
            </Link>
          ) : (
            <Link className="primary-button" to="/login?from=%2Fcheckout">
              Sign in to check out
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
