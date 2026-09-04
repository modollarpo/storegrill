import { prisma } from '../src/db/prisma.js';

async function main() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, name: true },
  });

  let authoredTotal = 0;
  let noCompanions = 0;
  let processed = 0;

  for (const p of products) {
    const authored = await prisma.product.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { compatibleWith: { some: { id: p.id } } },
          { relatedTo: { some: { id: p.id } } },
        ],
      },
    });
    authoredTotal += authored;
    if (authored === 0) noCompanions += 1;
    processed += 1;
  }

  console.log(JSON.stringify({
    activeProducts: products.length,
    productsWithAuthoredCompanions: products.length - noCompanions,
    productsWithoutAuthoredCompanions: noCompanions,
    totalAuthoredLinks: authoredTotal,
    note: 'No companion rows are persisted. The GET /products/:id/companions endpoint computes auth/compatible + similarity on demand with caching. Order-based co-occurrence is a future tier when order volume justifies it.',
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
