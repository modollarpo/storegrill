import { prisma } from '../db/prisma.js';

export type CompanionReason = 'authored' | 'similar' | 'cooccurrence';

export interface CompanionCandidate {
  productId: string;
  reason: CompanionReason;
  weight: number;
}

export interface CompanionOptions {
  limit?: number;
  includeReasons?: boolean;
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseAttributes(raw: unknown): Array<{ name: string; value: string }> {
  if (Array.isArray(raw)) return raw as Array<{ name: string; value: string }>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Array<{ name: string; value: string }>) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const inter = a.reduce((n, v) => n + (setB.has(v) ? 1 : 0), 0);
  const union = a.length + b.length - inter;
  return union === 0 ? 0 : inter / union;
}

function attributeOverlap(a: Array<{ name: string; value: string }>, b: Array<{ name: string; value: string }>): number {
  if (a.length === 0 || b.length === 0) return 0;
  const keysB = new Set(b.map(x => `${x.name.toLowerCase()}\u0001${x.value.toLowerCase()}`));
  return a.reduce((n, x) => n + (keysB.has(`${x.name.toLowerCase()}\u0001${x.value.toLowerCase()}`) ? 1 : 0), 0);
}

export function scoreSimilarity(base: {
  categoryId: string;
  brandId?: string | null;
  tags?: unknown;
  attributes?: unknown;
}, candidate: {
  categoryId: string;
  brandId?: string | null;
  tags?: unknown;
  attributes?: unknown;
}): number {
  let weight = 0;
  if (candidate.categoryId === base.categoryId) weight += 2;
  else weight += 1;

  weight += jaccard(parseTags(base.tags), parseTags(candidate.tags)) * 1.5;
  weight += Math.min(2, attributeOverlap(parseAttributes(base.attributes), parseAttributes(candidate.attributes)) * 0.8);

  if (base.brandId && candidate.brandId && base.brandId === candidate.brandId) weight += 0.3;

  return Number(weight.toFixed(3));
}

interface CompanionRow {
  id: string;
  categoryId: string;
  brandId: string | null;
  tags: unknown;
  attributes: unknown;
}

export async function getCompanions(
  identifier: string,
  opts: CompanionOptions = {}
): Promise<CompanionCandidate[]> {
  const limit = opts.limit ?? 6;

  const main = await prisma.product.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }] },
    select: {
      id: true,
      category: { select: { id: true, parentId: true } },
      brandId: true,
      tags: true,
      attributes: true,
    },
  });

  if (!main) return [];

  const result: CompanionCandidate[] = [];
  const seen = new Set<string>([main.id]);

  const pushUnique = (candidates: CompanionCandidate[]) => {
    for (const c of candidates) {
      if (seen.has(c.productId)) continue;
      seen.add(c.productId);
      result.push(c);
      if (result.length >= limit) return;
    }
  };

  // Tier 1: Authored complements (explicit "goes with this", symmetric relation).
  const authored = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { compatibleWith: { some: { id: main.id } } },
        { relatedTo: { some: { id: main.id } } },
      ],
    },
    select: { id: true, _count: { select: { variants: { where: { stock: { gt: 0 } } } } } },
  });

  const authoredSorted = authored
    .map(p => ({ productId: p.id, reason: 'authored' as const, weight: 100 + p._count.variants }))
    .sort((a, b) => b.weight - a.weight);
  pushUnique(authoredSorted);

  if (result.length >= limit) {
    return finalize(result, opts.limit);
  }

  // Co-occurrence seam: when real order volume arrives, look up precomputed
  // co-purchase pairs here (reason 'cooccurrence') and rank above 'similar'.

  // Tier 2: Similarity fallback across the category subtree + sibling categories.
  const categoryIds: string[] = [];
  if (main.category) {
    categoryIds.push(main.category.id);
    if (main.category.parentId) {
      const siblings = await prisma.category.findMany({
        where: { parentId: main.category.parentId },
        select: { id: true },
      });
      for (const s of siblings) if (s.id !== main.category.id) categoryIds.push(s.id);
    }
  }

  const candidates: CompanionRow[] = [];
  if (categoryIds.length > 0) {
    const rows = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        categoryId: { in: categoryIds },
        id: { not: main.id },
      },
      select: { id: true, categoryId: true, brandId: true, tags: true, attributes: true },
      take: limit * 10,
    });
    candidates.push(...rows);
  }

  const scored: CompanionCandidate[] = candidates.map(c => {
    const weight = scoreSimilarity(
      { categoryId: main.category!.id, brandId: main.brandId, tags: main.tags, attributes: main.attributes },
      { categoryId: c.categoryId, brandId: c.brandId, tags: c.tags, attributes: c.attributes }
    );
    return { productId: c.id, reason: 'similar' as const, weight };
  });

  scored.sort((a, b) => b.weight - a.weight);
  pushUnique(scored);

  return finalize(result, opts.limit);
}

function finalize(candidates: CompanionCandidate[], limit?: number): CompanionCandidate[] {
  return (limit ? candidates.slice(0, limit) : candidates).map(c => ({
    productId: c.productId,
    reason: c.reason,
    weight: c.weight,
  }));
}