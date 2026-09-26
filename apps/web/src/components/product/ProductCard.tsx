import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  categoryLabel,
  formatStorageLabel,
  startingPriceCents,
} from '../../domain/catalogQuery.ts';
import { formatUsd } from '../../domain/money.ts';
import { savePendingAction } from '../../store/pendingAction.ts';
import { useStore } from '../../store/StoreContext.tsx';
import type { Product } from '../../types/store.ts';
import { ProductImage } from './ProductImage.tsx';
import { VariantPurchase } from './VariantPurchase.tsx';

type ProductCardProps = {
  product: Product;
  priority?: boolean;
  onFeedback: (message: string) => void;
};

export function ProductCard({
  product,
  priority = false,
  onFeedback,
}: ProductCardProps) {
  const { isWishlisted, toggleWishlist, authStatus, session } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const accountReady = authStatus === 'ready';
  const saved = accountReady && !!session && isWishlisted(product.id);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview =
    product.variants.find((variant) => variant.id === previewId) ?? null;
  const image =
    preview?.images[0] ??
    product.variants[0]?.images[0] ??
    '/images/products/fallback.svg';
  const fallbacks = preview?.images.slice(1) ?? product.variants[0]?.images.slice(1) ?? [];
  const onPreview = useCallback((variantId: string | null) => {
    setPreviewId(variantId);
  }, []);

  return (
    <article className="product-tile">
      <div className="product-card-media">
        <Link to={`/products/${product.slug}`} className="product-card">
          <ProductImage
            src={image}
            fallbacks={fallbacks}
            alt={
              preview
                ? `${product.name} in ${preview.color}`
                : product.name
            }
            priority={priority}
          />
        </Link>
        <button
          type="button"
          className="icon-button wishlist-button"
          aria-pressed={saved}
          disabled={authStatus === 'loading'}
          aria-label={
            authStatus === 'loading'
              ? `Wishlist for ${product.name} is unavailable until your account is checked`
              : saved
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
          }
          onClick={() => {
            if (authStatus === 'loading') {
              return;
            }
            if (authStatus === 'error') {
              onFeedback(
                'We could not confirm your account. Try again before saving this item.',
              );
              return;
            }
            if (!session) {
              savePendingAction({
                type: 'add-to-wishlist',
                productId: product.id,
                productName: product.name,
              });
              navigate(
                `/login?from=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
              );
              return;
            }
            void toggleWishlist(product.id).then((result) => {
              onFeedback(
                result.added
                  ? `${product.name} saved to your wishlist.`
                  : `${product.name} removed from your wishlist.`,
              );
            });
          }}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>
      <div className="product-tile-body">
        <Link to={`/products/${product.slug}`} className="product-card">
          <p className="product-kicker">{categoryLabel(product.category)}</p>
          <h3>{product.name}</h3>
          <p className="product-meta">
            From {formatUsd(startingPriceCents(product))}
          </p>
          <p className="product-meta">{formatStorageLabel(product.spec)}</p>
        </Link>
        <VariantPurchase
          product={product}
          onFeedback={onFeedback}
          onPreview={onPreview}
        />
      </div>
    </article>
  );
}
