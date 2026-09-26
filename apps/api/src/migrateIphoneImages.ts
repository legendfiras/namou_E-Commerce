import { readFileSync } from 'node:fs';
import path from 'node:path';
import { seedProducts } from './data/catalog';
import {
  connectDatabase,
  disconnectDatabase,
  sanitizePublicError,
} from './db';
import { applyDevDnsServers, getNodeEnv, loadApiEnv } from './env';
import { Product } from './models/product';

loadApiEnv();

const EXPECTED_PRODUCTS = 15;
const EXPECTED_VARIANTS = 45;

type StoredVariant = {
  id: string;
  colorSlug: string;
  images?: string[];
};

type StoredProduct = {
  slug: string;
  category: string;
  variants: StoredVariant[];
};

type PlannedChange = {
  slug: string;
  variantId: string;
  colorSlug: string;
  url: string;
};

function loadImageUrls(): Record<string, string> {
  const filePath = path.resolve(__dirname, '../seed/imageUrls.json');
  const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      'apps/api/seed/imageUrls.json must map filenames to URL strings.',
    );
  }

  const urls: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(
        'apps/api/seed/imageUrls.json must map filenames to URL strings.',
      );
    }
    urls[key] = value;
  }

  return urls;
}

function imageKey(slug: string, colorSlug: string): string {
  return `${slug}/${colorSlug}.jpg`;
}

function imagesMatch(images: string[] | undefined, url: string): boolean {
  return images?.length === 1 && images[0] === url;
}

async function migrate(apply: boolean): Promise<void> {
  getNodeEnv();
  applyDevDnsServers();

  const imageUrls = loadImageUrls();
  const iphones = seedProducts.filter((product) => product.category === 'iphone');
  const problems: string[] = [];

  if (iphones.length !== EXPECTED_PRODUCTS) {
    problems.push(
      `Seed has ${iphones.length} iPhone products; expected ${EXPECTED_PRODUCTS}.`,
    );
  }

  const expectedVariantCount = iphones.reduce(
    (count, product) => count + product.variants.length,
    0,
  );
  if (expectedVariantCount !== EXPECTED_VARIANTS) {
    problems.push(
      `Seed has ${expectedVariantCount} iPhone variants; expected ${EXPECTED_VARIANTS}.`,
    );
  }

  for (const product of iphones) {
    for (const variant of product.variants) {
      const key = imageKey(product.slug, variant.colorSlug);
      if (!imageUrls[key]) {
        problems.push(`Missing R2 URL for ${key}.`);
      }
    }
  }

  await connectDatabase();

  const docs = (await Product.find({
    slug: { $in: iphones.map((product) => product.slug) },
    category: 'iphone',
  })
    .select({ slug: 1, category: 1, variants: 1 })
    .lean()) as unknown as StoredProduct[];

  const docBySlug = new Map(docs.map((doc) => [doc.slug, doc]));
  let matchedProducts = 0;
  let matchedVariants = 0;
  let alreadyCorrect = 0;
  const changes: PlannedChange[] = [];

  for (const product of iphones) {
    const doc = docBySlug.get(product.slug);
    if (!doc || doc.category !== 'iphone') {
      problems.push(`Missing iPhone product ${product.slug}.`);
      continue;
    }

    let productExact = doc.variants.length === product.variants.length;
    if (!productExact) {
      problems.push(
        `${product.slug} has ${doc.variants.length} variants; seed has ${product.variants.length}.`,
      );
    }

    for (const variant of product.variants) {
      const stored = doc.variants.filter((item) => item.id === variant.id);
      if (stored.length !== 1 || stored[0]?.colorSlug !== variant.colorSlug) {
        productExact = false;
        problems.push(
          `${variant.id} does not match colorSlug ${variant.colorSlug}.`,
        );
        continue;
      }

      matchedVariants += 1;
      const url = imageUrls[imageKey(product.slug, variant.colorSlug)];
      if (!url) {
        continue;
      }

      if (imagesMatch(stored[0].images, url)) {
        alreadyCorrect += 1;
      } else {
        changes.push({
          slug: product.slug,
          variantId: variant.id,
          colorSlug: variant.colorSlug,
          url,
        });
      }
    }

    if (productExact) {
      matchedProducts += 1;
    }
  }

  const ready =
    problems.length === 0 &&
    matchedProducts === EXPECTED_PRODUCTS &&
    matchedVariants === EXPECTED_VARIANTS &&
    alreadyCorrect + changes.length === EXPECTED_VARIANTS;

  console.log(apply ? 'Mode: apply' : 'Mode: dry run');
  console.log(`Matched products: ${matchedProducts}`);
  console.log(`Matched variants: ${matchedVariants}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Proposed changes: ${changes.length}`);

  for (const change of changes) {
    console.log(`would set ${change.variantId} images to [${change.url}]`);
  }

  if (!ready) {
    for (const problem of problems) {
      console.error(problem);
    }
    throw new Error(
      `Refusing to apply. Expected ${EXPECTED_PRODUCTS} products and ${EXPECTED_VARIANTS} variants with an R2 URL each.`,
    );
  }

  if (!apply) {
    console.log('Dry run only. No documents were modified.');
    return;
  }

  let updated = 0;
  for (const change of changes) {
    const result = await Product.updateOne(
      { slug: change.slug, category: 'iphone' },
      { $set: { 'variants.$[variant].images': [change.url] } },
      {
        arrayFilters: [
          {
            'variant.id': change.variantId,
            'variant.colorSlug': change.colorSlug,
          },
        ],
      },
    );
    updated += result.modifiedCount;
  }

  console.log(`Updated variants: ${updated}`);
  console.log(`Skipped already correct: ${alreadyCorrect}`);
  console.log(`Matched products: ${matchedProducts}`);
  console.log(`Matched variants: ${matchedVariants}`);

  if (updated !== changes.length) {
    throw new Error(
      `Updated ${updated} of ${changes.length} variants. Re-run the dry run before applying again.`,
    );
  }
}

migrate(process.argv.includes('--apply'))
  .catch((error: unknown) => {
    console.error(sanitizePublicError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
