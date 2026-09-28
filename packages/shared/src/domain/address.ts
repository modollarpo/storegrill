import { z } from 'zod';
import { postalRuleFor } from './postal-rules.js';

/**
 * Canonical address shape. `street`/`city`/`state`/`zip`/`country` are kept as-is
 * so rows written before `line2` existed still parse. `state` is optional because
 * most countries have no state or province; `line2` carries apartment/suite/unit
 * so it can never be confused with a region the way it was before.
 */
export const AddressSchema = z.object({
  id: z.string().optional(),
  label: z.string().max(50).default('Home'),
  street: z.string().min(1).max(200),
  line2: z.string().max(200).optional().default(''),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().default(''),
  zip: z.string().max(20).optional().default(''),
  country: z.string().length(2).transform(c => c.toUpperCase()),
  isDefault: z.boolean().default(false),
});

export type Address = z.infer<typeof AddressSchema>;

export const SavedAddressSchema = AddressSchema.extend({ id: z.string() });

export type SavedAddress = z.infer<typeof SavedAddressSchema>;

export type AddressField = 'street' | 'line2' | 'city' | 'state' | 'zip' | 'country';

export type AddressIssueCode =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'badCountry'
  | 'badPostcode'
  | 'postcodeRequired'
  | 'stateRequired';

export interface AddressIssue {
  field: AddressField;
  code: AddressIssueCode;
}

export interface AddressValidation {
  ok: boolean;
  issues: AddressIssue[];
}

const MIN_STREET = 3;
const MIN_CITY = 2;

export function validateAddress(input: Partial<Address>): AddressValidation {
  const issues: AddressIssue[] = [];
  const country = (input.country ?? '').trim().toUpperCase();
  const rule = postalRuleFor(country);
  const street = (input.street ?? '').trim();
  const city = (input.city ?? '').trim();
  const state = (input.state ?? '').trim();
  const zip = (input.zip ?? '').trim();

  if (!/^[A-Za-z]{2}$/.test(country)) {
    issues.push({ field: 'country', code: 'badCountry' });
  }
  if (street.length < MIN_STREET) issues.push({ field: 'street', code: 'tooShort' });
  if (city.length < MIN_CITY) issues.push({ field: 'city', code: 'tooShort' });

  if (rule.stateRequired && !state) {
    issues.push({ field: 'state', code: 'stateRequired' });
  }

  if (rule.pattern) {
    if (!zip && !rule.zipOptional) issues.push({ field: 'zip', code: 'postcodeRequired' });
    else if (zip && !new RegExp(`^(?:${rule.pattern})$`, 'i').test(zip)) {
      issues.push({ field: 'zip', code: 'badPostcode' });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function addressIssuesByField(validation: AddressValidation): Partial<Record<AddressField, AddressIssueCode>> {
  const map: Partial<Record<AddressField, AddressIssueCode>> = {};
  for (const issue of validation.issues) {
    if (!map[issue.field]) map[issue.field] = issue.code;
  }
  return map;
}

export function formatAddressLines(input: Partial<Address>): string[] {
  const cityLine = [input.city, input.state].filter(Boolean).join(', ');
  return [input.street, input.line2, cityLine, input.zip].filter(
    (part): part is string => Boolean(part && part.trim())
  );
}
