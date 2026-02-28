-- AlterTable: make ServiceTask.start nullable to support pending services without a scheduled date
ALTER TABLE "ServiceTask" ALTER COLUMN "start" DROP NOT NULL;
