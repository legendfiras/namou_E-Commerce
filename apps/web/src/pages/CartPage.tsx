import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  const { session } = store;
  const { products, status } = useStorefrontCatalog();
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

  if (status === 'loading') {
    return (
      <main id="main">
        <p>Loading cart…</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main id="main">
        <p className="feedback-error">The catalog could not be loaded.</p>
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
                  <p className={store.stockFor(variant.id) <= 3 ? 'status-warn' : 'muted'}>
                    {store.stockFor(variant.id) === 0
                      ? 'Out of stock'
                      : `${store.stockFor(variant.id)} in stock`}
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
                      max={Math.max(store.stockFor(variant.id), 1)}
                      step={1}
                      value={item.quantity}
                      disabled={
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
