-- Add vendor shipping country scope (UK-only for Costway house vendor)
ALTER TABLE "VendorProfile" ADD COLUMN "shippingCountries" TEXT;
