-- Add company profile fields to User for outlet branding and default margin
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyLogo" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultMargin" DOUBLE PRECISION;
