import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';

export interface AIGatewayRequest {
  userId?: string;
  purpose: string;
  modelProvider?: string;
  modelId?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'RATE_LIMITED';
  errorMessage?: string;
  cacheHit?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AIGatewayConfig {
  provider: string;
  modelId: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

const DEFAULT_CONFIGS: AIGatewayConfig[] = [
  { provider: 'openai', modelId: 'gpt-4o', maxTokens: 128000, costPer1kInput: 0.0025, costPer1kOutput: 0.01 },
  { provider: 'openai', modelId: 'gpt-4o-mini', maxTokens: 128000, costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
  { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022', maxTokens: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
];

export async function initAIModels(prisma: PrismaClient = db): Promise<void> {
  for (const cfg of DEFAULT_CONFIGS) {
    await prisma.aIModelConfig.upsert({
      where: { provider_modelId: { provider: cfg.provider, modelId: cfg.modelId } },
      update: {},
      create: {
        provider: cfg.provider,
        modelId: cfg.modelId,
        displayName: cfg.modelId,
        maxTokens: cfg.maxTokens,
        costPer1kInput: cfg.costPer1kInput,
        costPer1kOutput: cfg.costPer1kOutput,
      },
    });
  }
}

export async function logAIRequest(req: AIGatewayRequest, prisma: PrismaClient = db): Promise<string> {
  const modelConfig = await prisma.aIModelConfig.findFirst({
    where: { provider: req.modelProvider ?? 'openai', modelId: req.modelId ?? 'gpt-4o' },
  });

  const costMinorUnits = modelConfig
    ? Math.round((req.inputTokens * modelConfig.costPer1kInput + req.outputTokens * modelConfig.costPer1kOutput) * 10)
    : 0;

  const record = await prisma.aIRequest.create({
    data: {
      userId: req.userId,
      modelConfigId: modelConfig?.id ?? '',
      purpose: req.purpose,
      inputTokens: req.inputTokens,
      outputTokens: req.outputTokens,
      latencyMs: req.latencyMs,
      status: req.status,
      errorMessage: req.errorMessage,
      cacheHit: req.cacheHit ?? false,
      costMinorUnits,
      metadata: req.metadata ? JSON.stringify(req.metadata) : null,
    },
  });

  return record.id;
}

export async function getModelConfig(provider: string, modelId: string, prisma: PrismaClient = db): Promise<AIGatewayConfig | null> {
  const cfg = await prisma.aIModelConfig.findFirst({
    where: { provider, modelId, enabled: true },
  });
  if (!cfg) return null;
  return {
    provider: cfg.provider,
    modelId: cfg.modelId,
    maxTokens: cfg.maxTokens,
    costPer1kInput: cfg.costPer1kInput,
    costPer1kOutput: cfg.costPer1kOutput,
  };
}

export async function getUsageStats(period: string, prisma: PrismaClient = db) {
  return prisma.aIUsageRecord.findUnique({ where: { period } });
}
