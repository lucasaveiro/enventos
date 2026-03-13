-- CreateTable
CREATE TABLE "ClientInterestDate" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'interest',
    "notes" TEXT,
    "clientId" INTEGER NOT NULL,
    "spaceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInterestDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientInterestDate_clientId_idx" ON "ClientInterestDate"("clientId");

-- CreateIndex
CREATE INDEX "ClientInterestDate_spaceId_idx" ON "ClientInterestDate"("spaceId");

-- CreateIndex
CREATE INDEX "ClientInterestDate_date_idx" ON "ClientInterestDate"("date");

-- CreateIndex
CREATE INDEX "ClientInterestDate_status_idx" ON "ClientInterestDate"("status");

-- AddForeignKey
ALTER TABLE "ClientInterestDate" ADD CONSTRAINT "ClientInterestDate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInterestDate" ADD CONSTRAINT "ClientInterestDate_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
