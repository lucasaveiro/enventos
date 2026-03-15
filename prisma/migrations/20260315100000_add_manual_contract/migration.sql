-- CreateTable
CREATE TABLE "ManualContract" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "notes" TEXT,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualContract_eventId_idx" ON "ManualContract"("eventId");

-- AddForeignKey
ALTER TABLE "ManualContract" ADD CONSTRAINT "ManualContract_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
