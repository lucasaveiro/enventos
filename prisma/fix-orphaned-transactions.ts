/**
 * One-time script to fix orphaned standalone transactions.
 *
 * When a parcela (installment) is marked as paid, the system creates a NEW
 * transaction linked to the installment. But if the user had previously created
 * a standalone transaction in "Outras Transacoes" for the same installment,
 * that standalone transaction remains as 'pending'.
 *
 * This script finds such orphaned pending transactions and marks them as 'paid'
 * when a matching installment for the same event is already paid.
 *
 * Run with: npx tsx prisma/fix-orphaned-transactions.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Looking for orphaned pending transactions...')

  // Find all pending standalone transactions (income, not linked to any installment)
  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      status: 'pending',
      type: 'income',
      installment: { is: null },
      eventId: { not: null },
    },
    include: {
      event: {
        include: {
          installments: {
            where: { status: 'paid' },
          },
        },
      },
    },
  })

  console.log(`Found ${pendingTransactions.length} pending standalone income transactions`)

  let fixedCount = 0

  for (const tx of pendingTransactions) {
    if (!tx.event) continue

    const paidInstallments = tx.event.installments

    // Check if any paid installment matches this transaction by installment number in description
    for (const inst of paidInstallments) {
      const label = inst.isSinal
        ? 'Sinal'
        : `Parcela ${inst.installmentNumber}`

      if (tx.description.includes(label)) {
        console.log(
          `  Fixing transaction #${tx.id}: "${tx.description}" (event ${tx.eventId}) → marking as paid`
        )
        await prisma.transaction.update({
          where: { id: tx.id },
          data: {
            status: 'paid',
            paidAt: inst.paidAt ?? new Date(),
          },
        })
        fixedCount++
        break
      }
    }
  }

  console.log(`\nFixed ${fixedCount} orphaned transactions.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
