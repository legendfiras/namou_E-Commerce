import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  categoryLabel,
  formatStorageLabel,
  startingPriceCents,
} from '../../domain/catalogQuery.ts';
import { formatUsd } from '../../domain/money.ts';
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
  const { isWishlisted, toggleWishlist } = useStore();
  const saved = isWishlisted(product.id);
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
          aria-label={
            saved
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          onClick={() => {
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
