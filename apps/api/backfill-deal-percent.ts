import './src/load-env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fractional = await prisma.deal.findMany({
    where: { value: { gt: 0, lt: 1 } },
    select: { id: true, slug: true, value: true },
  });

  if (fractional.length === 0) {
    console.log('No fractional deal values found. Nothing to do.');
    return;
  }

  console.log(`Converting ${fractional.length} deal(s) from fraction to percent.`);

  await prisma.$transaction(
    fractional.map(d =>
      prisma.deal.update({
        where: { id: d.id },
        data: { value: Math.round(d.value * 100) },
      })
    )
  );

  console.log(
    'Converted:',
    fractional.map(d => `${d.slug} (${d.value} -> ${Math.round(d.value * 100)}%)`).join(', ')
  );
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
