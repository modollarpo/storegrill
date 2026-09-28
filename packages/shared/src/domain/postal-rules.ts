/**
 * Postal address format rules, keyed by ISO 3166-1 alpha-2 country code.
 *
 * SCOPE AND LIMITS: these rules validate the SHAPE of an address only (required
 * fields present, postcode matches the country's published format). They do NOT
 * prove an address exists, is occupied, or is deliverable — only a carrier or a
 * paid address-validation service can do that. The purpose here is to reject
 * input that cannot possibly be a real address for the selected country, so
 * obvious typos never reach the order table.
 *
 * Region is data, not code: adding a country is a data change, never a branch.
 */

export interface PostalRule {
  /** Anchored, case-insensitive. Null means the country issues no postcodes. */
  pattern: string | null;
  /** True when the country has no postal code system, or accepts none at all. */
  zipOptional: boolean;
  /** True when a state/province/region must be supplied, not inferred from the postcode. */
  stateRequired: boolean;
}

const NO_POSTCODE: PostalRule = { pattern: null, zipOptional: true, stateRequired: false };
const POSTCODE_4: PostalRule = { pattern: '\\d{4}', zipOptional: false, stateRequired: false };
const POSTCODE_5: PostalRule = { pattern: '\\d{5}', zipOptional: false, stateRequired: false };
const POSTCODE_6: PostalRule = { pattern: '\\d{6}', zipOptional: false, stateRequired: false };

export const POSTAL_RULES: Record<string, PostalRule> = {
  GB: { pattern: '[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}', zipOptional: false, stateRequired: false },
  US: { pattern: '\\d{5}(-\\d{4})?', zipOptional: false, stateRequired: true },
  CA: { pattern: '[A-Z]\\d[A-Z]\\s?\\d[A-Z]\\d', zipOptional: false, stateRequired: true },
  IE: { pattern: '[A-Z]\\d{2}\\s?[A-Z\\d]{4}', zipOptional: false, stateRequired: false },
  DE: POSTCODE_5,
  AT: POSTCODE_4,
  CH: POSTCODE_4,
  LI: POSTCODE_4,
  LU: POSTCODE_4,
  FR: POSTCODE_5,
  BE: POSTCODE_4,
  MC: { pattern: '98\\d{3}', zipOptional: false, stateRequired: false },
  IT: POSTCODE_5,
  SM: { pattern: '4789\\d', zipOptional: false, stateRequired: true },
  VA: { pattern: '00120', zipOptional: false, stateRequired: false },
  ES: POSTCODE_5,
  AD: { pattern: 'AD\\d{3}', zipOptional: false, stateRequired: false },
  PT: { pattern: '\\d{4}-\\d{3}', zipOptional: false, stateRequired: false },
  NL: { pattern: '\\d{4}\\s?[A-Z]{2}', zipOptional: false, stateRequired: false },
  SE: { pattern: '\\d{3}\\s?\\d{2}', zipOptional: false, stateRequired: false },
  NO: POSTCODE_4,
  DK: POSTCODE_4,
  FI: POSTCODE_5,
  EE: POSTCODE_5,
  LV: { pattern: 'LV-?\\d{4}', zipOptional: false, stateRequired: false },
  LT: { pattern: 'LT-?\\d{5}', zipOptional: false, stateRequired: false },
  PL: { pattern: '\\d{2}-\\d{3}', zipOptional: false, stateRequired: false },
  CZ: { pattern: '\\d{3}\\s?\\d{2}', zipOptional: false, stateRequired: false },
  SK: { pattern: '\\d{3}\\s?\\d{2}', zipOptional: false, stateRequired: false },
  HU: POSTCODE_4,
  RO: POSTCODE_6,
  BG: POSTCODE_4,
  HR: POSTCODE_5,
  SI: POSTCODE_4,
  GR: { pattern: '\\d{3}\\s?\\d{2}', zipOptional: false, stateRequired: false },
  CY: POSTCODE_4,
  MT: { pattern: '[A-Z]{3}\\s?\\d{4}', zipOptional: false, stateRequired: false },
  AU: POSTCODE_4,
  NZ: POSTCODE_4,
  JP: { pattern: '\\d{3}-?\\d{4}', zipOptional: false, stateRequired: true },
  IN: { ...POSTCODE_6, stateRequired: true },
  AE: NO_POSTCODE,
  SA: POSTCODE_5,
  QA: NO_POSTCODE,
  KW: POSTCODE_5,
  BH: { pattern: '\\d{3,4}', zipOptional: false, stateRequired: false },
  OM: { pattern: '\\d{3}', zipOptional: false, stateRequired: false },
  NG: POSTCODE_6,
  GH: NO_POSTCODE,
  KE: POSTCODE_5,
  UG: POSTCODE_5,
  ZA: POSTCODE_4,
  NA: POSTCODE_5,
  BW: { pattern: '\\d{3}', zipOptional: true, stateRequired: false },
  LS: { pattern: '\\d{3}', zipOptional: true, stateRequired: false },
  SZ: { pattern: '[HLMS]\\d{3}', zipOptional: true, stateRequired: false },
  EG: POSTCODE_5,
  MA: POSTCODE_5,
  EH: { pattern: '\\d{5}', zipOptional: true, stateRequired: false },
  TZ: { pattern: '\\d{5}', zipOptional: true, stateRequired: false },
};

/** Fallback for any country shipping to that is not yet tabulated. */
const FALLBACK: PostalRule = { pattern: '[A-Z0-9][A-Z0-9 -]{0,10}', zipOptional: true, stateRequired: false };

export function postalRuleFor(country: string): PostalRule {
  return POSTAL_RULES[country.trim().toUpperCase()] ?? FALLBACK;
}

export function postalCodePatternFor(country: string): RegExp | null {
  const rule = postalRuleFor(country);
  return rule.pattern ? new RegExp(`^(?:${rule.pattern})$`, 'i') : null;
}
