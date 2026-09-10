import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';

export async function createRecommendation(input: {
  entityType: string;
  entityId: string;
  recommendation: string;
  score: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}, prisma: PrismaClient = db) {
  return prisma.aIRecommendation.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      recommendation: input.recommendation,
      score: input.score,
      reason: input.reason,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function getRecommendationsByEntity(
  entityType: string,
  entityId: string,
  prisma: PrismaClient = db,
) {
  return prisma.aIRecommendation.findMany({
    where: { entityType, entityId },
    orderBy: { score: 'desc' },
  });
}

export async function approveRecommendation(id: string, approvedBy: string, prisma: PrismaClient = db) {
  return prisma.aIRecommendation.update({
    where: { id },
    data: { approved: true },
  });
}

export async function listRecommendations(status?: boolean, prisma: PrismaClient = db) {
  return prisma.aIRecommendation.findMany({
    where: status !== undefined ? { approved: status } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}
