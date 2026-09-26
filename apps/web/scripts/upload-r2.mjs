import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { existsSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';

const envFiles = [
  join(dirname(fileURLToPath(import.meta.url)), '..', '.env'),
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'api', '.env'),
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.env'),
];
for (const file of envFiles) {
  if (existsSync(file)) {
    loadEnv({ path: file, override: false });
  }
}

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error(
    'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.',
  );
  process.exit(1);
}

const imagesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'images',
);

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function contentType(file) {
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (file.endsWith('.png')) {
    return 'image/png';
  }
  if (file.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  if (file.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

const files = await walk(imagesRoot);
let uploaded = 0;

for (const file of files) {
  const info = await stat(file);
  if (!info.isFile()) {
    continue;
  }
  const key = `images/${relative(imagesRoot, file).replaceAll('\\', '/')}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: await readFile(file),
      ContentType: contentType(file),
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  uploaded += 1;
  console.log(`uploaded ${key}`);
}

const publicUrl = process.env.R2_PUBLIC_URL ?? process.env.VITE_R2_PUBLIC_URL;
console.log(`Uploaded ${uploaded} files to ${bucket}.`);
if (publicUrl) {
  console.log(`Set VITE_R2_PUBLIC_URL=${publicUrl.replace(/\/$/, '')}`);
} else {
  console.log('Set VITE_R2_PUBLIC_URL to your R2 public domain, then rebuild.');
}
