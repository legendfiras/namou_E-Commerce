import {
  PRODUCT_CATEGORIES,
  PRODUCT_FAMILIES,
  PRODUCT_SERIES,
  type ProductCategory,
  type ProductFamily,
  type ProductSeries,
  type PublicProduct,
} from '../models/product';

export type CatalogQuery = {
  q?: string;
  category?: ProductCategory;
  family?: ProductFamily[];
  series?: ProductSeries;
  sort?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';
};

export function startingPriceCents(product: PublicProduct): number {
  return Math.min(...product.variants.map((variant) => variant.priceCents));
}

export function isCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

export function isFamily(value: string): value is ProductFamily {
  return (PRODUCT_FAMILIES as readonly string[]).includes(value);
}

export function isSeries(value: string): value is ProductSeries {
  return (PRODUCT_SERIES as readonly string[]).includes(value);
}

export function isProductSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

function asStringList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => asStringList(entry));
  }
  return [];
}

export function parseCatalogQuery(query: object): CatalogQuery {
  const record = query as Record<string, unknown>;
  const families = asStringList(record.family).filter(isFamily);
  const series = asString(record.series);
  const sort = asString(record.sort);
  const category = asString(record.category);
  const search = asString(record.q)?.trim();

  return {
    q: search ? search : undefined,
    category: category && isCategory(category) ? category : undefined,
    family: families.length ? families : undefined,
    series: series && isSeries(series) ? series : undefined,
    sort:
      sort === 'price-asc' ||
      sort === 'price-desc' ||
      sort === 'name-asc' ||
      sort === 'name-desc'
        ? sort
        : undefined,
  };
}

export function filterProducts(
  products: PublicProduct[],
  query: CatalogQuery,
): PublicProduct[] {
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
