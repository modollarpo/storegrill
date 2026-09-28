import { Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import { AddressSchema } from '@Storegrill/shared';
import { createAsyncRouter } from '../middleware/asyncRouter.js';import {
  MAX_SAVED_ADDRESSES,
  assertValidAddress,
  loadAddresses,
  persistAddresses,
  toSaved,
  upsertAddress,
  withDefaultFirst,
  type AddressDraft,
} from '../lib/addresses.js';

const router = createAsyncRouter();

const AddressBodySchema = AddressSchema.omit({ id: true, isDefault: true });

const AddressUpdateSchema = AddressBodySchema.partial().extend({ isDefault: z.boolean().optional() });

function draftFrom(body: z.infer<typeof AddressBodySchema>): AddressDraft {
  return { ...body, isDefault: false };
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const addresses = await loadAddresses(req.user!.id);
  res.json({ addresses });
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const draft = draftFrom(AddressBodySchema.parse(req.body));
  assertValidAddress(draft);

  const existing = await loadAddresses(req.user!.id);
  const { list, created, address } = upsertAddress(existing, draft);
  const addresses = await persistAddresses(req.user!.id, list);

  res.status(created ? 201 : 200).json({ address, addresses });
});

router.put('/:id/default', authenticate, async (req: AuthRequest, res: Response) => {
  const existing = await loadAddresses(req.user!.id);
  if (!existing.some(a => a.id === req.params.id)) throw new NotFoundError('Address');

  const addresses = await persistAddresses(
    req.user!.id,
    withDefaultFirst(existing.map(a => ({ ...a, isDefault: a.id === req.params.id })))
  );

  res.json({ addresses });
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const existing = await loadAddresses(req.user!.id);
  const index = existing.findIndex(a => a.id === req.params.id);
  if (index === -1) throw new NotFoundError('Address');

  const body = AddressUpdateSchema.parse(req.body);
  const current = existing[index];
  const merged = { ...current, ...body, id: current.id };
  assertValidAddress(merged);

  const next = [...existing];
  next[index] = toSaved(merged);
  if (body.isDefault === true) {
    return res.json({ addresses: await persistAddresses(req.user!.id, withDefaultFirst(next)) });
  }
  const addresses = await persistAddresses(req.user!.id, next);
  res.json({ address: addresses.find(a => a.id === current.id), addresses });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const existing = await loadAddresses(req.user!.id);
  if (!existing.some(a => a.id === req.params.id)) throw new NotFoundError('Address');

  const addresses = await persistAddresses(
    req.user!.id,
    existing.filter(a => a.id !== req.params.id)
  );

  res.json({ addresses, limit: MAX_SAVED_ADDRESSES });
});

export const addressesRouter = router;
