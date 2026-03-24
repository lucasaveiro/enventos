-- CreateTable
CREATE TABLE "GeneratedContract" (
    "id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contractNumber" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "clauses" JSONB NOT NULL,
    "contractorOverrides" JSONB,
    "pdfUrl" TEXT NOT NULL,
    "pdfFileName" TEXT NOT NULL,
    "generatedVia" TEXT NOT NULL DEFAULT 'download',
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedContract_eventId_idx" ON "GeneratedContract"("eventId");

-- CreateIndex
CREATE INDEX "GeneratedContract_contractNumber_idx" ON "GeneratedContract"("contractNumber");

-- AddForeignKey
ALTER TABLE "GeneratedContract" ADD CONSTRAINT "GeneratedContract_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
