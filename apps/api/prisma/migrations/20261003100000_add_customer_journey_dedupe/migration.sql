-- AlterTable
ALTER TABLE "Cart" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- AddIndex
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

-- AddIndex
CREATE INDEX "Cart_reminderSentAt_idx" ON "Cart"("reminderSentAt");

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "reviewRequestSentAt" TIMESTAMP(3);