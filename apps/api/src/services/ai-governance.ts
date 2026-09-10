import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';

export async function createDecision(input: {
  decision: string;
  confidence: number;
  modelConfigId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}, prisma: PrismaClient = db) {
  const data: Record<string, unknown> = {
    decision: input.decision,
    confidence: input.confidence,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  };
  if (input.modelConfigId) data.modelConfigId = input.modelConfigId;
  if (input.requestId) data.requestId = input.requestId;
  return prisma.aIDecision.create({ data: data as never });
}

export async function getDecision(id: string, prisma: PrismaClient = db) {
  return prisma.aIDecision.findUnique({ where: { id } });
}

export async function createApproval(decisionId: string, prisma: PrismaClient = db) {
  return prisma.aIApproval.create({
    data: { decisionId },
  });
}

export async function reviewApproval(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  approvedBy: string,
  comment?: string,
  prisma: PrismaClient = db,
) {
  return prisma.aIApproval.update({
    where: { id },
    data: {
      status,
      approvedBy,
      comment,
      reviewedAt: new Date(),
    },
  });
}

export async function listApprovals(status?: string, prisma: PrismaClient = db) {
  return prisma.aIApproval.findMany({
    where: status ? { status } : undefined,
    include: { decision: true },
    orderBy: { createdAt: 'desc' },
  });
}
