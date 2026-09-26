import mongoose, { Schema } from 'mongoose';

export const PRODUCT_CATEGORIES = ['iphone', 'airpods', 'mac', 'ipad'] as const;

export const PRODUCT_FAMILIES = [
  '13',
  '14',
  '15',
  '16',
  'audio',
  'laptop',
  'tablet',
] as const;

export const PRODUCT_SERIES = ['everyday', 'pro'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductFamily = (typeof PRODUCT_FAMILIES)[number];
export type ProductSeries = (typeof PRODUCT_SERIES)[number];

export type PublicProductVariant = {
  id: string;
  color: string;
  colorSlug: string;
  colorHex: string;
  storage: string;
  priceCents: number;
  stock: number;
  images: string[];
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  family: ProductFamily;
  series: ProductSeries;
  spec: string;
  description: string;
  variants: PublicProductVariant[];
};

const variantSchema = new Schema(
  {
    id: { type: String, required: true },
    color: { type: String, required: true },
    colorSlug: { type: String, required: true },
    colorHex: {
      type: String,
      required: true,
      match: /^#[0-9a-fA-F]{6}$/,
    },
    storage: { type: String, required: true },
    priceCents: { type: Number, required: true, min: 1 },
    stock: { type: Number, required: true, min: 0 },
    images: {
      type: [String],
      required: true,
      validate: {
        validator(value: string[]) {
          return (
            value.length > 0 && value.every((image) => image.trim().length > 0)
          );
        },
        message: 'Each variant needs at least one image path.',
      },
    },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: PRODUCT_CATEGORIES,
    },
    family: {
      type: String,
      required: true,
      enum: PRODUCT_FAMILIES,
    },
    series: {
      type: String,
      required: true,
      enum: PRODUCT_SERIES,
    },
    spec: { type: String, required: true },
    description: { type: String, required: true },
    variants: {
      type: [variantSchema],
      required: true,
      validate: {
        validator(value: unknown[]) {
          return value.length > 0;
        },
        message: 'A product needs at least one variant.',
      },
    },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, family: 1, series: 1 });
productSchema.index({ 'variants.id': 1 }, { unique: true });

export type ProductDocument = mongoose.InferSchemaType<typeof productSchema>;

export const Product = mongoose.model('Product', productSchema);

export function toPublicProduct(doc: {
  slug: string;
  name: string;
  category: string;
  family: string;
  series: string;
  spec: string;
  description: string;
  variants: PublicProductVariant[];
}): PublicProduct {
  return {
    id: doc.slug,
    slug: doc.slug,
    name: doc.name,
    category: doc.category as ProductCategory,
    family: doc.family as ProductFamily,
    series: doc.series as ProductSeries,
    spec: doc.spec,
    description: doc.description,
    variants: doc.variants.map((variant) => ({
      id: variant.id,
      color: variant.color,
      colorSlug: variant.colorSlug,
      colorHex: variant.colorHex,
      storage: variant.storage,
      priceCents: variant.priceCents,
      stock: variant.stock,
      images: [...variant.images],
    })),
  };
}
