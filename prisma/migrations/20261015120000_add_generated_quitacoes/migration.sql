-- CreateTable
CREATE TABLE "GeneratedQuitacao" (
    "id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contractNumber" TEXT,
    "verificationCode" TEXT NOT NULL,
    "totalReceived" DECIMAL(65,30) NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "pdfFileName" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedQuitacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedQuitacao_eventId_idx" ON "GeneratedQuitacao"("eventId");

-- AddForeignKey
ALTER TABLE "GeneratedQuitacao" ADD CONSTRAINT "GeneratedQuitacao_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

