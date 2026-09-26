import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productsDir = path.join(root, 'public', 'images', 'products');
const TARGET = { r: 244, g: 239, b: 230 };

function isStudioBackdrop(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 236 && max - min <= 22;
}

async function flattenFile(file) {
  const { data, info } = await sharp(file)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const stack = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const i = y * width + x;
    if (visited[i]) {
      return;
    }
    const o = i * channels;
    if (!isStudioBackdrop(data[o], data[o + 1], data[o + 2])) {
      return;
    }
    visited[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  let replaced = 0;
  while (stack.length > 0) {
    const i = stack.pop();
    const x = i % width;
    const y = (i / width) | 0;
    const o = i * channels;
    data[o] = TARGET.r;
    data[o + 1] = TARGET.g;
    data[o + 2] = TARGET.b;
    replaced += 1;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  if (replaced === 0) {
    return { file, replaced };
  }

  const tmp = `${file}.tmp.jpg`;
  await sharp(data, { raw: { width, height, channels } })
    .jpeg({ quality: 90 })
    .toFile(tmp);
  fs.renameSync(tmp, file);
  return { file, replaced, width, height };
}

function collectJpgs(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJpgs(next));
    } else if (entry.name.endsWith('.jpg')) {
      files.push(next);
    }
  }
  return files;
}

const files = collectJpgs(productsDir);
for (const file of files) {
  const result = await flattenFile(file);
  const rel = path.relative(productsDir, file);
  console.log(`${result.replaced} ${rel}`);
}
