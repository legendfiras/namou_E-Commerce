import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const REQUIRED_ENV = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

function loadEnv(): void {
  const apiEnv = path.resolve(__dirname, '../.env');
  const rootEnv = path.resolve(__dirname, '../../../.env');

  if (existsSync(apiEnv)) {
    dotenv.config({ path: apiEnv });
  }
  if (existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  }
}

function requireEnv(name: (typeof REQUIRED_ENV)[number]): string {
  const value = process.env[name]?.trim() ?? '';
  if (!value) {
    throw new Error(`Missing ${name}. Set it in apps/api/.env or the root .env.`);
  }
  return value;
}

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    throw new Error(`Unsupported image type: ${extension}`);
  }
  return contentType;
}

async function collectImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImages(fullPath)));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

async function objectExists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (isMissingObject(error)) {
      return false;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  loadEnv();

  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const bucket = requireEnv('R2_BUCKET_NAME');
  const publicBase = requireEnv('R2_PUBLIC_URL').replace(/\/+$/, '');

  const imagesDir = path.resolve(
    __dirname,
    '../../../apps/web/public/images/products',
  );
  if (!existsSync(imagesDir)) {
    throw new Error(`Product images folder not found: ${imagesDir}`);
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const files = (await collectImages(imagesDir)).sort((left, right) =>
    left.localeCompare(right),
  );

  if (files.length === 0) {
    throw new Error(`No product images found in ${imagesDir}`);
  }

  const urls: Record<string, string> = {};

  for (const filePath of files) {
    const filename = path.relative(imagesDir, filePath).replaceAll('\\', '/');
    const key = `products/${filename}`;
    const publicUrl = `${publicBase}/${key}`;
    const exists = await objectExists(client, bucket, key);

    if (!exists) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: await readFile(filePath),
          ContentType: contentTypeFor(filePath),
        }),
      );
      console.log(`uploaded ${publicUrl}`);
    } else {
      console.log(`skipped ${publicUrl}`);
    }

    urls[filename] = publicUrl;
  }

  const outputPath = path.resolve(__dirname, '../seed/imageUrls.json');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(urls, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(urls).length} URLs to ${outputPath}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
