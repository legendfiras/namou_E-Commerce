import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appleImageUrl, imageJobs } from './image-manifest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

async function download(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'image/jpeg,image/*;q=0.8',
      'User-Agent': 'NamouStore/1.0',
    },
  });
  if (!response.ok) {
    return null;
  }
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('image')) {
    return null;
  }
  return Buffer.from(await response.arrayBuffer());
}

const missing = [];
let saved = 0;

for (const job of imageJobs) {
  const destDir = join(root, 'images', 'products', job.productId);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${job.colorSlug}.jpg`);

  let buffer = null;
  for (const sourceId of job.sourceIds) {
    buffer = await download(appleImageUrl(sourceId));
    if (buffer) {
      break;
    }
  }

  if (!buffer) {
    missing.push(`${job.productId}/${job.colorSlug}`);
    continue;
  }

  writeFileSync(dest, buffer);
  saved += 1;
  console.log(`saved ${job.productId}/${job.colorSlug}.jpg`);
}

console.log(`Fetched ${saved} product photos.`);
if (missing.length) {
  console.log(
    `Missing photos (SVG fallback will be used):\n- ${missing.join('\n- ')}`,
  );
}
