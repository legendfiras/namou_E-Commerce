export const PRODUCT_STORAGE = '256GB' as const;

export type StorageSize = string;

export type ProductCategory = 'iphone' | 'airpods' | 'mac' | 'ipad';

export type ProductFamily =
  '13' | '14' | '15' | '16' | 'audio' | 'laptop' | 'tablet';

export type ProductSeries = 'everyday' | 'pro';

export type ProductVariant = {
  id: string;
  color: string;
  colorSlug: string;
  colorHex: string;
  storage: StorageSize;
  priceCents: number;
  stock: number;
  images: string[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  family: ProductFamily;
  series: ProductSeries;
  spec: string;
  description: string;
  variants: ProductVariant[];
};

export type CartItem = {
  variantId: string;
  productId: string;
  quantity: number;
};

export type WishlistItem = {
  productId: string;
};

export type OrderLine = {
  variantId: string;
  productId: string;
  productName: string;
  color: string;
  storage: string;
  unitPriceCents: number;
  quantity: number;
  image: string;
};

export type Order = {
  id: string;
  status?: 'placed';
  createdAt: string;
  items: OrderLine[];
  totalCents: number;
};

export type Session = {
  email: string;
  name: string;
};

export type ActionResult = { ok: true } | { ok: false; message: string };

export type CatalogQuery = {
  q?: string;
  category?: ProductCategory;
  family?: ProductFamily[];
  series?: ProductSeries;
  sort?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';
};
