const R2_PRODUCT_PHOTOS: Record<string, string> = {
  'airpods-4/white.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/airpods-4/white.jpg',
  'airpods-max/blue.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/airpods-max/blue.jpg',
  'airpods-max/midnight.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/airpods-max/midnight.jpg',
  'airpods-max/orange.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/airpods-max/orange.jpg',
  'airpods-max/purple.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/airpods-max/purple.jpg',
  'airpods-max/starlight.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/airpods-max/starlight.jpg',
  'airpods-pro-2/white.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/airpods-pro-2/white.jpg',
  'ipad-pro/silver.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/ipad-pro/silver.jpg',
  'ipad-pro/space-black.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/ipad-pro/space-black.jpg',
  'macbook-air-13/midnight.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/macbook-air-13/midnight.jpg',
  'macbook-air-13/sky-blue.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/macbook-air-13/sky-blue.jpg',
  'macbook-air-13/starlight.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/macbook-air-13/starlight.jpg',
  'macbook-air-15/midnight.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/macbook-air-15/midnight.jpg',
  'macbook-air-15/sky-blue.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/macbook-air-15/sky-blue.jpg',
  'macbook-air-15/starlight.jpg':
    'https://pub-c1aed470f61e45f79786d2facf8e6dad.r2.dev/products/macbook-air-15/starlight.jpg',
};

function photoKey(productId: string, colorSlug: string): string {
  return `${productId}/${colorSlug}.jpg`;
}

export function r2ProductPhoto(
  productId: string,
  colorSlug: string,
): string | undefined {
  return R2_PRODUCT_PHOTOS[photoKey(productId, colorSlug)];
}

export function resolveStoredProductImage(src: string): string {
  const match = /^\/images\/products\/([^/]+\/[^/]+\.jpg)$/.exec(src);
  if (!match) {
    return src;
  }
  return R2_PRODUCT_PHOTOS[match[1]] ?? src;
}

export function variantImagePaths(
  productId: string,
  colorSlug: string,
): string[] {
  const remote = r2ProductPhoto(productId, colorSlug);
  const svg = `/images/products/${colorSlug}.svg`;
  const fallback = '/images/products/fallback.svg';
  if (remote) {
    return [remote, svg, fallback];
  }
  return [`/images/products/${photoKey(productId, colorSlug)}`, svg, fallback];
}

export function productPhotoList(
  productId: string,
  colorSlug: string,
  images: string[],
): string[] {
  const remote = r2ProductPhoto(productId, colorSlug);
  const resolved = images.map(resolveStoredProductImage);
  if (!remote) {
    return resolved;
  }

  const svg = `/images/products/${colorSlug}.svg`;
  const fallback = '/images/products/fallback.svg';
  const rest = resolved.filter(
    (image) => image !== remote && image !== `/images/products/${photoKey(productId, colorSlug)}`,
  );
  const list = [remote, ...rest];
  if (!list.includes(svg)) {
    list.push(svg);
  }
  if (!list.includes(fallback)) {
    list.push(fallback);
  }
  return list;
}
