import { variantImagePaths } from '../lib/images.ts';
import type {
  Product,
  ProductCategory,
  ProductFamily,
  ProductSeries,
  ProductVariant,
} from '../types/store.ts';

type ColorDef = {
  color: string;
  colorSlug: string;
  colorHex: string;
};

type VariantInput = ColorDef & {
  priceCents: number;
  stock: number;
};

function variants(
  productId: string,
  spec: string,
  inputs: VariantInput[],
): ProductVariant[] {
  return inputs.map((input) => ({
    id: `${productId}-${input.colorSlug}`,
    color: input.color,
    colorSlug: input.colorSlug,
    colorHex: input.colorHex,
    storage: spec,
    priceCents: input.priceCents,
    stock: input.stock,
    images: variantImagePaths(productId, input.colorSlug),
  }));
}

function product(input: {
  slug: string;
  name: string;
  category: ProductCategory;
  family: ProductFamily;
  series: ProductSeries;
  spec: string;
  description: string;
  variants: VariantInput[];
}): Product {
  return {
    id: input.slug,
    slug: input.slug,
    name: input.name,
    category: input.category,
    family: input.family,
    series: input.series,
    spec: input.spec,
    description: input.description,
    variants: variants(input.slug, input.spec, input.variants),
  };
}

const C = {
  midnight: { color: 'Midnight', colorSlug: 'midnight', colorHex: '#1c1c1e' },
  starlight: {
    color: 'Starlight',
    colorSlug: 'starlight',
    colorHex: '#f9f3ee',
  },
  red: { color: '(PRODUCT)RED', colorSlug: 'product-red', colorHex: '#bf1f2e' },
  blue13: { color: 'Blue', colorSlug: 'blue', colorHex: '#437691' },
  pink13: { color: 'Pink', colorSlug: 'pink', colorHex: '#faddd7' },
  graphite: { color: 'Graphite', colorSlug: 'graphite', colorHex: '#54524f' },
  gold: { color: 'Gold', colorSlug: 'gold', colorHex: '#f4d4b6' },
  silver: { color: 'Silver', colorSlug: 'silver', colorHex: '#e3e4e5' },
  sierra: {
    color: 'Sierra Blue',
    colorSlug: 'sierra-blue',
    colorHex: '#a7c1d9',
  },
  alpine: {
    color: 'Alpine Green',
    colorSlug: 'alpine-green',
    colorHex: '#576856',
  },
  purple: { color: 'Purple', colorSlug: 'purple', colorHex: '#b8afe6' },
  yellow14: { color: 'Yellow', colorSlug: 'yellow', colorHex: '#f6e08d' },
  spaceBlack: {
    color: 'Space Black',
    colorSlug: 'space-black',
    colorHex: '#1b1b1d',
  },
  deepPurple: {
    color: 'Deep Purple',
    colorSlug: 'deep-purple',
    colorHex: '#594f63',
  },
  black: { color: 'Black', colorSlug: 'black', colorHex: '#2c2c2e' },
  blue15: { color: 'Blue', colorSlug: 'blue-15', colorHex: '#3d6d8c' },
  green15: { color: 'Green', colorSlug: 'green-15', colorHex: '#d6e5c5' },
  yellow15: { color: 'Yellow', colorSlug: 'yellow-15', colorHex: '#ece07a' },
  pink15: { color: 'Pink', colorSlug: 'pink-15', colorHex: '#f2c1c6' },
  blackTi: {
    color: 'Black Titanium',
    colorSlug: 'black-titanium',
    colorHex: '#3c3c3d',
  },
  whiteTi: {
    color: 'White Titanium',
    colorSlug: 'white-titanium',
    colorHex: '#f2f1ed',
  },
  blueTi: {
    color: 'Blue Titanium',
    colorSlug: 'blue-titanium',
    colorHex: '#3d4a5c',
  },
  naturalTi: {
    color: 'Natural Titanium',
    colorSlug: 'natural-titanium',
    colorHex: '#c2bcb2',
  },
  desertTi: {
    color: 'Desert Titanium',
    colorSlug: 'desert-titanium',
    colorHex: '#c5a882',
  },
  white: { color: 'White', colorSlug: 'white', colorHex: '#f5f5f7' },
  teal: { color: 'Teal', colorSlug: 'teal', colorHex: '#4d7b76' },
  ultra: {
    color: 'Ultramarine',
    colorSlug: 'ultramarine',
    colorHex: '#3b4cc0',
  },
  pink16: { color: 'Pink', colorSlug: 'pink-16', colorHex: '#f3c6d1' },
  orange: { color: 'Orange', colorSlug: 'orange', colorHex: '#e8734a' },
  skyBlue: { color: 'Sky Blue', colorSlug: 'sky-blue', colorHex: '#7eb8d4' },
  spaceGray: {
    color: 'Space Gray',
    colorSlug: 'space-gray',
    colorHex: '#7d7e80',
  },
} as const;

