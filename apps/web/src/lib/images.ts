export function storefrontImage(src?: string): string | undefined {
  if (!src) return undefined;
  return src.includes('placehold.co') ? '/product-placeholder.svg' : src;
}
