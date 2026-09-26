import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AvailabilityNotice } from '../components/layout/AvailabilityNotice.tsx';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.tsx';
import { ColorPicker } from '../components/product/ColorPicker.tsx';
import { ProductCard } from '../components/product/ProductCard.tsx';
import { ProductImage } from '../components/product/ProductImage.tsx';
import {
  categoryLabel,
  formatStorageLabel,
  uniqueColors,
} from '../domain/catalogQuery.ts';
import { formatUsd } from '../domain/money.ts';
import { useStorefrontCatalog } from '../hooks/useStorefrontCatalog.ts';
import { savePendingAction } from '../store/pendingAction.ts';
import { useStore } from '../store/StoreContext.tsx';
import type { ProductVariant } from '../types/store.ts';

export function ProductDetailPage({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore();
  const { products } = useStorefrontCatalog();
  const product = useMemo(
    () => products.find((item) => item.slug === slug) ?? null,
    [products, slug],
  );
  const related = useMemo(() => {
    if (!product) {
      return [];
    }
    return products
      .filter(
        (item) => item.category === product.category && item.id !== product.id,
      )
      .slice(0, 4);
  }, [product, products]);
  const [color, setColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const stockKnown = store.stockStatus === 'ready';

  const activeColor =
    product?.variants.some((variant) => variant.colorSlug === color)
      ? color
      : (product?.variants[0]?.colorSlug ?? '');

  const selected = useMemo(() => {
    return product?.variants.find(
      (variant) => variant.colorSlug === activeColor,
    );
  }, [activeColor, product]);

  const colors = product ? uniqueColors(product) : [];
  const selectedImage =
    selected?.images[0] ??
    colors.find((variant) => variant.colorSlug === color)?.images[0] ??
    '/images/products/fallback.svg';
  const fallbacks = selected?.images.slice(1) ?? [];

  const stock = stockKnown && selected ? store.stockFor(selected.id) : 0;

  useEffect(() => {
    if (stock > 0 && quantity > stock) {
      setQuantity(stock);
    }
  }, [quantity, stock]);

  const returnToLogin = () => {
    navigate(
      `/login?from=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
    );
  };

  const addToCart = async () => {
    if (!product || !selected) {
      return;
    }
    if (store.authStatus === 'loading') {
      onFeedback('Checking your account…');
      return;
    }
    if (store.authStatus === 'error') {
      onFeedback(
        'We could not confirm your account. Try again before adding this item.',
      );
      return;
    }
    if (!stockKnown || stock <= 0 || quantity > stock) {
      onFeedback(
        stockKnown && stock <= 0
          ? `${product.name} in ${selected.color} is out of stock.`
          : 'Availability is still being checked.',
      );
      return;
    }
    if (!store.session) {
      savePendingAction({
        type: 'add-to-cart',
        productId: product.id,
        variantId: selected.id,
        productName: product.name,
        color: selected.color,
        quantity,
      });
      returnToLogin();
      return;
    }
    setBusy(true);
    const result = await store.addToCart(product.id, selected.id, quantity);
    setBusy(false);
    onFeedback(result.ok ? `${product.name} added to cart.` : result.message);
  };

  const addToWishlist = async () => {
    if (!product) {
      return;
    }
    if (store.authStatus === 'loading') {
      onFeedback('Checking your account…');
      return;
    }
    if (store.authStatus === 'error') {
      onFeedback(
        'We could not confirm your account. Try again before saving this item.',
      );
      return;
    }
    if (!store.session) {
      savePendingAction({
        type: 'add-to-wishlist',
        productId: product.id,
        productName: product.name,
      });
      returnToLogin();
      return;
    }
    setBusy(true);
    const result = await store.toggleWishlist(product.id);
    setBusy(false);
    onFeedback(
      result.added
        ? `${product.name} saved to your wishlist.`
        : `${product.name} removed from your wishlist.`,
    );
  };

  if (!product) {
    return (
      <main id="main">
        <h1>Product not found</h1>
        <p>That item is not in the catalog.</p>
        <Link className="secondary-button" to="/products">
          Continue shopping
        </Link>
      </main>
    );
  }

  return (
    <main id="main">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Shop', to: '/products' },
          {
            label: categoryLabel(product.category),
            to: `/products?category=${product.category}`,
          },
          { label: product.name },
        ]}
      />
      <AvailabilityNotice />
      <div className="pdp">
        <section className="gallery" aria-label="Product images">
          <div className="gallery-main">
            <ProductImage
              src={selectedImage}
              fallbacks={fallbacks}
              alt={`${product.name} in ${selected?.color ?? 'selected color'}`}
              priority
            />
          </div>
        </section>
        <section className="purchase">
          <p className="product-kicker">{categoryLabel(product.category)}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <p className="price">
            {selected ? formatUsd(selected.priceCents) : 'Select a color'}
          </p>
          <p className="muted">{formatStorageLabel(product.spec)}</p>
          <ColorPicker
            options={colors}
            value={activeColor}
            onChange={setColor}
            unavailable={(colorSlug) =>
              stockKnown &&
              !product.variants.some(
                (variant) =>
                  variant.colorSlug === colorSlug &&
                  store.stockFor(variant.id) > 0,
              )
            }
          />
          {selected ? (
            <p className={stockKnown && stock <= 3 ? 'status-warn' : 'muted'}>
              {!stockKnown
                ? store.stockStatus === 'error'
                  ? 'Availability unavailable'
                  : 'Checking availability'
                : stock === 0
                  ? 'Out of stock'
                  : stock <= 3
                    ? `${stock} left`
                    : `${stock} in stock`}
            </p>
          ) : (
            <p className="muted">That color is not offered.</p>
          )}
          <div className="qty-row">
            <label htmlFor="qty">Quantity</label>
            <input
              id="qty"
              type="number"
              min={1}
              max={Math.max(stock, 1)}
              step={1}
              value={quantity}
              disabled={!stockKnown || stock === 0}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isInteger(next) || next < 1) {
                  setQuantity(1);
                  return;
                }
                setQuantity(stock > 0 ? Math.min(next, stock) : 1);
              }}
            />
          </div>
          <div className="action-row">
            <button
              type="button"
              className="primary-button"
              disabled={
                store.authStatus === 'loading' ||
                !stockKnown ||
                !selected ||
                stock === 0 ||
                quantity > stock ||
                busy
              }
              onClick={() => void addToCart()}
            >
              {!stockKnown
                ? store.stockStatus === 'error'
                  ? 'Unavailable'
                  : 'Checking availability'
                : stock === 0
                  ? 'Out of stock'
                  : 'Add to cart'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy || store.authStatus === 'loading'}
              onClick={() => void addToWishlist()}
            >
              {store.isWishlisted(product.id)
                ? 'Remove from wishlist'
                : 'Add to wishlist'}
            </button>
          </div>
        </section>
      </div>
      <div className="sticky-buy">
        <button
          type="button"
          className="primary-button"
          disabled={
            store.authStatus === 'loading' ||
            !stockKnown ||
            !selected ||
            stock === 0 ||
            quantity > stock ||
            busy
          }
          onClick={() => void addToCart()}
        >
          {!stockKnown
            ? store.stockStatus === 'error'
              ? 'Unavailable'
              : 'Checking availability'
            : stock === 0
              ? 'Out of stock'
              : 'Add to cart'}
        </button>
      </div>
      {related.length > 0 ? (
        <section>
          <div className="section-heading">
            <h2>You may also like</h2>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onFeedback={onFeedback}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export type { ProductVariant };
