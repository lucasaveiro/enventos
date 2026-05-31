-- AlterTable: adiciona o identificador estável de template (slug) ao espaço
ALTER TABLE "Space" ADD COLUMN "slug" TEXT;

-- Backfill dos espaços conhecidos a partir do nome.
-- Tolerante a acento/caixa para não depender da grafia exata armazenada.
UPDATE "Space" SET "slug" = 'rancho-aveiro'
  WHERE "slug" IS NULL AND "name" ILIKE 'rancho%';

UPDATE "Space" SET "slug" = 'estancia-aveiro'
  WHERE "slug" IS NULL AND ("name" ILIKE 'est%ncia%' OR "name" ILIKE 'estancia%');

-- Índice único (o Postgres permite múltiplos NULL, então espaços ainda não
-- mapeados não conflitam entre si).
CREATE UNIQUE INDEX "Space_slug_key" ON "Space"("slug");
