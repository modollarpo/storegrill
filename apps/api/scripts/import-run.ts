import '../src/load-env.js';

const base = process.env.DATABASE_URL!;
if (!base.includes('connection_limit')) {
  process.env.DATABASE_URL = base.includes('?')
    ? `${base}&connection_limit=15&pool_timeout=60`
    : `${base}?connection_limit=15&pool_timeout=60`;
}

const { PrismaClient } = await import('@prisma/client');
const { startImportJob } = await import('../src/services/import-engine.js');
const { COSTWAY_FEED_URL } = await import('../src/importers/costway.js');

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const slug = args[0] ?? 'storegrill-uk';
const localFileIdx = args.indexOf('--file');
const localPairIdx = args.indexOf('--pair');
const localFile = localFileIdx >= 0;
const localPair = localPairIdx >= 0;
const valueIdx = localFile ? localFileIdx + 1 : localPair ? localPairIdx + 1 : 1;
const cliValue = args[valueIdx];

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

const orphaned = await prisma.importJob.updateMany({
  where: { vendorId: vendor.id, status: { in: ['PENDING', 'RUNNING'] } },
  data: { status: 'FAILED', errors: JSON.stringify([{ message: 'Orphaned by server restart' }]), completedAt: new Date() },
});
console.log(`orphaned jobs reset: ${orphaned.count}`);

const source =
  localFile || localPair
    ? cliValue!
    : (cliValue ?? COSTWAY_FEED_URL);

const job = await prisma.importJob.create({
  data: {
    vendorId: vendor.id,
    type: localFile ? 'CSV_UPLOAD' : 'URL_FEED',
    source,
    mode: 'APPLY',
    phase: localFile ? 'PENDING' : 'FETCHING',
  },
});
console.log(`job ${job.id} queued (type=${job.type} source=${source.slice(0, 80)})`);

await startImportJob(job.id);

const started = Date.now();
for (;;) {
  await new Promise(r => setTimeout(r, 30000));
  try {
    const j = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`[${mins}m] ${j.status} phase=${j.phase} processed=${j.processedRows}/${j.totalRows}`);
    if (!['PENDING', 'RUNNING'].includes(j.status)) {
      const summary = await prisma.importJobResult.groupBy({ by: ['status'], where: { jobId: job.id }, _count: true });
      console.log(`final=${j.status} results=${JSON.stringify(summary)}`);
      break;
    }
  } catch (e) {
    console.log(`[poll] transient error: ${(e as Error).message.slice(0, 80)}`);
  }
}
process.exit(0);
