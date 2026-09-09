import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  console.error('Set DATABASE_URL to the pod PostgreSQL connection string first.');
  process.exit(1);
}

async function main() {
  const now = new Date();
  const candidates = await prisma.deal.findMany({
    where: {
      enabled: true,
      status: 'PROPOSED',
      startsAt: { lte: now },
      endsAt: { gte: now },
      variants: { some: {} },
    },
    select: { id: true, name: true, type: true, value: true, variants: { select: { productId: true } } },
  });

  if (candidates.length === 0) {
    console.log('No in-window proposed deals with variants to promote.');
    return;
  }

  const ids = candidates.map(d => d.id);
  const result = await prisma.deal.updateMany({
    where: { id: { in: ids } },
    data: { status: 'LIVE' },
  });

  console.log(`Promoted ${result.count} deal(s) to LIVE:`);
  for (const d of candidates) {
    console.log(`  - ${d.name} (${d.type} ${d.value}, ${d.variants.length} variants)`);
  }
}

main()
  .catch(e => {
    console.error('Promotion failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());