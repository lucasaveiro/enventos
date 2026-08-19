-- CreateTable: inventário do Termo de Vistoria (Anexo I do contrato).
-- "package": 'simples' | 'completo' | NULL (NULL = todos os pacotes do espaço).
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "spaceSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "package" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryItem_spaceSlug_idx" ON "InventoryItem"("spaceSlug");
