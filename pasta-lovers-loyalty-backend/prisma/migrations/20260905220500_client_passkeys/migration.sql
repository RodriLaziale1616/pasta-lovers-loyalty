CREATE TABLE "ClientPasskey" (
    "id" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientPasskey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientWebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientWebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientPasskey_credentialId_key" ON "ClientPasskey"("credentialId");
CREATE INDEX "ClientPasskey_clientId_createdAt_idx" ON "ClientPasskey"("clientId", "createdAt");
CREATE INDEX "ClientWebAuthnChallenge_clientId_type_createdAt_idx" ON "ClientWebAuthnChallenge"("clientId", "type", "createdAt");
CREATE INDEX "ClientWebAuthnChallenge_expiresAt_idx" ON "ClientWebAuthnChallenge"("expiresAt");

ALTER TABLE "ClientPasskey" ADD CONSTRAINT "ClientPasskey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientWebAuthnChallenge" ADD CONSTRAINT "ClientWebAuthnChallenge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
