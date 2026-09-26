import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.tsx';
import { ProductImage } from '../components/product/ProductImage.tsx';
import { VariantPurchase } from '../components/product/VariantPurchase.tsx';
import { formatStorageLabel, startingPriceCents } from '../domain/catalogQuery.ts';
import { formatUsd } from '../domain/money.ts';
import { useStorefrontCatalog } from '../hooks/useStorefrontCatalog.ts';
import { useStore } from '../store/StoreContext.tsx';

export function WishlistPage({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const store = useStore();
  const { products, status } = useStorefrontCatalog();

  const items = store.wishlist
    .map((item) => products.find((product) => product.id === item.productId))
    .filter((product): product is NonNullable<typeof product> =>
      Boolean(product),
    );

  if (status === 'loading') {
    return (
      <main id="main">
        <p>Loading wishlist…</p>
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

  if (items.length === 0) {
    return (
      <main id="main">
        <Breadcrumbs
          items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]}
        />
        <div className="empty-state">
          <h1>Your wishlist is empty</h1>
          <p className="muted">Save a product from the shop to see it here.</p>
          <Link className="primary-button" to="/products">
            Shop Apple products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main">
      <Breadcrumbs
        items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]}
      />
      <h1>Wishlist</h1>
      <section className="cart-list">
        {items.map((product) => {
          const preview = product.variants[0];
          return (
            <article key={product.id} className="cart-line">
              <Link to={`/products/${product.slug}`}>
                <ProductImage
                  src={preview?.images[0] ?? '/images/products/fallback.svg'}
                  fallbacks={preview?.images.slice(1)}
                  alt={product.name}
                />
              </Link>
              <div className="cart-line-copy">
                <h2>
                  <Link to={`/products/${product.slug}`}>{product.name}</Link>
                </h2>
                <p>From {formatUsd(startingPriceCents(product))}</p>
                <p className="muted">{formatStorageLabel(product.spec)}</p>
                <VariantPurchase product={product} onFeedback={onFeedback} />
                <div className="action-row">
                  <Link
                    className="secondary-button"
                    to={`/products/${product.slug}`}
                  >
                    View product
                  </Link>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      void store.removeFromWishlist(product.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
