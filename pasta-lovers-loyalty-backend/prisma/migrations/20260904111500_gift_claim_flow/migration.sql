-- Modo Cafe Gift Pass: unassigned purchase and later recipient claim
ALTER TYPE "PassStatus" ADD VALUE IF NOT EXISTS 'UNCLAIMED';
ALTER TYPE "PassTransactionType" ADD VALUE IF NOT EXISTS 'CLAIM';

ALTER TABLE "PassProduct"
ADD COLUMN "isGift" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Pass"
ALTER COLUMN "clientId" DROP NOT NULL,
ADD COLUMN "claimTokenHash" TEXT,
ADD COLUMN "claimExpiresAt" TIMESTAMP(3),
ADD COLUMN "claimedAt" TIMESTAMP(3),
ADD COLUMN "purchaserName" TEXT,
ADD COLUMN "purchaserPhone" TEXT;

CREATE UNIQUE INDEX "Pass_claimTokenHash_key" ON "Pass"("claimTokenHash");
CREATE INDEX "Pass_claimExpiresAt_idx" ON "Pass"("claimExpiresAt");
CREATE INDEX "PassProduct_isGift_isActive_idx" ON "PassProduct"("isGift", "isActive");
