import { percentOf } from '../utils/money';

/**
 * Performance marketing participation and price-band fee engine.
 * Marketplace commission and marketing fees are deliberately separate:
 * a merchant opts in channel-by-channel and each channel can carry its own
 * fee model. Defaults mirror historical marketplace price-band norms but are
 * data, not baked-in law.
 */

export const MarketingChannel = {
  MARKETPLACE_EXPOSURE: 'MARKETPLACE_EXPOSURE',
  EMAIL: 'EMAIL',
  NEWSLETTER: 'NEWSLETTER',
  HOMEPAGE: 'HOMEPAGE',
  FEATURED: 'FEATURED',
  SOCIAL: 'SOCIAL',
  GOOGLE_ADS: 'GOOGLE_ADS',
  PAID_CAMPAIGNS: 'PAID_CAMPAIGNS',
  RETARGETING: 'RETARGETING',
  AFFILIATE: 'AFFILIATE',
  SEASONAL: 'SEASONAL',
  FLASH_SALE: 'FLASH_SALE',
} as const;

export type MarketingChannelValue = (typeof MarketingChannel)[keyof typeof MarketingChannel];

export const MARKETING_CHANNEL_VALUES: readonly MarketingChannelValue[] = Object.values(MarketingChannel);

export const MarketingFeeModel = {
  NONE: 'NONE',
  PRICE_BAND: 'PRICE_BAND',
  FIXED: 'FIXED',
} as const;

export type MarketingFeeModelValue = (typeof MarketingFeeModel)[keyof typeof MarketingFeeModel];

export interface MarketingChannelParticipation {
  channel: MarketingChannelValue;
  enabled: boolean;
  feeModel: MarketingFeeModelValue;
  /** Flat fee in minor units when feeModel = FIXED. */
  fixedFeeMinorUnits?: bigint | null;
  budgetMinorUnits?: bigint | null;
  campaignEligible?: boolean;
  approved?: boolean;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
}

export interface MarketingFeeBand {
  minDealPriceMinorUnits: bigint;
  maxDealPriceMinorUnits?: bigint | null;
  /** Basis points: 2000 = 20%. */
  rateBps: number;
}

/**
 * Configurable Storegrill defaults (not attributed to any legacy rate card):
 * approx. 20% on deal price up to €50, 25% above. Currency-agnostic minor
 * units — use per-region currency rules to override.
 */
export const DEFAULT_MARKETING_FEE_BANDS: readonly MarketingFeeBand[] = [
  { minDealPriceMinorUnits: 0n, maxDealPriceMinorUnits: 5000n, rateBps: 2000 },
  { minDealPriceMinorUnits: 5000n, maxDealPriceMinorUnits: null, rateBps: 2500 },
];

export interface MarketingFeeInput {
  dealPriceMinorUnits: bigint;
  channel: MarketingChannelValue;
  participation?: Pick<MarketingChannelParticipation, 'enabled' | 'feeModel' | 'fixedFeeMinorUnits'> | null;
  bands?: readonly MarketingFeeBand[];
  asOf?: Date;
}

export interface MarketingFeeSnapshot {
  channel: MarketingChannelValue;
  feeModel: MarketingFeeModelValue;
  rateBps: number | null;
  feeMinorUnits: bigint;
  appliedBand: { minDealPriceMinorUnits: bigint; rateBps: number } | null;
}

export interface MarketingFeeResult extends MarketingFeeSnapshot {
  enabled: boolean;
  participation: boolean;
}

function channelActive(participation: MarketingFeeInput['participation']): boolean {
  if (!participation) return false;
  if (!participation.enabled) return false;
  return true;
}

export function computeMarketingFee(input: MarketingFeeInput): MarketingFeeResult {
  const isActive = channelActive(input.participation);
  const bands = input.bands?.length ? input.bands : DEFAULT_MARKETING_FEE_BANDS;
  const base: MarketingFeeSnapshot = {
    channel: input.channel,
    feeModel: 'NONE',
    rateBps: null,
    feeMinorUnits: 0n,
    appliedBand: null,
  };

  if (!isActive) {
    return { ...base, enabled: false, participation: false };
  }

  const p = input.participation!;
  if (p.feeModel === 'FIXED') {
    const fee = p.fixedFeeMinorUnits ?? 0n;
    return {
      ...base,
      feeModel: 'FIXED',
      feeMinorUnits: fee < 0n ? 0n : fee,
      enabled: true,
      participation: true,
    };
  }

  if (p.feeModel === 'PRICE_BAND') {
    const band = bands
      .filter(b => {
        if (input.dealPriceMinorUnits < b.minDealPriceMinorUnits) return false;
        if (b.maxDealPriceMinorUnits != null && input.dealPriceMinorUnits > b.maxDealPriceMinorUnits) return false;
        return true;
      })
      .sort((a, b) => Number(a.minDealPriceMinorUnits - b.minDealPriceMinorUnits))[0];

    if (!band) {
      return { ...base, enabled: true, participation: true };
    }

    const fee = percentOf(input.dealPriceMinorUnits, band.rateBps);
    return {
      channel: input.channel,
      feeModel: 'PRICE_BAND',
      rateBps: band.rateBps,
      feeMinorUnits: fee,
      appliedBand: { minDealPriceMinorUnits: band.minDealPriceMinorUnits, rateBps: band.rateBps },
      enabled: true,
      participation: true,
    };
  }

  return { ...base, enabled: true, participation: true };
}