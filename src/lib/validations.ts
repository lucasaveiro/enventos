import { z } from 'zod'

// ── Shared helpers ──────────────────────────────────────────────────────────

const optionalString = z.string().max(2000).nullable().optional()
const positiveInt = z.number().int().positive()
const nonNegativeNumber = z.number().min(0)

// ── Event ───────────────────────────────────────────────────────────────────

export const createEventSchema = z.object({
  title: z.string().min(1, 'Titulo obrigatorio').max(200),
  start: z.coerce.date(),
  end: z.coerce.date(),
  category: z.enum(['event', 'visit', 'proposal']).default('event'),
  status: z.enum([
    'available', 'confirming', 'reserved',
    'visit_scheduled', 'visit_done', 'visit_cancelled',
    'proposal_pending', 'proposal_sent', 'proposal_cancelled',
  ]),
  paymentStatus: z.enum(['unpaid', 'partial', 'paid']),
  contractStatus: z.enum(['not_sent', 'sent', 'signed']),
  totalValue: nonNegativeNumber,
  deposit: nonNegativeNumber,
  notes: optionalString,
  spaceId: positiveInt,
  clientId: z.number().int().positive().nullable().optional(),
  professionalIds: z.array(positiveInt).optional(),
})

export const updateEventSchema = createEventSchema.partial()

// ── Client ──────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(200),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email('Email invalido').max(200).nullable().optional().or(z.literal('')),
  cpf: z.string().max(20).nullable().optional(),
  rg: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  notes: optionalString,
})

export const updateClientSchema = createClientSchema.partial()

// ── Transaction ─────────────────────────────────────────────────────────────

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.coerce.date(),
  status: z.enum(['paid', 'pending']).optional(),
  paidAt: z.coerce.date().nullable().optional(),
  notes: optionalString,
  eventId: z.number().int().positive().nullable().optional(),
  serviceTaskId: z.number().int().positive().nullable().optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

// ── Professional ────────────────────────────────────────────────────────────

export const createProfessionalSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(200),
  type: z.string().min(1).max(100),
  phone: z.string().max(30).nullable().optional(),
  notes: optionalString,
})

export const updateProfessionalSchema = createProfessionalSchema.partial()

// ── Space ───────────────────────────────────────────────────────────────────

export const createSpaceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(200),
  address: z.string().max(500).optional(),
  active: z.boolean().optional(),
})

export const updateSpaceSchema = createSpaceSchema.partial()

// ── Payment Plan ────────────────────────────────────────────────────────────

export const createPaymentPlanSchema = z.object({
  eventId: positiveInt,
  totalValue: z.number().positive('Valor deve ser positivo'),
  numberOfInstallments: z.number().int().min(1, 'Minimo 1 parcela').max(60),
  startDate: z.coerce.date(),
  depositAmount: nonNegativeNumber.optional(),
  depositDueDate: z.coerce.date().optional(),
  paymentMethod: z.string().max(50).optional(),
})

// ── Interest Date ───────────────────────────────────────────────────────────

export const createInterestDateSchema = z.object({
  clientId: positiveInt,
  spaceId: positiveInt,
  date: z.coerce.date(),
  status: z.string().max(50).optional(),
  notes: optionalString,
  numberOfPeople: z.number().int().min(0).nullable().optional(),
  eventType: z.string().max(100).nullable().optional(),
})

export const updateInterestDateSchema = z.object({
  status: z.string().max(50).optional(),
  notes: optionalString,
  date: z.coerce.date().optional(),
  spaceId: positiveInt.optional(),
  numberOfPeople: z.number().int().min(0).nullable().optional(),
  eventType: z.string().max(100).nullable().optional(),
})

// ── Service Task ────────────────────────────────────────────────────────────

export const createServiceTaskSchema = z.object({
  start: z.coerce.date().nullable().optional(),
  end: z.coerce.date().nullable().optional(),
  responsible: z.string().max(200).nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  notes: optionalString,
  spaceId: positiveInt,
  serviceTypeId: positiveInt,
  eventId: z.number().int().positive().nullable().optional(),
})

export const updateServiceTaskSchema = createServiceTaskSchema.partial()
