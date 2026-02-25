-- Add event category for calendar organization
ALTER TABLE "Event" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'event';
