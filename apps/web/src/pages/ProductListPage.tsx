import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/product/ProductCard.tsx';
import { SearchField } from '../components/search/SearchField.tsx';
import {
  categoryLabel,
  parseCatalogSearchParams,
} from '../domain/catalogQuery.ts';
import { listProducts } from '../services/catalogService.ts';
import type { Product, ProductCategory } from '../types/store.ts';

const categories: ProductCategory[] = ['iphone', 'airpods', 'mac', 'ipad'];

export function ProductListPage({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const queryKey = params.toString();
  const query = useMemo(
    () => parseCatalogSearchParams(new URLSearchParams(queryKey)),
    [queryKey],
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    let active = true;
    setStatus('loading');
    void listProducts(query)
      .then((result) => {
        if (!active) {
          return;
        }
        setProducts(result);
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
  }, [query]);

  const setList = (next: URLSearchParams) => {
    next.delete('storage');
    setParams(next, { replace: true });
  };

  const setCategory = (category: ProductCategory | '') => {
    const next = new URLSearchParams(params);
    if (category) {
      next.set('category', category);
    } else {
      next.delete('category');
    }
    setList(next);
  };

  const clearAll = () => {
    setList(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(query.q || query.category || query.series);

  return (
    <main id="main">
      <h1>Shop</h1>
      <p className="muted shop-lede">
        iPhone, AirPods, Mac, and iPad. Choose a color and add it to your cart.
      </p>

      <div className="shop-toolbar">
        <div className="category-pills" role="group" aria-label="Category">
          <button
            type="button"
            className={`category-pill${!query.category ? ' is-active' : ''}`}
            aria-pressed={!query.category}
            onClick={() => setCategory('')}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`category-pill${query.category === category ? ' is-active' : ''}`}
              aria-pressed={query.category === category}
              onClick={() => setCategory(category)}
            >
              {categoryLabel(category)}
            </button>
          ))}
        </div>
        <div className="shop-toolbar-controls">
          <div className="shop-search">
            <SearchField
              id="shop-search"
              label="Search products"
              value={query.q ?? ''}
              onChange={(value) => {
                const next = new URLSearchParams(params);
                if (value) {
                  next.set('q', value);
                } else {
                  next.delete('q');
                }
                setList(next);
              }}
              onPick={(product) => navigate(`/products/${product.slug}`)}
              onSearch={(value) => {
                const next = new URLSearchParams(params);
                next.set('q', value);
                setList(next);
              }}
            />
          </div>
          <label className="shop-sort">
            <span className="visually-hidden">Sort</span>
            <select
              value={query.sort ?? 'price-asc'}
              onChange={(event) => {
                const next = new URLSearchParams(params);
                next.set('sort', event.target.value);
                setList(next);
              }}
            >
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="name-asc">Name, A to Z</option>
              <option value="name-desc">Name, Z to A</option>
            </select>
          </label>
        </div>
      </div>

      <div className="listing-toolbar">
        <p>{status === 'ready' ? `${products.length} results` : ' '}</p>
        {hasActiveFilters ? (
          <button type="button" className="ghost-button" onClick={clearAll}>
            Clear filters
          </button>
        ) : null}
      </div>

      <section>
        {status === 'loading' ? <p>Loading products…</p> : null}
        {status === 'error' ? (
          <p className="feedback-error">The catalog could not be loaded.</p>
        ) : null}
        {status === 'ready' && products.length === 0 ? (
          <div className="empty-state">
            <h2>No products match those filters</h2>
            <p className="muted">Try another category or clear search.</p>
            <button
              type="button"
              className="secondary-button"
              onClick={clearAll}
            >
              Clear filters
            </button>
          </div>
        ) : null}
        {status === 'ready' && products.length > 0 ? (
          <div className="product-grid catalog-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onFeedback={onFeedback}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
