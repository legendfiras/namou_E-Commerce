import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AvailabilityNotice } from '../components/layout/AvailabilityNotice.tsx';
import { ProductCard } from '../components/product/ProductCard.tsx';
import { featuredProductSlugs } from '../data/catalog.ts';
import { useStorefrontCatalog } from '../hooks/useStorefrontCatalog.ts';

export function HomePage({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const { products: catalog } = useStorefrontCatalog();
  const products = useMemo(
    () =>
      featuredProductSlugs.flatMap((slug) => {
        const product = catalog.find((item) => item.slug === slug);
        return product ? [product] : [];
      }),
    [catalog],
  );

  return (
    <main id="main">
      <section className="hero">
        <div>
          <p className="muted">Firas Cell</p>
          <h1>Apple products, chosen with care.</h1>
          <p>
            Shop iPhone, AirPods, Mac, and iPad. Compare finishes, pick a color,
            and check out when you are ready.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/products">
              Shop all
            </Link>
            <Link className="secondary-button" to="/products?category=iphone">
              Browse iPhone
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>Featured</h2>
          <Link to="/products">View all</Link>
        </div>
        <AvailabilityNotice />
        {products.length === 0 ? (
          <div className="empty-state">
            <p>No featured products are available right now.</p>
            <Link className="secondary-button" to="/products">
              Browse the shop
            </Link>
          </div>
        ) : null}
        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index === 0}
                onFeedback={onFeedback}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="collection-panels">
        <Link className="collection-panel" to="/products?category=iphone">
          <h2>iPhone</h2>
          <p className="muted">From iPhone 13 through iPhone 16 Pro.</p>
        </Link>
        <Link className="collection-panel" to="/products?category=airpods">
          <h2>AirPods</h2>
          <p className="muted">AirPods 4, AirPods Pro, and AirPods Max.</p>
        </Link>
        <Link className="collection-panel" to="/products?category=mac">
          <h2>Mac</h2>
          <p className="muted">MacBook Air 13" and 15".</p>
        </Link>
        <Link className="collection-panel" to="/products?category=ipad">
          <h2>iPad</h2>
          <p className="muted">iPad Pro 11".</p>
        </Link>
      </section>
    </main>
  );
}