function v(color: ColorDef, priceCents: number, stock: number): VariantInput {
  return { ...color, priceCents, stock };
}

export const products: Product[] = [
  product({
    slug: 'iphone-13',
    name: 'iPhone 13',
    category: 'iphone',
    family: '13',
    series: 'everyday',
    spec: '256GB',
    description:
      'A familiar 6.1-inch iPhone with Midnight, Starlight, and (PRODUCT)RED finishes. 256 GB.',
    variants: [
      v(C.midnight, 59900, 12),
      v(C.starlight, 59900, 6),
      v(C.red, 59900, 2),
    ],
  }),
  product({
    slug: 'iphone-13-mini',
    name: 'iPhone 13 mini',
    category: 'iphone',
    family: '13',
    series: 'everyday',
    spec: '256GB',
    description:
      'The compact iPhone 13 mini in Pink, Blue, and Midnight. 256 GB.',
    variants: [
      v(C.pink13, 54900, 5),
      v(C.blue13, 54900, 0),
      v(C.midnight, 54900, 8),
    ],
  }),
  product({
    slug: 'iphone-13-pro',
    name: 'iPhone 13 Pro',
    category: 'iphone',
    family: '13',
    series: 'pro',
    spec: '256GB',
    description:
      'iPhone 13 Pro in Graphite, Sierra Blue, and Alpine Green. 256 GB.',
    variants: [
      v(C.graphite, 69900, 7),
      v(C.sierra, 69900, 3),
      v(C.alpine, 69900, 1),
    ],
  }),
  product({
    slug: 'iphone-13-pro-max',
    name: 'iPhone 13 Pro Max',
    category: 'iphone',
    family: '13',
    series: 'pro',
    spec: '256GB',
    description:
      'The larger iPhone 13 Pro Max in Silver, Gold, and Sierra Blue. 256 GB.',
    variants: [
      v(C.silver, 74900, 4),
      v(C.gold, 74900, 9),
      v(C.sierra, 74900, 0),
    ],
  }),
  product({
    slug: 'iphone-14',
    name: 'iPhone 14',
    category: 'iphone',
    family: '14',
    series: 'everyday',
    spec: '256GB',
    description: 'iPhone 14 in Midnight, Purple, and Yellow. 256 GB.',
    variants: [
      v(C.midnight, 64900, 10),
      v(C.purple, 64900, 5),
      v(C.yellow14, 64900, 2),
    ],
  }),
  product({
    slug: 'iphone-14-plus',
    name: 'iPhone 14 Plus',
    category: 'iphone',
    family: '14',
    series: 'everyday',
    spec: '256GB',
    description: 'iPhone 14 Plus in Starlight, Blue, and (PRODUCT)RED. 256 GB.',
    variants: [
      v(C.starlight, 69900, 6),
      v(C.blue13, 69900, 3),
      v(C.red, 69900, 1),
    ],
  }),
  product({
    slug: 'iphone-14-pro',
    name: 'iPhone 14 Pro',
    category: 'iphone',
    family: '14',
    series: 'pro',
    spec: '256GB',
    description: 'iPhone 14 Pro in Space Black, Deep Purple, and Gold. 256 GB.',
    variants: [
      v(C.spaceBlack, 79900, 8),
      v(C.deepPurple, 79900, 4),
      v(C.gold, 79900, 0),
    ],
  }),
  product({
    slug: 'iphone-14-pro-max',
    name: 'iPhone 14 Pro Max',
    category: 'iphone',
    family: '14',
    series: 'pro',
    spec: '256GB',
    description:
      'iPhone 14 Pro Max in Space Black, Silver, and Deep Purple. 256 GB.',
    variants: [
      v(C.spaceBlack, 84900, 5),
      v(C.silver, 84900, 7),
      v(C.deepPurple, 84900, 2),
    ],
  }),
  product({
    slug: 'iphone-15',
    name: 'iPhone 15',
    category: 'iphone',
    family: '15',
    series: 'everyday',
    spec: '256GB',
    description: 'iPhone 15 in Black, Pink, and Blue. 256 GB.',
    variants: [
      v(C.black, 72900, 11),
      v(C.pink15, 72900, 4),
      v(C.blue15, 72900, 6),
    ],
  }),
  product({
    slug: 'iphone-15-plus',
    name: 'iPhone 15 Plus',
    category: 'iphone',
    family: '15',
    series: 'everyday',
    spec: '256GB',
    description: 'iPhone 15 Plus in Green, Yellow, and Black. 256 GB.',
    variants: [
      v(C.green15, 82900, 8),
      v(C.yellow15, 82900, 3),
      v(C.black, 82900, 5),
    ],
  }),
  product({
    slug: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    category: 'iphone',
    family: '15',
    series: 'pro',
    spec: '256GB',
    description:
      'iPhone 15 Pro in Black Titanium, Natural Titanium, and Blue Titanium. 256 GB.',
    variants: [
      v(C.blackTi, 89900, 9),
      v(C.naturalTi, 89900, 4),
      v(C.blueTi, 89900, 1),
    ],
  }),
  product({
    slug: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max',
    category: 'iphone',
    family: '15',
    series: 'pro',
    spec: '256GB',
    description:
      'iPhone 15 Pro Max in White Titanium, Black Titanium, and Natural Titanium. 256 GB.',
    variants: [
      v(C.whiteTi, 89900, 3),
      v(C.blackTi, 89900, 6),
      v(C.naturalTi, 89900, 2),
    ],
  }),
  product({
    slug: 'iphone-16',
    name: 'iPhone 16',
    category: 'iphone',
    family: '16',
    series: 'everyday',
    spec: '256GB',
    description: 'iPhone 16 in Black, Ultramarine, and Teal. 256 GB.',
    variants: [
      v(C.black, 82900, 14),
      v(C.ultra, 82900, 5),
      v(C.teal, 82900, 3),
    ],
  }),
  product({
    slug: 'iphone-16-plus',
    name: 'iPhone 16 Plus',
    category: 'iphone',
    family: '16',
    series: 'everyday',
    spec: '256GB',
    description: 'iPhone 16 Plus in White, Pink, and Ultramarine. 256 GB.',
    variants: [
      v(C.white, 92900, 7),
      v(C.pink16, 92900, 2),
      v(C.ultra, 92900, 4),
    ],
  }),
  product({
    slug: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    category: 'iphone',
    family: '16',
    series: 'pro',
    spec: '256GB',
    description:
      'iPhone 16 Pro in Desert Titanium, Black Titanium, and Natural Titanium. 256 GB.',
    variants: [
      v(C.desertTi, 99900, 10),
      v(C.blackTi, 99900, 6),
      v(C.naturalTi, 99900, 3),
    ],
  }),
  product({
    slug: 'airpods-4',
    name: 'AirPods 4',
    category: 'airpods',
    family: 'audio',
    series: 'everyday',
    spec: 'USB-C',
    description:
      'Open-ear AirPods with Personalized Spatial Audio and USB-C charging.',
    variants: [v(C.white, 12900, 18)],
  }),
  product({
    slug: 'airpods-pro-2',
    name: 'AirPods Pro 2',
    category: 'airpods',
    family: 'audio',
    series: 'pro',
    spec: 'USB-C',
    description:
      'Active Noise Cancellation, Adaptive Audio, and a USB-C MagSafe case.',
    variants: [v(C.white, 24900, 14)],
  }),
  product({
    slug: 'airpods-max',
    name: 'AirPods Max',
    category: 'airpods',
    family: 'audio',
    series: 'pro',
    spec: 'USB-C',
    description:
      'Over-ear AirPods Max in Midnight, Starlight, Blue, Orange, and Purple.',
    variants: [
      v(C.midnight, 54900, 6),
      v(C.starlight, 54900, 4),
      v(C.blue13, 54900, 5),
      v(C.orange, 54900, 3),
      v(C.purple, 54900, 2),
    ],
  }),
  product({
    slug: 'macbook-air-13',
    name: 'MacBook Air 13"',
    category: 'mac',
    family: 'laptop',
    series: 'everyday',
    spec: '256GB',
    description:
      '13-inch MacBook Air in Midnight, Starlight, and Sky Blue. 256 GB.',
    variants: [
      v(C.midnight, 99900, 8),
      v(C.starlight, 99900, 6),
      v(C.skyBlue, 99900, 5),
    ],
  }),
  product({
    slug: 'macbook-air-15',
    name: 'MacBook Air 15"',
    category: 'mac',
    family: 'laptop',
    series: 'everyday',
    spec: '256GB',
    description:
      '15-inch MacBook Air in Midnight, Starlight, and Sky Blue. 256 GB.',
    variants: [
      v(C.midnight, 119900, 5),
      v(C.starlight, 119900, 4),
      v(C.skyBlue, 119900, 3),
    ],
  }),
  product({
    slug: 'ipad-pro',
    name: 'iPad Pro 11"',
    category: 'ipad',
    family: 'tablet',
    series: 'pro',
    spec: '256GB',
    description: '11-inch iPad Pro in Space Black and Silver. 256 GB.',
    variants: [v(C.spaceBlack, 99900, 4), v(C.silver, 99900, 3)],
  }),
];

export const featuredProductSlugs = [
  'iphone-16-pro',
  'airpods-max',
  'macbook-air-13',
  'ipad-pro',
] as const;

export function getSeedCatalog(): Product[] {
  return products;
}
