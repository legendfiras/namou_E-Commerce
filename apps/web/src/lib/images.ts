export function mediaUrl(path: string): string {
  const env =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env
      : undefined;
  const base = env?.VITE_R2_PUBLIC_URL?.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

export function variantImagePaths(
  productId: string,
  colorSlug: string,
): string[] {
  return [
    mediaUrl(`/images/products/${productId}/${colorSlug}.jpg`),
    `/images/products/${colorSlug}.svg`,
    '/images/products/fallback.svg',
  ];
}
