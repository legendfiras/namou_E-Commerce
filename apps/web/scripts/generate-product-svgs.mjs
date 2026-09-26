import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const colors = {
  midnight: '#1c1c1e',
  starlight: '#f9f3ee',
  'product-red': '#bf1f2e',
  blue: '#437691',
  pink: '#faddd7',
  green: '#3f4e3d',
  graphite: '#54524f',
  gold: '#f4d4b6',
  silver: '#e3e4e5',
  'sierra-blue': '#a7c1d9',
  'alpine-green': '#576856',
  purple: '#b8afe6',
  yellow: '#f6e08d',
  'space-black': '#1b1b1d',
  'deep-purple': '#594f63',
  black: '#2c2c2e',
  'blue-15': '#3d6d8c',
  'green-15': '#d6e5c5',
  'yellow-15': '#ece07a',
  'pink-15': '#f2c1c6',
  'black-titanium': '#3c3c3d',
  'white-titanium': '#f2f1ed',
  'blue-titanium': '#3d4a5c',
  'natural-titanium': '#c2bcb2',
  'desert-titanium': '#c5a882',
  white: '#f5f5f7',
  teal: '#4d7b76',
  ultramarine: '#3b4cc0',
  'pink-16': '#f3c6d1',
  orange: '#e8734a',
  'sky-blue': '#7eb8d4',
  'space-gray': '#7d7e80',
};

function svgFor(hex) {
  const screen = '#111111';
  const island =
    hex.toLowerCase() === '#1c1c1e' ||
    hex.toLowerCase() === '#1b1b1d' ||
    hex.toLowerCase() === '#2c2c2e' ||
    hex.toLowerCase() === '#3c3c3d'
      ? '#2a2a2c'
      : '#3a3a3c';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img">
  <rect width="800" height="800" fill="#f4efe6"/>
  <rect x="250" y="80" width="300" height="640" rx="52" fill="${hex}"/>
  <rect x="268" y="108" width="264" height="584" rx="36" fill="${screen}"/>
  <rect x="346" y="96" width="108" height="22" rx="11" fill="${island}"/>
</svg>
`;
}

const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img">
  <rect width="800" height="800" fill="#ebe4d8"/>
  <rect x="250" y="80" width="300" height="640" rx="52" fill="#c8bfb2"/>
  <rect x="268" y="108" width="264" height="584" rx="36" fill="#d8d0c4"/>
  <rect x="346" y="96" width="108" height="22" rx="11" fill="#b7ada0"/>
</svg>
`;

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'images',
  'products',
);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'fallback.svg'), fallback);

for (const [slug, hex] of Object.entries(colors)) {
  writeFileSync(join(dir, `${slug}.svg`), svgFor(hex));
}

console.log(`Wrote ${Object.keys(colors).length + 1} product SVGs`);
