'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { addMonths } from 'date-fns'

export interface ClosedContractData {
  // Client
  clientId?: number | null
  clientName: string
  clientPhone?: string | null
  clientEmail?: string | null
  clientCPF: string
  clientRG?: string | null
  clientAddress: string
  clientCity: string
  clientState: string
  clientNotes?: string | null

  // Event
  eventTitle: string
  spaceId: number
  eventStart: Date
  eventEnd: Date
  eventType: string
  guestCount: number
  professionalIds?: number[]
  eventNotes?: string | null

  // Financial
  totalValue: number
  depositAmount: number
  depositDueDate: Date
  depositPaid: boolean
  depositPaidAt?: Date | null
  depositPaymentMethod?: string | null
  numberOfInstallments: number
  firstInstallmentDate: Date
  paymentMethod: string
}

function revalidateAll() {
  revalidatePath('/')
  revalidatePath('/events')
  revalidatePath('/financial')
  revalidatePath('/financeiro/calendario')
  revalidatePath('/dashboard')
  revalidatePath('/clients')
  revalidatePath('/contracts')
}

export async function createClosedContract(data: ClosedContractData) {
  try {
    // Validate required fields
    if (!data.clientName?.trim()) return { success: false, error: 'Nome do cliente é obrigatório' }
    if (!data.clientCPF?.trim()) return { success: false, error: 'CPF do cliente é obrigatório' }
    if (!data.clientAddress?.trim()) return { success: false, error: 'Endereço do cliente é obrigatório' }
    if (!data.eventTitle?.trim()) return { success: false, error: 'Título do evento é obrigatório' }
    if (!data.spaceId) return { success: false, error: 'Espaço é obrigatório' }
    if (data.totalValue <= 0) return { success: false, error: 'Valor total deve ser maior que zero' }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or update client
      let client
      const clientData = {
        name: data.clientName.trim(),
        phone: data.clientPhone?.trim() || null,
        email: data.clientEmail?.trim() || null,
        cpf: data.clientCPF.trim(),
        rg: data.clientRG?.trim() || null,
        address: data.clientAddress.trim(),
        city: data.clientCity.trim(),
        state: data.clientState.trim(),
        notes: data.clientNotes?.trim() || null,
      }

      if (data.clientId) {
        client = await tx.client.update({
          where: { id: data.clientId },
          data: clientData,
        })
      } else {
        client = await tx.client.create({ data: clientData })
      }

      // 2. Create event
      const event = await tx.event.create({
        data: {
          title: data.eventTitle.trim(),
          category: 'event',
          start: new Date(data.eventStart),
          end: new Date(data.eventEnd),
          status: 'reserved',
          paymentStatus: data.depositPaid ? (data.depositAmount >= data.totalValue ? 'paid' : 'partial') : 'unpaid',
          contractStatus: 'not_sent',
          totalValue: data.totalValue,
          deposit: data.depositAmount,
          notes: data.eventNotes?.trim() || null,
          spaceId: data.spaceId,
          clientId: client.id,
          professionals: data.professionalIds?.length
            ? {
                create: data.professionalIds.map((id) => ({
                  professional: { connect: { id } },
                })),
              }
            : undefined,
        },
      })

      // 3. Create payment installments
      const installments: {
        installmentNumber: number
        dueDate: Date
        amount: number
        isSinal: boolean
        paymentMethod: string | null
        eventId: number
        status: string
        paidAt: Date | null
        paidAmount: number | null
      }[] = []

      let currentNumber = 1

      // Deposit installment
      if (data.depositAmount > 0) {
        installments.push({
          installmentNumber: currentNumber,
          dueDate: new Date(data.depositDueDate),
          amount: data.depositAmount,
          isSinal: true,
          paymentMethod: data.depositPaymentMethod || data.paymentMethod || null,
          eventId: event.id,
          status: data.depositPaid ? 'paid' : 'pending',
          paidAt: data.depositPaid ? (data.depositPaidAt ? new Date(data.depositPaidAt) : new Date()) : null,
          paidAmount: data.depositPaid ? data.depositAmount : null,
        })
        currentNumber++
      }

      // Regular installments
      const remaining = data.totalValue - data.depositAmount
      if (remaining > 0 && data.numberOfInstallments > 0) {
        const installmentAmount = Math.floor((remaining / data.numberOfInstallments) * 100) / 100
        const lastInstallmentAmount = remaining - installmentAmount * (data.numberOfInstallments - 1)

        for (let i = 0; i < data.numberOfInstallments; i++) {
          const dueDate = addMonths(new Date(data.firstInstallmentDate), i)
          const isLast = i === data.numberOfInstallments - 1
          installments.push({
            installmentNumber: currentNumber + i,
            dueDate,
            amount: isLast ? Math.round(lastInstallmentAmount * 100) / 100 : installmentAmount,
            isSinal: false,
            paymentMethod: data.paymentMethod || null,
            eventId: event.id,
            status: 'pending',
            paidAt: null,
            paidAmount: null,
          })
        }
      }

      if (installments.length > 0) {
        // Create installments one by one for deposit that may need transaction linkage
        for (const inst of installments) {
          const createdInstallment = await tx.paymentInstallment.create({ data: inst })

          // If deposit is paid, create the corresponding transaction
          if (inst.isSinal && data.depositPaid) {
            const transaction = await tx.transaction.create({
              data: {
                type: 'income',
                category: 'installment_payment',
                description: `Parcela 1 (Sinal) - ${data.eventTitle}`,
                amount: data.depositAmount,
                date: inst.paidAt || new Date(),
                status: 'paid',
                paidAt: inst.paidAt || new Date(),
                eventId: event.id,
              },
            })

            await tx.paymentInstallment.update({
              where: { id: createdInstallment.id },
              data: { transactionId: transaction.id },
            })
          }
        }
      }

      // 4. Create interest date (confirmed)
      await tx.clientInterestDate.create({
        data: {
          clientId: client.id,
          spaceId: data.spaceId,
          date: new Date(data.eventStart),
          status: 'confirmed',
          eventType: data.eventType || null,
          numberOfPeople: data.guestCount || null,
        },
      })

      return { client, event }
    })

    revalidateAll()

    return {
      success: true,
      data: {
        clientId: result.client.id,
        eventId: result.event.id,
      },
    }
  } catch (error) {
    console.error('Error creating closed contract:', error)
    return { success: false, error: 'Erro ao criar contrato. Tente novamente.' }
  }
}

export async function getSpacesForWizard() {
  try {
    const spaces = await prisma.space.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: spaces }
  } catch (error) {
    console.error('Error fetching spaces:', error)
    return { success: false, error: 'Erro ao carregar espaços' }
  }
}

export async function getProfessionalsForWizard() {
  try {
    const professionals = await prisma.professional.findMany({
      orderBy: { name: 'asc' },
    })
    return { success: true, data: professionals }
  } catch (error) {
    console.error('Error fetching professionals:', error)
    return { success: false, error: 'Erro ao carregar profissionais' }
  }
}

export async function searchClientsForWizard(query: string) {
  try {
    if (!query || query.length < 2) return { success: true, data: [] }
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { cpf: { contains: query } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
    })
    return { success: true, data: clients }
  } catch (error) {
    console.error('Error searching clients:', error)
    return { success: false, error: 'Erro ao buscar clientes' }
  }
}
