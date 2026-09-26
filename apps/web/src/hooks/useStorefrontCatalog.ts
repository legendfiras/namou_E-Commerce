import { useEffect, useState } from 'react';
import { getTemporaryCatalog } from '../data/catalog.ts';
import { loadStorefrontCatalog } from '../services/catalogService.ts';
import { useStore } from '../store/StoreContext.tsx';
import type { Product } from '../types/store.ts';

export function useStorefrontCatalog(): {
  products: Product[];
  status: 'preview' | 'ready' | 'error';
} {
  const { catalogVersion } = useStore();
  const [products, setProducts] = useState<Product[]>(() =>
    getTemporaryCatalog(),
  );
  const [status, setStatus] = useState<'preview' | 'ready' | 'error'>(
    'preview',
  );

  useEffect(() => {
    let active = true;
    void loadStorefrontCatalog()
      .then((result) => {
        if (!active) {
          return;
        }
        setProducts(result);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setProducts((current) =>
          current.length > 0 ? current : getTemporaryCatalog(),
        );
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [catalogVersion]);

  return { products, status };
}
