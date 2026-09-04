import { describe, expect, it } from 'vitest';
import { regionPromoContent, heroSlidesFor, categoryBannerFor, vendorSpotlightFor } from './region-content';

describe('region-content regional honesty', () => {
  it('returns region-specific content for a listed region (UK)', () => {
    const promo = regionPromoContent('UK');
    expect(promo.currency).toBe('GBP');
    expect(promo.couponCode).toBe('SAVE20-UK');
    expect(promo.cashbackPercent).toBe(5);
  });

  it('never falls back to another region for an unlisted region (JP)', () => {
    const promo = regionPromoContent('JP');
    expect(promo.currency).toBe('JPY');
    expect(promo.couponCode).toBe('');
    expect(promo.couponDiscountPercent).toBe(0);
    expect(promo.cashbackPercent).toBe(0);
  });

  it('derives the fallback threshold from the real region config', () => {
    const promo = regionPromoContent('JP');
    expect(promo.freeShippingThresholdMinorUnits).toBeGreaterThan(0);
    expect(promo.heroSubtitle).toContain('¥');
  });

  it('does not leak vendor spotlight data into unlisted regions', () => {
    expect(vendorSpotlightFor('JP')).toHaveLength(0);
  });

  it('returns null category content for unlisted regions', () => {
    expect(categoryBannerFor('JP')).toBeNull();
  });

  it('keeps a listed region category banner', () => {
    expect(categoryBannerFor('UK')).not.toBeNull();
  });

  it('provides a neutral fallback hero slide for unlisted regions', () => {
    const slides = heroSlidesFor('JP');
    expect(slides).toHaveLength(1);
    expect(slides[0].bgClass).toContain('from-');
  });

  it('uses regional non-USD currency for a listed high-inventory region (NG → NGN)', () => {
    expect(regionPromoContent('NG').currency).toBe('NGN');
    expect(regionPromoContent('NG').couponCode).toBe('SAVE20-NG');
  });

  it('uses a distinct non-GBP/non-USD currency for an unlisted sparse region (TZ → TZS)', () => {
    const promo = regionPromoContent('TZ');
    expect(promo.currency).toBe('TZS');
    expect(promo.couponCode).toBe('');
    expect(promo.cashbackPercent).toBe(0);
  });
});
