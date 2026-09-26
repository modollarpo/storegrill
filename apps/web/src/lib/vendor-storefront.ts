import type { ProductCardData } from '@/components/commerce/ProductCard';

export interface VendorStorefrontProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
  price?: number | null;
  listPriceMinorUnits?: number | null;
  basePriceMinorUnits?: number | null;
  currencyCode?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  inventoryCount?: number | null;
}

function minorUnits(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Maps the vendor storefront feed onto `ProductCardData`. `price` is always a
 * finite integer minor-unit amount: the resolved regional price when the API
 * supplies one, otherwise the product's base price. A missing price must never
 * reach a formatter, or the card renders a literal "NaN".
 */
export function toProductCards(products: VendorStorefrontProduct[]): ProductCardData[] {
  return products.map((p) => {
    const price = minorUnits(p.price, minorUnits(p.basePriceMinorUnits, 0));
    const listPrice = minorUnits(p.listPriceMinorUnits, price);
    return {
      id: String(p.id),
      name: p.name,
      slug: p.slug,
      thumbnail: p.thumbnail ?? undefined,
      price,
      listPrice: listPrice > price ? listPrice : undefined,
      currencyCode: p.currencyCode || 'GBP',
      rating: minorUnits(p.rating, 0),
      reviewCount: minorUnits(p.reviewCount, 0),
      inventoryCount: p.inventoryCount == null ? undefined : minorUnits(p.inventoryCount, 0),
    };
  });
}
