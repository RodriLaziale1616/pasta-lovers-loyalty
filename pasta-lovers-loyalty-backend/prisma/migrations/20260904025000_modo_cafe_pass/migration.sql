-- CreateEnum
CREATE TYPE "PassStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PassUnitType" AS ENUM ('ITEM', 'MONEY');

-- CreateEnum
CREATE TYPE "PassTransactionType" AS ENUM ('PURCHASE', 'REDEEM', 'REFUND', 'ADJUSTMENT', 'REVERSAL');

-- CreateTable
CREATE TABLE "PassProduct" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitType" "PassUnitType" NOT NULL DEFAULT 'ITEM',
    "initialUnits" INTEGER,
    "initialAmount" INTEGER,
    "salePrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PYG',
    "validityDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pass" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "status" "PassStatus" NOT NULL DEFAULT 'ACTIVE',
    "unitType" "PassUnitType" NOT NULL,
    "initialUnits" INTEGER,
    "remainingUnits" INTEGER,
    "initialAmount" INTEGER,
    "remainingAmount" INTEGER,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassTransaction" (
    "id" SERIAL NOT NULL,
    "passId" INTEGER NOT NULL,
    "type" "PassTransactionType" NOT NULL,
    "unitsDelta" INTEGER,
    "amountDelta" INTEGER,
    "balanceUnitsAfter" INTEGER,
    "balanceAmountAfter" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "notes" TEXT,
    "createdByUserId" INTEGER,
    "reversedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PassProduct_isActive_idx" ON "PassProduct"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Pass_publicId_key" ON "Pass"("publicId");

-- CreateIndex
CREATE INDEX "Pass_clientId_status_idx" ON "Pass"("clientId", "status");

-- CreateIndex
CREATE INDEX "Pass_productId_status_idx" ON "Pass"("productId", "status");

-- CreateIndex
CREATE INDEX "Pass_expiresAt_idx" ON "Pass"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PassTransaction_idempotencyKey_key" ON "PassTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PassTransaction_reversedById_key" ON "PassTransaction"("reversedById");

-- CreateIndex
CREATE INDEX "PassTransaction_passId_createdAt_idx" ON "PassTransaction"("passId", "createdAt");

-- CreateIndex
CREATE INDEX "PassTransaction_createdByUserId_createdAt_idx" ON "PassTransaction"("createdByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PassProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassTransaction" ADD CONSTRAINT "PassTransaction_passId_fkey" FOREIGN KEY ("passId") REFERENCES "Pass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassTransaction" ADD CONSTRAINT "PassTransaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassTransaction" ADD CONSTRAINT "PassTransaction_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "PassTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
