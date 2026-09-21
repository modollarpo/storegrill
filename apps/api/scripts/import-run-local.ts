import '../src/load-env.js';

const base = process.env.DATABASE_URL!;
if (!base.includes('connection_limit')) {
  process.env.DATABASE_URL = base.includes('?')
    ? `${base}&connection_limit=15&pool_timeout=60`
    : `${base}?connection_limit=15&pool_timeout=60`;
}

const { PrismaClient } = await import('@prisma/client');
const { startImportJob } = await import('../src/services/import-engine.js');

const prisma = new PrismaClient();

const slug = process.env.IMPORT_VENDOR_SLUG || 'storegrill-uk';
const vendor = await prisma.vendorProfile.findFirst({ where: { slug } });
if (!vendor) throw new Error(`vendor ${slug} not found`);

const orphaned = await prisma.importJob.updateMany({
  where: { vendorId: vendor.id, status: { in: ['PENDING', 'RUNNING'] } },
  data: { status: 'FAILED', errors: JSON.stringify([{ message: 'Orphaned by restart' }]), completedAt: new Date() },
});
console.log(`orphaned jobs reset: ${orphaned.count}`);

const prodFile = process.env.IMPORT_PROD_FILE;
const stockFile = process.env.IMPORT_STOCK_FILE;
const csvFile = process.env.IMPORT_CSV_FILE;

let source: string;
let jobType: string;
if (csvFile) {
  source = csvFile;
  jobType = 'CSV_UPLOAD';
} else if (prodFile && stockFile) {
  source = `file://${prodFile}|file://${stockFile}`;
  jobType = 'URL_FEED';
} else {
  throw new Error('Set IMPORT_CSV_FILE or IMPORT_PROD_FILE + IMPORT_STOCK_FILE');
}

const job = await prisma.importJob.create({
  data: { vendorId: vendor.id, type: jobType, source, mode: 'APPLY', phase: jobType === 'CSV_UPLOAD' ? 'PENDING' : 'FETCHING' },
});
console.log(`job ${job.id} queued (type=${jobType} source=${source.slice(0, 80)})`);

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
