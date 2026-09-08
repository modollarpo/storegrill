import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  console.error('Set DATABASE_URL to the pod PostgreSQL connection string first.');
  process.exit(1);
}

async function main() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true, isFeatured: true, displayOrder: true, tagline: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  const byId = new Map(categories.map(c => [c.id, c]));
  const roots = categories.filter(c => !c.parentId || !byId.has(c.parentId));
  const active = new Map(
    (await prisma.product.groupBy({ by: ['categoryId'], where: { status: 'ACTIVE' }, _count: true })).map(
      r => [r.categoryId, r._count] as const,
    ),
  );

  console.log(`roots: ${roots.length}`);
  const featured = roots
    .filter(r => r.isFeatured)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  console.log(`featured: ${featured.length}`);
  for (const r of featured) {
    console.log(`  #${r.displayOrder} ${r.name} (${active.get(r.id) ?? 0} direct) tagline=${r.tagline ? 'yes' : 'NO'}`);
  }

  const problems: string[] = [];
  const vendors = new Set((await prisma.vendorProfile.findMany({ select: { storeName: true } })).map(v => v.storeName.toLowerCase().trim()));
  for (const r of roots) {
    if (vendors.has(r.name.toLowerCase().trim())) problems.push(`vendor-named root still present: ${r.name}`);
  }
  for (const dup of groupBy(roots, r => r.name.toLowerCase().trim())) {
    if (dup.length > 1) problems.push(`duplicate root name: ${dup[0].name} x${dup.length}`);
  }
  for (const r of roots.filter(r => !r.isFeatured && r.displayOrder !== 0)) {
    problems.push(`non-featured root with displayOrder: ${r.name}`);
  }
  if (problems.length) {
    console.log('\nPROBLEMS:');
    for (const p of problems) console.log(' - ' + p);
  } else {
    console.log('\nCuration OK.');
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): T[][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (map.has(k)) map.get(k)!.push(item);
    else map.set(k, [item]);
  }
  return [...map.values()].filter(g => g.length > 1);
}

main()
  .catch(e => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());