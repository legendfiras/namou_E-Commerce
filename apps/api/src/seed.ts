import { seedProducts } from './data/catalog';
import { connectDatabase, disconnectDatabase, sanitizePublicError } from './db';
import {
  applyDevDnsServers,
  getMongoDbName,
  getNodeEnv,
  loadApiEnv,
} from './env';
import { Product } from './models/product';

loadApiEnv();

async function seed(): Promise<void> {
  getNodeEnv();
  applyDevDnsServers();
  await connectDatabase();

  const iphoneProducts = seedProducts.filter(
    (product) => product.category === 'iphone',
  );
  const otherProducts = seedProducts.filter(
    (product) => product.category !== 'iphone',
  );

  if (iphoneProducts.length !== 15) {
    throw new Error(
      `Expected 15 iPhone products to seed, found ${iphoneProducts.length}.`,
    );
  }

  if (otherProducts.length !== 6) {
    throw new Error(
      `Expected 6 non-iPhone products to seed, found ${otherProducts.length}.`,
    );
  }

  await Product.syncIndexes();

  let inserted = 0;
  let skipped = 0;

  for (const product of seedProducts) {
    const existing = await Product.findOne({ slug: product.slug })
      .select({ slug: 1 })
      .lean();

    if (existing) {
      skipped += 1;
      continue;
    }

    const { id: _id, ...document } = product;
    await Product.create(document);
    inserted += 1;
  }

  const dbName = getMongoDbName();

  console.log(
    `Inserted ${inserted} products into ${dbName}; left ${skipped} existing products unchanged. Stock and orders were not modified.`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error(sanitizePublicError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
