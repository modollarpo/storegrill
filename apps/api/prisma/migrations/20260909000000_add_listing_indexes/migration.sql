-- AddListingIndexes
-- Indexes for the storefront listing/homescreen feed queries.
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "Product_status_categoryId_createdAt_idx" ON "Product"("status", "categoryId", "createdAt");
CREATE INDEX "Product_status_categoryId_vendorId_idx" ON "Product"("status", "categoryId", "vendorId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");