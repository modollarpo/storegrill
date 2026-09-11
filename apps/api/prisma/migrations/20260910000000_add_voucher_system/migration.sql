-- AlterTable: Refund engine fields
ALTER TABLE "Refund" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE "Refund" ADD COLUMN "commissionReversed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Refund" ADD COLUMN "commissionReversalAmount" INTEGER;
ALTER TABLE "Refund" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Refund" ADD COLUMN "metadata" TEXT;
ALTER TABLE "Refund" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Payout batch link
ALTER TABLE "Payout" ADD COLUMN "payoutBatchId" TEXT;

-- CreateTable: Voucher
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FIXED_AMOUNT',
    "value" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
    "minOrderAmount" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "regionKey" TEXT,
    "vendorId" TEXT,
    "metadata" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VoucherRedemption
CREATE TABLE "VoucherRedemption" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "discountMinorUnits" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VoucherEvent
CREATE TABLE "VoucherEvent" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PayoutBatch
CREATE TABLE "PayoutBatch" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "payoutCount" INTEGER NOT NULL DEFAULT 0,
    "totalMinorUnits" BIGINT NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CampaignAudience
CREATE TABLE "CampaignAudience" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rules" TEXT NOT NULL DEFAULT '[]',
    "size" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CampaignCreative
CREATE TABLE "CampaignCreative" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignCreative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");
CREATE UNIQUE INDEX "VoucherRedemption_voucherId_userId_orderId_key" ON "VoucherRedemption"("voucherId", "userId", "orderId");
CREATE INDEX "VoucherRedemption_voucherId_idx" ON "VoucherRedemption"("voucherId");
CREATE INDEX "VoucherRedemption_userId_idx" ON "VoucherRedemption"("userId");
CREATE INDEX "VoucherEvent_voucherId_idx" ON "VoucherEvent"("voucherId");

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VoucherEvent" ADD CONSTRAINT "VoucherEvent_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_payoutBatchId_fkey" FOREIGN KEY ("payoutBatchId") REFERENCES "PayoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
