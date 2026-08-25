import { z } from 'zod';

export const ImportType = z.enum(['CSV_UPLOAD', 'URL_FEED', 'FTP', 'MANUAL']);
export const ImportStatus = z.enum([
  'PENDING', 'VALIDATING', 'DRY_RUN', 'IMPORTING', 'COMPLETED', 'FAILED',
]);

export const ImportJobSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  type: ImportType,
  source: z.string(),
  status: ImportStatus.default('PENDING'),
  totalRows: z.number().int().nonnegative().default(0),
  successRows: z.number().int().nonnegative().default(0),
  errorRows: z.number().int().nonnegative().default(0),
  errors: z.array(z.object({
    row: z.number(),
    field: z.string().optional(),
    message: z.string(),
  })).default([]),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
});

export const ImportJobResultSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  productId: z.string().optional(),
  rowNumber: z.number().int().positive(),
  status: z.enum(['created', 'updated', 'skipped', 'error']),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

export type ImportJob = z.infer<typeof ImportJobSchema>;
export type ImportJobResult = z.infer<typeof ImportJobResultSchema>;
export type ImportTypeEnum = z.infer<typeof ImportType>;
export type ImportStatusEnum = z.infer<typeof ImportStatus>;

export const CsvImportRowSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  category: z.string().optional(),
  brand: z.string().optional(),
  weight: z.number().positive().optional(),
  stock: z.number().int().nonnegative().default(0),
  images: z.string().optional(), // comma-separated URLs
  barcode: z.string().optional(),
});

export type CsvImportRow = z.infer<typeof CsvImportRowSchema>;

export const UrlFeedConfigSchema = z.object({
  url: z.string().url(),
  format: z.enum(['csv', 'json']),
  headers: z.record(z.string()).default({}),
  scheduleMinutes: z.number().int().positive().default(1440), // daily
});

export const FtpConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().default(21),
  username: z.string(),
  password: z.string(),
  path: z.string().default('/'),
  protocol: z.enum(['ftp', 'sftp']).default('ftp'),
  scheduleMinutes: z.number().int().positive().default(1440),
});
