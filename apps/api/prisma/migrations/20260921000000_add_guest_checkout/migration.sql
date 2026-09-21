-- AlterTable: Add guestEmail to Order (nullable)
ALTER TABLE "Order" ADD COLUMN "guestEmail" TEXT;

-- AlterTable: Add sessionId to Cart (nullable)
ALTER TABLE "Cart" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "Cart_sessionId_idx" ON "Cart"("sessionId");

-- CreateIndex
CREATE INDEX "Order_guestEmail_idx" ON "Order"("guestEmail");
