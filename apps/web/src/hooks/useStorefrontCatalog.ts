import { useEffect, useState } from 'react';
import { loadStorefrontCatalog } from '../services/catalogService.ts';
import { useStore } from '../store/StoreContext.tsx';
import type { Product } from '../types/store.ts';

export function useStorefrontCatalog(): {
  products: Product[];
  status: 'loading' | 'ready' | 'error';
} {
  const { catalogVersion } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
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
        if (active) {
          setProducts([]);
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [catalogVersion]);

  return { products, status };
}
