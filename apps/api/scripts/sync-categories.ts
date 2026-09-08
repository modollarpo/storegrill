import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/utils/slugify.js';
import {
  CANONICAL_CATEGORY_PATHS,
  CANONICAL_ROOT_META,
  partsOf,
} from '../src/importers/category-taxonomy.js';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  console.error('Set DATABASE_URL to the pod PostgreSQL connection string first.');
  process.exit(1);
}

async function main() {
  const slugToId = new Map<string, string>();
  const parentBySlug = new Map<string, string | null>();
  for (const c of await prisma.category.findMany({ select: { id: true, slug: true, parentId: true } })) {
    slugToId.set(c.slug, c.id);
    parentBySlug.set(c.slug, c.parentId);
  }

  const plan: string[] = [];
  let created = 0;
  let reused = 0;

  const findOrCreate = async (name: string, parentId: string | null): Promise<string> => {
    const base = slugify(name);
    let slug = base;
    for (let suffix = 0; ; suffix++) {
      slug = suffix === 0 ? base : `${base}-${suffix}`;
      const existingId = slugToId.get(slug);
      if (existingId !== undefined && parentBySlug.get(slug) === parentId) {
        reused++;
        return existingId;
      }
      if (existingId !== undefined) continue;
      if (!APPLY) {
        slugToId.set(slug, `pending:${slug}`);
        parentBySlug.set(slug, parentId);
        plan.push(`would create "${name}" slug=${slug} (parent=${parentId ?? 'root'})`);
        created++;
        return `pending:${slug}`;
      }
      const category = await prisma.category.create({ data: { name, slug, parentId } });
      slugToId.set(slug, category.id);
      parentBySlug.set(slug, parentId);
      plan.push(`create "${name}" slug=${slug} (parent=${parentId ?? 'root'})`);
      created++;
      return category.id;
    }
  };

  for (const path of CANONICAL_CATEGORY_PATHS) {
    let parentId: string | null = null;
    for (const segment of partsOf(path)) {
      parentId = await findOrCreate(segment, parentId);
    }
  }

  for (const [name, meta] of Object.entries(CANONICAL_ROOT_META)) {
    const slug = slugify(name);
    const rootId = slugToId.get(slug) ?? null;
    if (!rootId) {
      plan.push(`MISSING ROOT "${name}" slug=${slug}`);
      continue;
    }
    plan.push(`set root "${name}" featured#${meta.displayOrder} tagline`);
    if (APPLY) {
      await prisma.category.update({
        where: { id: rootId },
        data: { isFeatured: true, displayOrder: meta.displayOrder, tagline: meta.tagline },
      });
    }
  }

  console.log(`Tree: ${CANONICAL_CATEGORY_PATHS.length} canonical path(s), ${reused} reused, ${created} to create.`);
  for (const line of plan) console.log(line);
  if (!APPLY) {
    console.log('\nDry run - pass --apply to create categories.');
  } else {
    console.log(`\nCreated ${created} categor(y|ies).`);
  }
}

main()
  .catch(e => {
    console.error('Category sync failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());