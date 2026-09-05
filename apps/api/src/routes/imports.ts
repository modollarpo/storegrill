import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { queueImportJob } from '../services/job-queue.js';

export const uploadDir = join(tmpdir(), 'storegrill-imports');
void mkdir(uploadDir, { recursive: true }).catch(err => {
  console.error('[imports] failed to create upload dir', err);
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname.replace(/[^\w.-]/g, '_')}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const router = Router();
const ModeSchema = z.enum(['APPLY', 'DRY_RUN']).default('APPLY');

async function requireVendor(req: AuthRequest) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.id } });
  return vendor;
}

router.use(authenticate, authorize('VENDOR'));

router.get('/', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }

  const jobs = await prisma.importJob.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { results: { take: 5, orderBy: { rowNumber: 'asc' } } },
  });

  res.json({ jobs });
});

router.post('/csv', upload.single('file'), async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }
  if (!req.file) {
    return res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded' } });
  }

  const parsed = ModeSchema.safeParse(req.body?.mode ?? undefined);
  const job = await prisma.importJob.create({
    data: {
      vendorId: vendor.id,
      type: 'CSV_UPLOAD',
      source: req.file.path,
      mode: parsed.success ? parsed.data : 'APPLY',
      phase: 'FETCHING',
    },
  });

  void queueImportJob(job.id);

  res.status(202).json({ job, message: 'Import queued. Processing will happen in the background.' });
});

router.post('/url', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }

  const body = z
    .object({
      url: z.string().url().refine(u => u.startsWith('https://') || u.startsWith('ftp://'), {
        message: 'Feed URL must use https or ftp',
      }),
      format: z.enum(['csv', 'tsv']).default('csv'),
      mode: ModeSchema,
      schedule: z.boolean().default(false),
      scheduleName: z.string().min(1).max(100).optional(),
    })
    .parse(req.body);

  let schedule = null;
  if (body.schedule) {
    const existing = await prisma.importSchedule.findFirst({
      where: { vendorId: vendor.id, url: body.url },
    });
    schedule = existing
      ? await prisma.importSchedule.update({
          where: { id: existing.id },
          data: { name: body.scheduleName ?? existing.name, enabled: true },
        })
      : await prisma.importSchedule.create({
          data: {
            vendorId: vendor.id,
            name: body.scheduleName ?? `Daily import - ${new URL(body.url).hostname}`,
            url: body.url,
            format: body.format,
          },
        });
  }

  const job = await prisma.importJob.create({
    data: {
      vendorId: vendor.id,
      type: 'URL_FEED',
      source: body.url,
      mode: body.mode,
      phase: 'FETCHING',
      scheduleId: schedule?.id,
    },
  });

  void queueImportJob(job.id);

  res.status(202).json({ job, schedule, message: 'Import queued. Processing will happen in the background.' });
});

router.get('/schedules', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }
  const schedules = await prisma.importSchedule.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ schedules });
});

router.post('/schedules/:scheduleId/toggle', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }
  const body = z.object({ enabled: z.boolean() }).parse(req.body);
  const existing = await prisma.importSchedule.findFirst({
    where: { id: req.params.scheduleId, vendorId: vendor.id },
  });
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
  }
  const schedule = await prisma.importSchedule.update({
    where: { id: existing.id },
    data: { enabled: body.enabled },
  });
  res.json({ schedule });
});

const JSON_RECORD = z.record(z.string(), z.unknown());

const templateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  sourceFormat: z.enum(['csv', 'tsv', 'url']).default('csv'),
  mappings: JSON_RECORD,
  options: JSON_RECORD.optional(),
  isDefault: z.boolean().default(false),
});

const templateUpdateSchema = templateCreateSchema.partial();

const MAP_FIELD_LIMIT = 200;

function parseTemplate(t: any) {
  return {
    id: t.id,
    vendorId: t.vendorId,
    name: t.name,
    sourceFormat: t.sourceFormat,
    mappings: safeParseObject(t.mappings),
    options: safeParseObject(t.options),
    isDefault: t.isDefault,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function safeParseObject(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

router.get('/templates', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }

  const templates = await prisma.importMappingTemplate.findMany({
    where: { OR: [{ vendorId: vendor.id }, { vendorId: null }] },
    orderBy: [{ vendorId: 'asc' }, { createdAt: 'desc' }],
    take: MAP_FIELD_LIMIT,
  });

  res.json({ templates: templates.map(parseTemplate) });
});

router.post('/templates', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }

  const body = templateCreateSchema.parse(req.body);
  const template = await prisma.importMappingTemplate.create({
    data: {
      vendorId: vendor.id,
      name: body.name,
      sourceFormat: body.sourceFormat,
      mappings: JSON.stringify(body.mappings),
      options: JSON.stringify(body.options ?? {}),
      isDefault: body.isDefault,
    },
  });

  res.status(201).json({ template: parseTemplate(template) });
});

router.put('/templates/:templateId', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }

  const body = templateUpdateSchema.parse(req.body);
  const existing = await prisma.importMappingTemplate.findFirst({
    where: { id: req.params.templateId, vendorId: vendor.id },
  });
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
  }

  const template = await prisma.importMappingTemplate.update({
    where: { id: existing.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.sourceFormat && { sourceFormat: body.sourceFormat }),
      ...(body.mappings && { mappings: JSON.stringify(body.mappings) }),
      ...(body.options && { options: JSON.stringify(body.options) }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
    },
  });

  res.json({ template: parseTemplate(template) });
});

router.delete('/templates/:templateId', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }

  const existing = await prisma.importMappingTemplate.findFirst({
    where: { id: req.params.templateId, vendorId: vendor.id },
  });
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
  }

  await prisma.importMappingTemplate.delete({ where: { id: existing.id } });
  res.status(204).end();
});

router.get('/:jobId', async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req);
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }

  const job = await prisma.importJob.findFirst({
    where: { id: req.params.jobId, vendorId: vendor.id },
    include: { results: { orderBy: { rowNumber: 'asc' }, take: 200 } },
  });

  if (!job) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Import job not found' } });
  }

  res.json({ job });
});

export { router as importsRouter };
