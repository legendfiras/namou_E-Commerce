import { featuredProductSlugs } from '../data/catalog.ts';
import { productPhotoList } from '../lib/images.ts';
import { filterProducts } from '../domain/catalogQuery.ts';
import type {
  CatalogQuery,
  Product,
  ProductCategory,
  ProductFamily,
  ProductSeries,
  ProductVariant,
} from '../types/store.ts';
import { mockCatalogGate } from './mockRuntime.ts';

const CATEGORIES = new Set<ProductCategory>([
  'iphone',
  'airpods',
  'mac',
  'ipad',
]);
const FAMILIES = new Set<ProductFamily>([
  '13',
  '14',
  '15',
  '16',
  'audio',
  'laptop',
  'tablet',
]);
const SERIES = new Set<ProductSeries>(['everyday', 'pro']);

let storefrontCatalog: Product[] | null = null;
let storefrontRequest: Promise<Product[]> | null = null;

function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === 'string' && CATEGORIES.has(value as ProductCategory);
}

function isProductFamily(value: unknown): value is ProductFamily {
  return typeof value === 'string' && FAMILIES.has(value as ProductFamily);
}

function isProductSeries(value: unknown): value is ProductSeries {
  return typeof value === 'string' && SERIES.has(value as ProductSeries);
}

function isImageList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((image) => typeof image === 'string' && image.trim().length > 0)
  );
}

function isVariant(value: unknown): value is ProductVariant {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const variant = value as Record<string, unknown>;
  return (
    typeof variant.id === 'string' &&
    variant.id.length > 0 &&
    typeof variant.color === 'string' &&
    variant.color.length > 0 &&
    typeof variant.colorSlug === 'string' &&
    variant.colorSlug.length > 0 &&
    typeof variant.colorHex === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(variant.colorHex) &&
    typeof variant.storage === 'string' &&
    variant.storage.length > 0 &&
    typeof variant.priceCents === 'number' &&
    Number.isInteger(variant.priceCents) &&
    variant.priceCents > 0 &&
    typeof variant.stock === 'number' &&
    Number.isInteger(variant.stock) &&
    variant.stock >= 0 &&
    isImageList(variant.images)
  );
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const product = value as Record<string, unknown>;
  return (
    typeof product.id === 'string' &&
    product.id.length > 0 &&
    typeof product.slug === 'string' &&
    product.slug.length > 0 &&
    typeof product.name === 'string' &&
    product.name.length > 0 &&
    isProductCategory(product.category) &&
    isProductFamily(product.family) &&
    isProductSeries(product.series) &&
    typeof product.spec === 'string' &&
    typeof product.description === 'string' &&
    Array.isArray(product.variants) &&
    product.variants.length > 0 &&
    product.variants.every(isVariant)
  );
}

function copyProduct(product: Product): Product {
  return {
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      images: productPhotoList(product.slug, variant.colorSlug, variant.images),
    })),
  };
}

async function fetchCatalogProducts(): Promise<Product[]> {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error(`Product catalog request failed (${response.status})`);
  }

  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('products' in body)) {
    throw new Error('Product catalog response is missing products.');
  }

  const { products } = body as { products: unknown };
  if (!Array.isArray(products) || !products.every(isProduct)) {
    throw new Error('Product catalog response has an invalid product.');
  }

  return products.map(copyProduct);
}

export function invalidateStorefrontCatalog(): void {
  storefrontCatalog = null;
  storefrontRequest = null;
}

export function loadStorefrontCatalog(): Promise<Product[]> {
  if (storefrontCatalog) {
    return Promise.resolve(storefrontCatalog);
  }

  storefrontRequest ??= fetchCatalogProducts()
    .then((products) => {
      storefrontCatalog = products;
      return storefrontCatalog;
    })
    .catch((error: unknown) => {
      storefrontRequest = null;
      throw error;
    });

  return storefrontRequest;
}

export function getCatalogSnapshot(): Product[] {
  return storefrontCatalog ?? [];
}

export async function listProducts(
  query: CatalogQuery = {},
): Promise<Product[]> {
  await mockCatalogGate();
  const catalog = await loadStorefrontCatalog();
  return filterProducts(catalog, query);
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  await mockCatalogGate();
  const catalog = await loadStorefrontCatalog();
  return catalog.find((product) => product.slug === slug);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return getProductsBySlug([...featuredProductSlugs]);
}

export async function getProductsBySlug(slugs: string[]): Promise<Product[]> {
  await mockCatalogGate();
  const catalog = await loadStorefrontCatalog();
  return slugs
    .map((slug) => catalog.find((product) => product.slug === slug))
    .filter((product): product is Product => product !== undefined);
}

export async function getRelatedProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  await mockCatalogGate();
  const catalog = await loadStorefrontCatalog();
  return catalog
    .filter(
      (item) => item.category === product.category && item.id !== product.id,
    )
    .slice(0, limit);
}
