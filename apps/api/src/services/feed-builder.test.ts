import { describe, it, expect } from 'vitest';
import {
  renderGoogleMerchant,
  renderTikTokCsv,
  renderPinterestCsv,
  renderFacebookCsv,
  FeedItem,
} from './feed-builder.js';

function sampleItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'SKU-1',
    itemGroupId: 'prod-1',
    title: 'Kids Kitchen Set',
    description: 'A kitchen set with "quotes" & <brackets>',
    link: 'https://uk.Storegrill.net/products/kids-kitchen-set',
    imageLink: 'https://cdn.example/img.jpg',
    priceMinorUnits: 2450,
    currencyCode: 'GBP',
    listPriceMinorUnits: 3499,
    availability: 'in_stock',
    condition: 'new',
    brand: 'Costway',
    gtin: '5060000000000',
    mpn: 'SKU-1',
    googleProductCategory: 'Home & Garden > Kitchen & Dining',
    productType: 'Kitchen',
    shipping: { country: 'GB', priceMinorUnits: 399, currencyCode: 'GBP' },
    ...overrides,
  };
}

describe('renderGoogleMerchant', () => {
  it('renders required Google fields as XML', () => {
    const xml = renderGoogleMerchant([sampleItem()], 'UK', 'United Kingdom');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<g:id>SKU-1</g:id>');
    expect(xml).toContain('<g:item_group_id>prod-1</g:item_group_id>');
    expect(xml).toContain('<g:price>24.50 GBP</g:price>');
    expect(xml).toContain('<g:sale_price>24.50 GBP</g:sale_price>');
    expect(xml).toContain('<g:availability>in_stock</g:availability>');
    expect(xml).toContain('<g:condition>new</g:condition>');
    expect(xml).toContain('<g:brand>Costway</g:brand>');
    expect(xml).toContain('<g:gtin>5060000000000</g:gtin>');
    expect(xml).toContain('<g:google_product_category>Home &amp; Garden &gt; Kitchen &amp; Dining</g:google_product_category>');
    expect(xml).toContain('<g:shipping><g:country>GB</g:country><g:price>3.99 GBP</g:price></g:shipping>');
    expect(xml).toContain('https://uk.Storegrill.net/products/kids-kitchen-set');
  });

  it('escapes XML special characters in title/description', () => {
    const xml = renderGoogleMerchant([sampleItem()], 'UK', 'United Kingdom');
    expect(xml).toContain('A kitchen set with &quot;quotes&quot; &amp; &lt;brackets&gt;');
    expect(xml).not.toContain('<brackets>');
  });

  it('filters empty optional tags and omits sale_price when absent', () => {
    const item = sampleItem({ gtin: undefined, mpn: undefined, listPriceMinorUnits: undefined, shipping: undefined });
    const xml = renderGoogleMerchant([item], 'UK', 'United Kingdom');
    expect(xml).not.toContain('<g:gtin>');
    expect(xml).not.toContain('<g:mpn>');
    expect(xml).not.toContain('<g:sale_price>');
    expect(xml).not.toContain('<g:shipping>');
    expect(xml).toContain('<g:price>24.50 GBP</g:price>');
  });
});

describe('renderTikTokCsv', () => {
  it('renders TikTok catalog headers and a row', () => {
    const csv = renderTikTokCsv([sampleItem()]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'id,title,description,availability,condition,price,link,image_link,brand,gtin,mpn,google_product_category,item_group_id',
    );
    expect(lines[1]).toContain('SKU-1');
    expect(lines[1]).toContain('"A kitchen set with ""quotes"" & <brackets>"');
    expect(lines[1]).toContain('24.50 GBP');
  });
});

describe('renderPinterestCsv', () => {
  it('renders Pinterest headers and row with price', () => {
    const csv = renderPinterestCsv([sampleItem()]);
    expect(csv.split('\n')[0]).toContain('id,title,description,link,image_link,price,availability');
    expect(csv.split('\n')[1]).toContain('24.50 GBP');
  });
});

describe('renderFacebookCsv', () => {
  it('renders sale_price column when a deal/compare-at price exists', () => {
    const csv = renderFacebookCsv([sampleItem()]);
    const row = csv.split('\n')[1].split(',');
    expect(row[row.length - 1]).toBe('24.50 GBP');
  });

  it('leaves sale_price empty when no comparison price exists', () => {
    const csv = renderFacebookCsv([sampleItem({ listPriceMinorUnits: undefined })]);
    const row = csv.split('\n')[1].split(',');
    expect(row[row.length - 1]).toBe('');
  });
});