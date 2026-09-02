import '../src/load-env.js';

const base = process.env.DATABASE_URL!;
if (!base.includes('connection_limit')) {
  process.env.DATABASE_URL = base.includes('?')
    ? `${base}&connection_limit=15&pool_timeout=60`
    : `${base}?connection_limit=15&pool_timeout=60`;
}

const { PrismaClient } = await import('@prisma/client');
const { AOSOM_EU_FEED_URL } = await import('../src/importers/aosom.js');
const { AOSOM_UK_SOURCE, AOSOM_UK_PRODUCT_FEED_URL } = await import('../src/importers/aosom-uk.js');

const prisma = new PrismaClient();
const slug = process.argv[2] ?? 'storegrill-uk';
const enabled = process.argv.includes('--disable') ? 'disable' : 'enable';
const uk = process.argv.includes('--uk');
const feedUrl = uk ? AOSOM_UK_SOURCE : AOSOM_EU_FEED_URL;
if (uk) {
  console.log(`[uk] registering merged UK-pod source: ${AOSOM_UK_PRODUCT_FEED_URL} + stock feed`);
}

let vendor: { id: string } | null = null;
for (let attempt = 1; attempt <= 5; attempt++) {
  try {
    vendor = await prisma.vendorProfile.findFirst({ where: { slug } });
    break;
  } catch (e) {
    console.log(`[db] attempt ${attempt} failed: ${(e as Error).message.slice(0, 80)}`);
    if (attempt === 5) throw e;
    await new Promise(r => setTimeout(r, 30000));
  }
}
if (!vendor) throw new Error(`vendor ${slug} not found`);

if (enabled === 'enable') {
  const label = uk ? 'Aosom UK (merged) daily feed' : 'Aosom EU daily feed';
  const schedule = await prisma.importSchedule.upsert({
    where: {
      id: (await prisma.importSchedule.findFirst({ where: { vendorId: vendor.id, url: feedUrl } }))?.id ?? 'none',
    },
    update: { enabled: true, name: label, cadenceCron: '0 3 * * *' },
    create: {
      vendorId: vendor.id,
      name: label,
      url: feedUrl,
      format: 'tsv',
      cadenceCron: '0 3 * * *',
      enabled: true,
    },
  });
  console.log(`${label} ready: ${schedule.id}`);
} else {
  const removed = await prisma.importSchedule.updateMany({
    where: { vendorId: vendor.id, url: feedUrl },
    data: { enabled: false },
  });
  console.log(`Aosom schedule disabled: ${removed.count}`);
}

await prisma.$disconnect();
