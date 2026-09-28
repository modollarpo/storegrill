import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import { SavedAddressSchema, validateAddress, type Address, type SavedAddress } from '@Storegrill/shared';
import { ValidationError } from '../middleware/errorHandler.js';

export const MAX_SAVED_ADDRESSES = 10;

export type AddressDraft = Omit<Address, 'id'> & { id?: string };

/**
 * Reading is deliberately forgiving: the column is a JSON blob that predates
 * schema validation, so a single bad legacy row must not break checkout for
 * everyone. Anything that no longer parses is dropped.
 */
export function readAddresses(raw: string | null | undefined): SavedAddress[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const valid: SavedAddress[] = [];
  for (const entry of parsed) {
    const result = SavedAddressSchema.safeParse(entry);
    if (result.success) valid.push(result.data);
  }
  return valid;
}

export function serializeAddresses(list: SavedAddress[]): string {
  return JSON.stringify(list);
}

/** Exactly one entry is the default, and it is always first. */
export function withDefaultFirst(list: SavedAddress[]): SavedAddress[] {
  if (list.length === 0) return [];
  const anyDefault = list.some(a => a.isDefault);
  const ordered = anyDefault
    ? [...list.filter(a => a.isDefault), ...list.filter(a => !a.isDefault)]
    : [{ ...list[0], isDefault: true }, ...list.slice(1)];
  return ordered.map((a, i) => ({ ...a, isDefault: i === 0 }));
}

type AddressStore = {
  customerProfile: Pick<typeof prisma.customerProfile, 'findUnique' | 'upsert'>;
};

export async function loadAddresses(userId: string): Promise<SavedAddress[]> {
  return loadAddressesWith(prisma, userId);
}

export async function loadAddressesWith(db: AddressStore, userId: string): Promise<SavedAddress[]> {
  const profile = await db.customerProfile.findUnique({
    where: { userId },
    select: { shippingAddresses: true },
  });
  return withDefaultFirst(readAddresses(profile?.shippingAddresses));
}

export async function persistAddresses(userId: string, list: SavedAddress[]): Promise<SavedAddress[]> {
  return persistAddressesWith(prisma, userId, list);
}

export async function persistAddressesWith(
  db: AddressStore,
  userId: string,
  list: SavedAddress[]
): Promise<SavedAddress[]> {
  const normalized = withDefaultFirst(list);
  await db.customerProfile.upsert({
    where: { userId },
    create: { userId, shippingAddresses: serializeAddresses(normalized) },
    update: { shippingAddresses: serializeAddresses(normalized) },
  });
  return normalized;
}

/**
 * Saves the address used for an order. Runs inside the checkout transaction so a
 * newly created account never loses the address it was created with, even
 * though no login session exists yet at that point.
 */
export async function saveAddressForOrder(
  db: AddressStore,
  userId: string,
  draft: AddressDraft
): Promise<void> {
  const existing = await loadAddressesWith(db, userId);
  const { list } = upsertAddress(existing, draft);
  await persistAddressesWith(db, userId, list);
}

export function assertValidAddress(draft: AddressDraft): void {
  const result = validateAddress(draft);
  if (!result.ok) {
    throw new ValidationError('Address is not valid for the selected country', {
      fields: result.issues.map(issue => ({ path: issue.field, message: issue.code })),
    });
  }
}

export function toSaved(draft: AddressDraft): SavedAddress {
  return SavedAddressSchema.parse({ ...draft, id: draft.id ?? randomUUID() });
}

/** Adds an address unless an identical one is already stored for the user. */
export function upsertAddress(
  existing: SavedAddress[],
  draft: AddressDraft
): { list: SavedAddress[]; created: boolean; address: SavedAddress } {
  const same = (a: SavedAddress) =>
    a.street.trim().toLowerCase() === draft.street.trim().toLowerCase() &&
    (a.line2 ?? '').trim().toLowerCase() === (draft.line2 ?? '').trim().toLowerCase() &&
    a.city.trim().toLowerCase() === draft.city.trim().toLowerCase() &&
    (a.state ?? '').trim().toLowerCase() === (draft.state ?? '').trim().toLowerCase() &&
    a.zip.trim() === draft.zip.trim() &&
    a.country === draft.country;

  const match = existing.find(same);
  if (match) return { list: withDefaultFirst(existing), created: false, address: match };

  if (existing.length >= MAX_SAVED_ADDRESSES) {
    throw new ValidationError(`You can save up to ${MAX_SAVED_ADDRESSES} addresses`, {
      fields: [{ path: 'address', message: 'addressBookFull' }],
    });
  }

  const address = toSaved(draft);
  return {
    list: withDefaultFirst([...existing, address]),
    created: true,
    address,
  };
}
