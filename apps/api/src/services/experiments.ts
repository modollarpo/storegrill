import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';

export interface CreateExperimentInput {
  name: string;
  description?: string;
  trafficPct?: number;
  startsAt?: Date;
  endsAt?: Date;
  variants: { name: string; weight?: number; config?: string; isControl?: boolean }[];
}

export interface ExperimentResult {
  id: string;
  name: string;
  status: string;
  variants: {
    id: string;
    name: string;
    weight: number;
    impressions: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    avgRevenue: number;
  }[];
}

export async function createExperiment(input: CreateExperimentInput, prisma: PrismaClient = db) {
  return prisma.experiment.create({
    data: {
      name: input.name,
      description: input.description,
      trafficPct: input.trafficPct ?? 100,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      variants: {
        create: input.variants.map(v => ({
          name: v.name,
          weight: v.weight ?? 50,
          config: v.config ?? '{}',
          isControl: v.isControl ?? false,
        })),
      },
    },
    include: { variants: true },
  });
}

export async function startExperiment(id: string, prisma: PrismaClient = db) {
  return prisma.experiment.update({
    where: { id },
    data: { status: 'RUNNING', startsAt: new Date() },
  });
}

export async function pauseExperiment(id: string, prisma: PrismaClient = db) {
  return prisma.experiment.update({
    where: { id },
    data: { status: 'PAUSED' },
  });
}

export async function completeExperiment(id: string, prisma: PrismaClient = db) {
  return prisma.experiment.update({
    where: { id },
    data: { status: 'COMPLETED', endsAt: new Date() },
  });
}

export async function assignVariant(
  experimentId: string,
  userId: string,
  prisma: PrismaClient = db,
): Promise<string | null> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { variants: true },
  });
  if (!experiment || experiment.status !== 'RUNNING') return null;

  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const variant of experiment.variants) {
    rand -= variant.weight;
    if (rand <= 0) return variant.id;
  }
  return experiment.variants[experiment.variants.length - 1]?.id ?? null;
}

export async function trackExperimentEvent(
  experimentId: string,
  variantId: string,
  eventType: string,
  userId?: string,
  value?: number,
  metadata?: Record<string, unknown>,
  prisma: PrismaClient = db,
) {
  return prisma.experimentEvent.create({
    data: {
      experimentId,
      variantId,
      userId,
      eventType,
      value: value ?? 0,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function getExperimentResults(id: string, prisma: PrismaClient = db): Promise<ExperimentResult | null> {
  const experiment = await prisma.experiment.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!experiment) return null;

  const variantResults = await Promise.all(
    experiment.variants.map(async (variant) => {
      const impressions = await prisma.experimentEvent.count({
        where: { variantId: variant.id, eventType: 'IMPRESSION' },
      });
      const conversions = await prisma.experimentEvent.count({
        where: { variantId: variant.id, eventType: 'CONVERSION' },
      });
      const revenueAgg = await prisma.experimentEvent.aggregate({
        where: { variantId: variant.id, eventType: 'REVENUE' },
        _sum: { value: true },
        _count: true,
      });
      const revenue = revenueAgg._sum.value ?? 0;
      const avgRevenue = revenueAgg._count > 0 ? revenue / revenueAgg._count : 0;

      return {
        id: variant.id,
        name: variant.name,
        weight: variant.weight,
        impressions,
        conversions,
        conversionRate: impressions > 0 ? conversions / impressions : 0,
        revenue,
        avgRevenue,
      };
    }),
  );

  return {
    id: experiment.id,
    name: experiment.name,
    status: experiment.status,
    variants: variantResults,
  };
}

export async function listExperiments(status?: string, prisma: PrismaClient = db) {
  return prisma.experiment.findMany({
    where: status ? { status } : undefined,
    include: { variants: true },
    orderBy: { createdAt: 'desc' },
  });
}
