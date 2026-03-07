-- CreateTable
CREATE TABLE "ContractSignature" (
    "id" SERIAL NOT NULL,
    "documentKey" TEXT NOT NULL,
    "signerKey" TEXT,
    "requestSignatureKey" TEXT,
    "signingUrl" TEXT,
    "contractNumber" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientCPF" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "webhookLog" TEXT,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractSignature_documentKey_idx" ON "ContractSignature"("documentKey");

-- CreateIndex
CREATE INDEX "ContractSignature_eventId_idx" ON "ContractSignature"("eventId");

-- AddForeignKey
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
