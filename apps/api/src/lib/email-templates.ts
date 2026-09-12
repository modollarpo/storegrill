import { createMoney, formatMoney } from '@Storegrill/shared';

export const EMAIL_FROM_NAME = 'Storegrill';
export const SUPPORT_EMAIL = 'support@storegrill.net';
export const COMPANY_LINE = 'Storegrill Inc Ltd &middot; London, United Kingdom';

export const BRAND = {
  accent: '#4c12a1',
  accentDark: '#400e8a',
  accentDeep: '#320b6e',
  accentPale: '#f2ebfb',
  charcoal: '#1c1c1c',
  ink: '#20162e',
  muted: '#6b5e83',
  border: '#eee8f5',
  bodyBg: '#f5f2fa',
  cardBg: '#ffffff',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatPrice(amountMinorUnits: number, currencyCode: string): string {
  return formatMoney(createMoney(BigInt(amountMinorUnits), currencyCode));
}

export function formatAddress(json: string): string {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const parts = [parsed.name, parsed.line1, parsed.line2, parsed.city, parsed.county, parsed.postcode, parsed.country]
      .filter((part): part is string => typeof part === 'string' && part.trim() !== '' && part !== 'undefined')
      .map(part => part.trim());
    return parts.join(', ') || 'Address on account';
  } catch {
    return 'Address on account';
  }
}

export interface EmailProduct {
  name: string;
  priceMinorUnits: number;
  currencyCode: string;
  image?: string | null;
  url: string;
  oldPriceMinorUnits?: number;
}

export interface EmailButton {
  href: string;
  label: string;
}

export function emailButton(href: string, label: string, options?: { width?: number; secondary?: boolean }): string {
  const bg = options?.secondary ? '#ffffff' : BRAND.accent;
  const border = options?.secondary ? `1px solid ${BRAND.accent}` : 'none';
  const color = options?.secondary ? BRAND.accent : '#ffffff';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
<td style="mso-padding-alt:0;" bgcolor="${bg}">
<a href="${escapeHtml(href)}" style="display:inline-block;background-color:${bg};border:${border};color:${color};text-decoration:none;font-weight:bold;font-size:14px;line-height:1.4;padding:13px 28px;border-radius:8px;mso-padding-alt:12px 28px;">${escapeHtml(label)}</a>
</td>
</tr></table></td></tr></table>`;
}

export function sectionHeading(text: string, options?: { muted?: boolean; small?: boolean }): string {
  const isMuted = Boolean(options?.muted);
  const isSmall = Boolean(options?.small);
  const color = isMuted ? BRAND.muted : isSmall ? BRAND.ink : BRAND.charcoal;
  const size = isSmall ? '13px' : '16px';
  const fontWeight = isMuted ? 'normal' : 'bold';
  const uppercase = isMuted ? 'text-transform:uppercase;letter-spacing:0.7px;' : '';
  return `<h2 style="margin:0 0 12px;font-size:${size};color:${color};font-weight:${fontWeight};${uppercase}">${escapeHtml(text)}</h2>`;
}

export function paragraph(text: string, options?: { muted?: boolean }): string {
  const color = options?.muted ? BRAND.muted : BRAND.ink;
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${color};">${text}</p>`;
}

export function callout(title: string, body: string, options?: { tone?: 'info' | 'success' | 'warning' | 'danger' }): string {
  const tones: Record<string, string> = {
    info: `background-color:${BRAND.accentPale};border:1px solid ${BRAND.border};`,
    success: `background-color:#ecfdf3;border:1px solid #bbf7d0;`,
    warning: `background-color:#fffbeb;border:1px solid #fde68a;`,
    danger: `background-color:#fef2f2;border:1px solid #fecaca;`,
  };
  const accentColors: Record<string, string> = {
    info: BRAND.accent,
    success: BRAND.success,
    warning: BRAND.warning,
    danger: BRAND.danger,
  };
  const tone = options?.tone ?? 'info';
  return `<div style="${tones[tone]};border-radius:10px;padding:14px 16px;margin-bottom:20px;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:${accentColors[tone]};margin-bottom:5px;">${escapeHtml(title)}</div>
<div style="font-size:13px;color:${BRAND.ink};line-height:1.6;">${body}</div>
</div>`;
}

