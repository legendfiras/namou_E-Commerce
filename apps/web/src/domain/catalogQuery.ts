import {
  PRODUCT_STORAGE,
  type CatalogQuery,
  type Product,
  type ProductCategory,
} from '../types/store.ts';

export function startingPriceCents(product: Product): number {
  return Math.min(...product.variants.map((variant) => variant.priceCents));
}

export function uniqueColors(product: Product) {
  const seen = new Set<string>();
  return product.variants.filter((variant) => {
    if (seen.has(variant.colorSlug)) {
      return false;
    }
    seen.add(variant.colorSlug);
    return true;
  });
}

export function formatStorageLabel(storage: string = PRODUCT_STORAGE): string {
  if (storage === '256GB' || storage === '256 GB') {
    return '256 GB';
  }
  if (storage === '128GB') {
    return '128 GB';
  }
  if (storage === '512GB') {
    return '512 GB';
  }
  if (storage === '1TB') {
    return '1 TB';
  }
  return storage;
}

export function categoryLabel(category: ProductCategory): string {
  switch (category) {
    case 'iphone':
      return 'iPhone';
    case 'airpods':
      return 'AirPods';
    case 'mac':
      return 'Mac';
    case 'ipad':
      return 'iPad';
    default:
      return category;
  }
}

export function filterProducts(
  products: Product[],
  query: CatalogQuery,
): Product[] {
  const search = query.q?.trim().toLowerCase() ?? '';

  const filtered = products.filter((product) => {
    const matchesSearch =
      search.length === 0 ||
      product.name.toLowerCase().includes(search) ||
      product.category.includes(search);
    const matchesCategory =
      !query.category || product.category === query.category;
    const matchesFamily =
      !query.family?.length || query.family.includes(product.family);
    const matchesSeries = !query.series || product.series === query.series;

    return matchesSearch && matchesCategory && matchesFamily && matchesSeries;
  });

  const sorted = [...filtered];
  switch (query.sort) {
    case 'price-desc':
      sorted.sort((a, b) => startingPriceCents(b) - startingPriceCents(a));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'price-asc':
    default:
      sorted.sort((a, b) => startingPriceCents(a) - startingPriceCents(b));
  }

  return sorted;
}

export type SearchSuggestion = {
  product: Product;
  image: string;
  detail: string;
  priceCents: number;
  pricedFrom: boolean;
};

export function suggestProducts(
  products: Product[],
  rawQuery: string,
  limit = 6,
): SearchSuggestion[] {
  const search = rawQuery.trim().toLowerCase();
  if (!search) {
    return [];
  }

  const ranked = products.flatMap((product) => {
    const name = product.name.toLowerCase();
    const categoryName = categoryLabel(product.category).toLowerCase();
    const colorMatch = product.variants.find((variant) =>
      variant.color.toLowerCase().includes(search),
    );
    const specMatch = product.spec.toLowerCase().includes(search);

    let score = 0;
    if (name.startsWith(search)) {
      score = 100;
    } else if (name.includes(search)) {
      score = 80;
    } else if (
      categoryName.includes(search) ||
      product.category.includes(search)
    ) {
      score = 60;
    } else if (colorMatch) {
      score = 50;
    } else if (specMatch) {
      score = 40;
    }

    if (score === 0) {
      return [];
    }

    const variant = colorMatch ?? product.variants[0];
    const detail = colorMatch
      ? `${colorMatch.color} · ${formatStorageLabel(colorMatch.storage)}`
      : `${categoryLabel(product.category)} · ${formatStorageLabel(variant?.storage)}`;

    return [
      {
        product,
        image: variant?.images[0] ?? '',
        detail,
        priceCents: variant?.priceCents ?? startingPriceCents(product),
        pricedFrom: !colorMatch,
        score,
      },
    ];
  });

  ranked.sort(
    (a, b) =>
      b.score - a.score || a.product.name.localeCompare(b.product.name),
  );

  return ranked.slice(0, limit).map(
    ({ product, image, detail, priceCents, pricedFrom }) => ({
      product,
      image,
      detail,
      priceCents,
      pricedFrom,
    }),
  );
}

export function parseCatalogSearchParams(
  params: URLSearchParams,
): CatalogQuery {
  const families = params.getAll('family').filter(isFamily);
  const series = params.get('series');
  const sort = params.get('sort');
  const category = params.get('category');

  return {
    q: params.get('q') ?? undefined,
    category: isCategory(category) ? category : undefined,
    family: families.length ? families : undefined,
    series: series === 'pro' || series === 'everyday' ? series : undefined,
    sort:
      sort === 'price-asc' ||
      sort === 'price-desc' ||
      sort === 'name-asc' ||
      sort === 'name-desc'
        ? sort
        : undefined,
  };
}

function isCategory(value: string | null): value is ProductCategory {
  return (
    value === 'iphone' ||
    value === 'airpods' ||
    value === 'mac' ||
    value === 'ipad'
  );
}

function isFamily(
  value: string,
): value is NonNullable<CatalogQuery['family']>[number] {
  return (
    value === '13' ||
    value === '14' ||
    value === '15' ||
    value === '16' ||
    value === 'audio' ||
    value === 'laptop' ||
    value === 'tablet'
  );
}
