import { useEffect, useState } from 'react';

type ProductImageProps = {
  src: string;
  alt: string;
  fallbacks?: string[];
  priority?: boolean;
};

export function ProductImage({
  src,
  alt,
  fallbacks = [],
  priority = false,
}: ProductImageProps) {
  const chain = [src, ...fallbacks, '/images/products/fallback.svg'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [src]);

  return (
    <img
      className="product-photo"
      src={chain[Math.min(index, chain.length - 1)]}
      alt={alt}
      width={800}
      height={800}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        setIndex((current) =>
          current < chain.length - 1 ? current + 1 : current,
        );
      }}
    />
  );
}