export interface OrderItemRow {
  name: string;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
  image?: string | null;
}

export function renderItemsTable(items: OrderItemRow[], currencyCode: string): string {
  const rows = items
    .map(item => {
      const imageCell = item.image
        ? `<img src="${escapeHtml(item.image)}" width="52" height="52" alt="" style="border-radius:6px;display:block;" />`
        : '<span style="width:52px;height:52px;display:inline-block;background-color:#e9e2f5;border-radius:6px;"></span>';
      return `<tr>
<td style="padding:10px 8px;border-bottom:1px solid ${BRAND.border};vertical-align:middle;">${imageCell}</td>
<td style="padding:10px 8px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.ink};">${escapeHtml(item.name)}<br /><span style="color:${BRAND.muted};font-size:12px;">Qty ${item.quantity}</span></td>
<td style="padding:10px 8px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.ink};text-align:right;white-space:nowrap;">${escapeHtml(formatPrice(item.totalMinorUnits, currencyCode))}</td>
</tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<thead><tr>
<th style="text-align:left;padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:${BRAND.muted};border-bottom:2px solid ${BRAND.accent};">Item</th>
<th style="text-align:right;padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:${BRAND.muted};border-bottom:2px solid ${BRAND.accent};">Total</th>
</tr></thead>
<tbody>${rows}</tbody></table>`;
}

export interface OrderTotalsRow {
  subtotalMinorUnits: number;
  shippingMinorUnits: number;
  taxMinorUnits: number;
  discountMinorUnits: number;
  totalMinorUnits: number;
}

export function renderTotalsBlock(totals: OrderTotalsRow, currencyCode: string): string {
  const discountRow =
    totals.discountMinorUnits > 0
      ? `<tr><td style="padding:4px 0;font-size:13px;color:${BRAND.muted};">Discount</td><td style="padding:4px 0;font-size:13px;color:${BRAND.success};text-align:right;">&minus; ${escapeHtml(formatPrice(totals.discountMinorUnits, currencyCode))}</td></tr>`
      : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr><td style="padding:4px 0;font-size:13px;color:${BRAND.muted};">Subtotal</td><td style="padding:4px 0;font-size:13px;color:${BRAND.ink};text-align:right;">${escapeHtml(formatPrice(totals.subtotalMinorUnits, currencyCode))}</td></tr>
<tr><td style="padding:4px 0;font-size:13px;color:${BRAND.muted};">Shipping</td><td style="padding:4px 0;font-size:13px;color:${BRAND.ink};text-align:right;">${escapeHtml(formatPrice(totals.shippingMinorUnits, currencyCode))}</td></tr>
<tr><td style="padding:4px 0;font-size:13px;color:${BRAND.muted};">Tax</td><td style="padding:4px 0;font-size:13px;color:${BRAND.ink};text-align:right;">${escapeHtml(formatPrice(totals.taxMinorUnits, currencyCode))}</td></tr>
${discountRow}
<tr><td style="padding:8px 0 0;font-size:15px;font-weight:bold;color:${BRAND.ink};border-top:2px solid ${BRAND.accent};">Total</td><td style="padding:8px 0 0;font-size:15px;font-weight:bold;color:${BRAND.ink};border-top:2px solid ${BRAND.accent};text-align:right;">${escapeHtml(formatPrice(totals.totalMinorUnits, currencyCode))}</td></tr>
</table>`;
}

export function renderProductGrid(products: EmailProduct[]): string {
  if (products.length === 0) return '';
  const rows: string[] = [];
  for (let i = 0; i < products.length; i += 2) {
    const p1 = products[i];
    const p2 = products[i + 1];
    const cell1 = p1 ? renderProductCell(p1) : '<td width="50%"></td>';
    const cell2 = p2 ? renderProductCell(p2) : '<td width="50%"></td>';
    rows.push(`<tr>${cell1}${cell2}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${rows.join('')}</tbody></table>`;
}

function renderProductCell(product: EmailProduct): string {
  const imageCell = product.image
    ? `<img src="${escapeHtml(product.image)}" width="190" alt="" style="border-radius:8px;display:block;" />`
    : `<span style="width:190px;height:190px;display:block;background-color:#f1ecf8;border-radius:8px;"></span>`;
  const price =
    product.oldPriceMinorUnits && product.oldPriceMinorUnits > product.priceMinorUnits
      ? `<s style="color:${BRAND.muted};font-size:11px;">${escapeHtml(formatPrice(product.oldPriceMinorUnits, product.currencyCode))}</s> <strong style="color:${BRAND.danger};font-size:14px;">${escapeHtml(formatPrice(product.priceMinorUnits, product.currencyCode))}</strong>`
      : `<strong style="color:${BRAND.ink};font-size:14px;">${escapeHtml(formatPrice(product.priceMinorUnits, product.currencyCode))}</strong>`;
  return `<td width="50%" style="padding:8px;vertical-align:top;">
<a href="${escapeHtml(product.url)}" style="text-decoration:none;color:inherit;">
${imageCell}
<div style="margin-top:8px;font-size:12px;line-height:1.4;color:${BRAND.ink};">${escapeHtml(product.name)}</div>
<div style="margin-top:4px;">${price}</div>
</a>
</td>`;
}

export function renderCodeBox(code: string): string {
  return `<div style="margin:16px 0;border:2px dashed ${BRAND.accent};border-radius:10px;padding:18px;text-align:center;">
<span style="font-size:24px;font-weight:bold;letter-spacing:4px;color:${BRAND.accentDeep};">${escapeHtml(code)}</span>
</div>`;
}

export function renderHero(options: { eyebrow?: string; heading: string; subheading?: string; accent?: 'primary' | 'success' }): string {
  const accent = options.accent === 'success' ? '#0d9488' : BRAND.accent;
  const eyebrow = options.eyebrow
    ? `<div style="margin:0 0 8px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1.2px;color:#ffffff;opacity:0.85;">${escapeHtml(options.eyebrow)}</div>`
    : '';
  const sub = options.subheading
    ? `<div style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.92;">${escapeHtml(options.subheading)}</div>`
    : '';
  return `<div style="background:linear-gradient(135deg,${BRAND.accentDeep} 0%,${accent} 100%);border-radius:12px;padding:26px 24px;margin:0 0 24px;text-align:center;">
${eyebrow}
<div style="margin:0;font-size:22px;line-height:1.3;font-weight:bold;color:#ffffff;">${escapeHtml(options.heading)}</div>
${sub}
</div>`;
}

export interface EmailLayoutOptions {
  preheader: string;
  body: string;
  footer?: {
    reason?: string;
    unsubscribeUrl?: string;
    manageUrl?: string;
    keepOpen?: boolean;
  };
}

function footerHtml(footer: EmailLayoutOptions['footer']): string {
  const year = new Date().getFullYear();
  const items: string[] = [];
  if (footer?.keepOpen) {
    items.push(
      `You received this because of activity on your Storegrill account. Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.accent};text-decoration:none;">${SUPPORT_EMAIL}</a>`,
    );
  } else if (footer?.unsubscribeUrl) {
    const reason = footer.reason ?? 'You are receiving this because you are a Storegrill customer.';
    items.push(
      `${escapeHtml(reason)} <a href="${escapeHtml(footer.unsubscribeUrl)}" style="color:${BRAND.accent};text-decoration:none;">Unsubscribe</a>` +
        (footer.manageUrl
          ? ` &middot; <a href="${escapeHtml(footer.manageUrl)}" style="color:${BRAND.accent};text-decoration:none;">Manage preferences</a>`
          : ''),
    );
  } else {
    items.push(
      `Questions about your order? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.accent};">${SUPPORT_EMAIL}</a>`,
    );
  }
  return `<tr><td style="background-color:${BRAND.cardBg};border-radius:0 0 14px 14px;border:1px solid ${BRAND.border};border-top:none;padding:8px 28px 28px;">
<div style="font-size:11px;color:${BRAND.muted};line-height:1.8;">
${items.join('<br />')}<br />
${COMPANY_LINE} &middot; &copy; ${year} Storegrill Inc Ltd. All rights reserved.
</div>
</td></tr>`;
}

export function emailLayout(options: EmailLayoutOptions): string {
  const footer = footerHtml(options.footer);
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Storegrill</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
a { text-decoration: none; }
@media (prefers-color-scheme: dark) {
  body, .sg-body { background-color: #17121f !important; }
  .sg-card { background-color: #1f1a28 !important; }
  .sg-footer { background-color: #1f1a28 !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bodyBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
${escapeHtml(options.preheader)}
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sg-body" style="background-color:${BRAND.bodyBg};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr>
<td style="border-radius:14px 14px 0 0;background:linear-gradient(135deg,${BRAND.accentDeep} 0%,${BRAND.accent} 100%);padding:22px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px;">Storegrill</td>
<td align="right" style="color:#ffffff;opacity:0.8;font-size:12px;">Shop trusted partners<br />in your local currency</td>
</tr></table>
</td>
</tr>
<tr>
<td class="sg-card" style="background-color:${BRAND.cardBg};padding:32px 28px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
${options.body}
</td>
</tr>
${footer}
</table>
</td></tr>
</table>
</body>
</html>`;
}

export interface LifecycleEmail {
  subject: string;
  text: string;
  html: string;
}

export interface WelcomeEmailInput {
  name: string;
  shopUrl: string;
  confirmationUrl?: string | null;
}

export function renderWelcomeEmail(input: WelcomeEmailInput): LifecycleEmail {
  const body = `
${renderHero({
  eyebrow: 'Welcome to Storegrill',
  heading: `Hi ${input.name}, you're all set`,
  subheading: 'Multivendor shopping with transparent local-currency pricing, fast tracked delivery and secure payments.',
})}
${sectionHeading('What you can do with your account')}
${paragraph('Track every parcel and reorder in one tap, save products to your wishlist, and get notified about price drops and back-in-stock moments.', { muted: true })}
${emailButton(input.shopUrl, 'Start shopping', { secondary: true })}
${input.confirmationUrl ? `<p style="margin:16px 0 0;font-size:12px;color:${BRAND.muted};">If you have not yet confirmed your email, <a href="${escapeHtml(input.confirmationUrl)}" style="color:${BRAND.accent};">confirm it here</a> to unlock checkout and reviews.</p>` : ''}`;
  return {
    subject: 'Welcome to Storegrill',
    text: `Hi ${input.name}, thanks for joining Storegrill. Shop trusted partners and track every order here: ${input.shopUrl}`,
    html: emailLayout({ preheader: 'Welcome to Storegrill — your account is ready.', body, footer: { keepOpen: true } }),
  };
}

export interface LifecycleProductItem {
  name: string;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
  image?: string | null;
  url: string;
}

export interface AbandonedCartEmailInput {
  name: string;
  items: LifecycleProductItem[];
  currencyCode: string;
  subtotalMinorUnits: number;
  checkoutUrl: string;
  cartUrl: string;
  ctaLabel?: string;
}

export function renderAbandonedCartEmail(input: AbandonedCartEmailInput): LifecycleEmail {
  const bodyItems = renderItemsTable(
    input.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceMinorUnits: item.unitPriceMinorUnits,
      totalMinorUnits: item.totalMinorUnits,
      image: item.image,
    })),
    input.currencyCode,
  );
  const body = `
${renderHero({ eyebrow: 'Still thinking it over?', heading: `Your cart is waiting, ${input.name}`, subheading: 'These items are reserved in your cart. Complete your order and we will arrange tracked delivery.' })}
${sectionHeading('Your cart', { muted: true, small: true })}
${bodyItems}
<p style="margin:12px 0 0;font-size:13px;color:${BRAND.muted};text-align:right;">Subtotal <strong style="color:${BRAND.ink};">${escapeHtml(formatPrice(input.subtotalMinorUnits, input.currencyCode))}</strong></p>
${emailButton(input.checkoutUrl, input.ctaLabel ?? 'Checkout now')}
<p style="margin:0;font-size:12px;color:${BRAND.muted};text-align:center;"><a href="${escapeHtml(input.cartUrl)}" style="color:${BRAND.accent};">View your cart</a></p>`;
  return {
    subject: `Your Storegrill cart (${input.items.length} item${input.items.length === 1 ? '' : 's'}) is waiting`,
    text: `Your cart is waiting, ${input.name}. Finish your order here: ${input.checkoutUrl}`,
    html: emailLayout({ preheader: `Items worth ${formatPrice(input.subtotalMinorUnits, input.currencyCode)} are still in your cart.`, body }),
  };
}

export interface PriceDropProduct {
  name: string;
  oldPriceMinorUnits: number;
  newPriceMinorUnits: number;
  currencyCode: string;
  image?: string | null;
  url: string;
}

export interface WishlistPriceDropEmailInput {
  name: string;
  products: PriceDropProduct[];
  wishlistUrl: string;
}

export function renderWishlistPriceDropEmail(input: WishlistPriceDropEmailInput): LifecycleEmail {
  const maxDiscountPct = input.products.reduce((max, product) => {
    const discountPct = Math.round(((product.oldPriceMinorUnits - product.newPriceMinorUnits) / product.oldPriceMinorUnits) * 100);
    return Math.max(max, discountPct);
  }, 0);
  const subject =
    maxDiscountPct > 0
      ? `Price drop: save up to ${maxDiscountPct}% on your Storegrill wishlist`
      : 'Price drops on your Storegrill wishlist';
  const body = `
${renderHero({
  eyebrow: 'Price drop on your wishlist',
  heading: `Good news, ${input.name}`,
  subheading: 'Items you saved are now priced lower.',
})}
${renderProductGrid(
  input.products.map(product => ({
    name: product.name,
    priceMinorUnits: product.newPriceMinorUnits,
    currencyCode: product.currencyCode,
    image: product.image,
    url: product.url,
    oldPriceMinorUnits: product.oldPriceMinorUnits,
  })),
)}
${emailButton(input.wishlistUrl, 'View your wishlist', { secondary: true })}`;
  return {
    subject,
    text: `${input.products.length} product(s) on your wishlist have dropped in price. View them: ${input.wishlistUrl}`,
    html: emailLayout({ preheader: 'One or more wishlist items just got cheaper.', body }),
  };
}

export interface BackInStockEmailInput {
  name: string;
  products: Array<{ name: string; priceMinorUnits: number; currencyCode: string; image?: string | null; url: string }>;
  shopUrl: string;
}

export function renderBackInStockEmail(input: BackInStockEmailInput): LifecycleEmail {
  const body = `
${renderHero({ eyebrow: 'Back in stock', heading: `It's back, ${input.name}`, subheading: 'An item you wanted is available again.' })}
${renderProductGrid(input.products.map(p => ({ name: p.name, priceMinorUnits: p.priceMinorUnits, currencyCode: p.currencyCode, image: p.image, url: p.url })))}
${emailButton(input.shopUrl, 'Shop now')}`;
  return {
    subject: 'Back in stock: items from your wishlist',
    text: `A wishlist item is back in stock. Grab it before it sells out: ${input.shopUrl}`,
    html: emailLayout({ preheader: 'An item you wanted is available again on Storegrill.', body }),
  };
}

export interface BrowseRemarketingEmailInput {
  name: string;
  products: Array<{ name: string; priceMinorUnits: number; currencyCode: string; image?: string | null; url: string }>;
  shopUrl: string;
}

export function renderBrowseRemarketingEmail(input: BrowseRemarketingEmailInput): LifecycleEmail {
  const body = `
${renderHero({ eyebrow: 'You might still like these', heading: `Hi ${input.name}, still browsing?` })}
${renderProductGrid(input.products.map(p => ({ name: p.name, priceMinorUnits: p.priceMinorUnits, currencyCode: p.currencyCode, image: p.image, url: p.url })))}
${emailButton(input.shopUrl, 'See what\u2019s new', { secondary: true })}`;
  return {
    subject: 'Some items you viewed are still available',
    text: `We noticed you were browsing a few products. They're still available: ${input.shopUrl}`,
    html: emailLayout({ preheader: 'Items you looked at recently are still available on Storegrill.', body }),
  };
}

export interface WinBackEmailInput {
  name: string;
  incentive?: { label: string; code: string; expiresAt?: Date };
  shopUrl: string;
}

export function renderWinBackEmail(input: WinBackEmailInput): LifecycleEmail {
  const incentive = input.incentive
    ? `<div style="margin:0 0 20px;">
${sectionHeading('A little something to welcome you back', { muted: true, small: true })}
${renderCodeBox(input.incentive.code)}
<p style="margin:0;font-size:12px;color:${BRAND.muted};text-align:center;">${escapeHtml(input.incentive.label)}${input.incentive.expiresAt ? ` &middot; expires ${input.incentive.expiresAt.toLocaleDateString()} ` : ''}</p>
</div>`
    : '';
  const body = `
${renderHero({ eyebrow: 'We miss you', heading: `Welcome back, ${input.name}`, subheading: 'Your wishlist and cart are saved. Pick up where you left off.' })}
${incentive}
${emailButton(input.shopUrl, 'Return to Storegrill')}`;
  return {
    subject: 'Welcome back to Storegrill',
    text: `Welcome back, ${input.name}. Your cart and wishlist are still saved: ${input.shopUrl}`,
    html: emailLayout({ preheader: 'Welcome back. Your cart and wishlist are still here.', body }),
  };
}

export interface ReviewRequestEmailInput {
  name: string;
  orderNumber: string;
  products: Array<{ name: string; reviewUrl: string }>;
}

export function renderReviewRequestEmail(input: ReviewRequestEmailInput): LifecycleEmail {
  const items = input.products
    .map(
      p => `<tr><td style="padding:8px 8px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.ink};">${escapeHtml(p.name)}</td>
<td align="right" style="padding:8px 8px;border-bottom:1px solid ${BRAND.border};">${emailButton(p.reviewUrl, 'Rate &amp; review', { secondary: true })}</td></tr>`,
    )
    .join('');
  const body = `
${renderHero({ eyebrow: 'Enjoying your purchase?', heading: `Tell us about order ${input.orderNumber}`, subheading: 'Your short review helps other shoppers make confident choices.' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${items}</tbody></table>
<p style="margin:14px 0 0;font-size:12px;color:${BRAND.muted};">Honest feedback, good or bad, shapes the store — thank you for your time.</p>`;
  return {
    subject: `Review your order ${input.orderNumber}`,
    text: `Orders like ${input.orderNumber} help the community. Write a review: ${input.products[0]?.reviewUrl ?? ''}`,
    html: emailLayout({ preheader: 'Share your experience with a quick review.', body, footer: { keepOpen: true } }),
  };
}

export interface OrderFollowUpEmailInput {
  name: string;
  orderNumber: string;
  orderUrl: string;
  helpUrl: string;
  reviewUrl: string;
}

export function renderOrderFollowUpEmail(input: OrderFollowUpEmailInput): LifecycleEmail {
  const body = `
${renderHero({ eyebrow: 'How did everything go?', heading: `A note about order ${input.orderNumber}`, subheading: `We would love to make sure everything arrived as expected, ${input.name}.` })}
${emailButton(input.reviewUrl, 'Share your feedback', { secondary: true })}
${paragraph('If anything is missing, damaged or late, our support team is a message away and vendors are accountable for a fast resolution.', { muted: true })}
${emailButton(input.helpUrl, 'Contact support')}
<p style="margin:4px 0 0;font-size:12px;color:${BRAND.muted};text-align:center;"><a href="${escapeHtml(input.orderUrl)}" style="color:${BRAND.accent};">View order details</a></p>`;
  return {
    subject: `How was your Storegrill order ${input.orderNumber}?`,
    text: `We hope your order arrived safely. Feedback helps us improve: ${input.reviewUrl}`,
    html: emailLayout({ preheader: 'We hope your order arrived safely — we value your feedback.', body, footer: { keepOpen: true } }),
  };
}

export interface PromotionEmailInput {
  name: string;
  campaignTitle: string;
  message: string;
  code?: string;
  expiresAt?: Date;
  ctaLabel: string;
  ctaUrl: string;
}

export function renderPromotionEmail(input: PromotionEmailInput): LifecycleEmail {
  const codeBlock = input.code ? `<div style="margin:0 0 20px;">${renderCodeBox(input.code)}</div>` : '';
  const expires = input.expiresAt
    ? `<p style="margin:0 0 16px;font-size:12px;color:${BRAND.muted};text-align:center;">Valid until ${input.expiresAt.toLocaleDateString()}</p>`
    : '';
  const body = `
${renderHero({ eyebrow: 'For you', heading: input.campaignTitle })}
${paragraph(input.message, { muted: true })}
${codeBlock}
${emailButton(input.ctaUrl, input.ctaLabel)}
${expires}`;
  return {
    subject: input.campaignTitle,
    text: `${input.message} ${input.ctaUrl}`,
    html: emailLayout({ preheader: input.campaignTitle, body }),
  };
}