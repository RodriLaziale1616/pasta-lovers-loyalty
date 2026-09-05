-- Etapa 2: acceso de clientes por OTP y sesiones revocables
CREATE TABLE "ClientOtpChallenge" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientSession" (
    "id" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientOtpChallenge_phone_createdAt_idx" ON "ClientOtpChallenge"("phone", "createdAt");
CREATE INDEX "ClientOtpChallenge_expiresAt_idx" ON "ClientOtpChallenge"("expiresAt");
CREATE UNIQUE INDEX "ClientSession_tokenHash_key" ON "ClientSession"("tokenHash");
CREATE INDEX "ClientSession_clientId_revokedAt_idx" ON "ClientSession"("clientId", "revokedAt");
CREATE INDEX "ClientSession_expiresAt_idx" ON "ClientSession"("expiresAt");

ALTER TABLE "ClientSession"
ADD CONSTRAINT "ClientSession_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
