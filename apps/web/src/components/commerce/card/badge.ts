import type { ProductCardData } from '../ProductCard';
import { t } from '@/i18n';

type Badge = NonNullable<ProductCardData['badge']>;

/**
 * Badge presentation lives in one place: the grid and list cards both render a
 * badge, and two parallel label maps drifted apart before (a `trending` badge
 * rendered empty on the grid and a hardcoded string on the list).
 */
const BADGE_STYLES: Record<Badge, string> = {
  sale: 'bg-feedback-danger text-white',
  new: 'bg-black text-white',
  deal: 'bg-ember text-white',
  sponsored: 'bg-surface text-text-secondary border border-border',
  bestseller: 'bg-ember text-white',
  trending: 'bg-info text-white',
};

const BADGE_LABEL_KEYS: Record<Badge, string> = {
  sale: 'badgeSale',
  new: 'badgeNew',
  deal: 'badgeDeal',
  sponsored: 'badgeSponsored',
  bestseller: 'badgeBestseller',
  trending: 'badgeTrending',
};

export function badgeStyle(badge: Badge): string {
  return BADGE_STYLES[badge];
}

export function badgeLabel(language: string, badge: Badge): string {
  return t(language, BADGE_LABEL_KEYS[badge]);
}
