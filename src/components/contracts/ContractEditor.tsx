'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  RotateCcw,
  CheckCircle2,
  Edit3,
  AlertCircle,
  Plus,
  Calendar,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  ContractClause,
  ContractFormData,
  SpaceConfig,
  PaymentConditionType,
  PaymentInstallment,
  generateContractNumber,
  getDefaultClauseTemplates,
  getInitialClauses,
  substituteClause,
  isCNPJ,
} from '@/lib/contractTemplates'
import { getEventsForContractLinking, getContractSignature } from '@/app/actions/clicksign'
import { saveGeneratedContract, getGeneratedContractById, getEventDataForContract, getLatestGeneratedContractForEvent } from '@/app/actions/generatedContracts'
import { ContractStatusBadge } from './ContractStatusBadge'
import { toDateInputValue } from '@/lib/utils'

// Dynamic imports to avoid SSR issues with @react-pdf/renderer
const PDFGeneratorButton = dynamic(() => import('./PDFGeneratorButton'), {
  ssr: false,
  loading: () => (
    <Button disabled className="gap-2 min-w-48">
      <Loader2 className="h-4 w-4 animate-spin" />
      Preparando PDF...
    </Button>
  ),
})

const ClicksignButton = dynamic(() => import('./ClicksignButton'), {
  ssr: false,
  loading: () => (
    <Button disabled className="gap-2 min-w-48 bg-orange-500 text-white">
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando...
    </Button>
  ),
})

const baseSchema = z.object({
  contractNumber: z.string().min(1, 'Obrigatório'),
  contractDate: z.string().min(1, 'Obrigatório'),
  clientName: z.string().min(2, 'Mínimo 2 caracteres'),
  clientCPF: z.string().min(11, 'CPF inválido'),
  clientRG: z.string().optional(),
  clientNationality: z.string().optional(),
  clientCivilStatus: z.string().optional(),
  clientProfession: z.string().optional(),
  clientAddress: z.string().min(5, 'Endereço obrigatório'),
  clientCity: z.string().min(1, 'Obrigatório'),
  clientState: z.string().min(2, 'UF obrigatória'),
  clientPhone: z.string().min(10, 'Telefone inválido'),
  clientEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  eventDate: z.string().min(1, 'Obrigatório'),
  eventStartTime: z.string().min(1, 'Obrigatório'),
  eventEndTime: z.string().min(1, 'Obrigatório'),
  eventType: z.string().min(1, 'Obrigatório'),
  guestCount: z.string().min(1, 'Obrigatório'),
  dailyCount: z.string().optional(),
  packageType: z.string().optional(),
  eventCheckoutDate: z.string().optional(),
  totalValue: z.string().min(1, 'Obrigatório'),
  depositValue: z.string().optional(),
  depositDueDate: z.string().optional(),
  remainingValue: z.string().optional(),
  remainingDueDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentCondition: z.string().min(1, 'Obrigatório'),
  cautionValue: z.string().optional(),
  benchCount: z.string().optional(),
  observations: z.string().optional(),
})

function createSchema(requiresExtendedEventData: boolean, requiresCheckoutDate: boolean) {
  if (!requiresExtendedEventData && !requiresCheckoutDate) return baseSchema

  return baseSchema.superRefine((data, ctx) => {
    if (requiresCheckoutDate && !data.eventCheckoutDate?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['eventCheckoutDate'], message: 'Obrigatório' })
    }

    if (!requiresExtendedEventData) return

    if (!data.dailyCount?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dailyCount'], message: 'Obrigatório' })
    }

    if (!data.packageType?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packageType'], message: 'Obrigatório' })
    } else if (!['simples', 'completo'].includes(data.packageType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packageType'], message: 'Pacote inválido' })
    }

    if (!data.cautionValue?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cautionValue'], message: 'Obrigatório' })
    }
  })
}

type FormValues = z.infer<typeof baseSchema>

interface Props {
  space: SpaceConfig
  eventId?: number
  loadContractId?: number
}

const EVENT_TYPES = [
  'Casamento',
  'Debutante',
  'Aniversário',
  'Confraternização',
  'Formatura',
  'Batizado / Chá de bebê',
  'Chá de panela / Noivado',
  'Evento corporativo',
  'Outro',
]

const PAYMENT_CONDITIONS: { value: PaymentConditionType; label: string; description: string }[] = [
  { value: 'a_vista', label: 'À Vista', description: 'Pago via Pix/Depósito bancário na data da assinatura do contrato' },
  { value: 'entrada_parcelas', label: 'Entrada + Parcelas', description: '20% no ato do contrato e restante parcelado no Pix até 10 dias antes do evento' },
  { value: 'cartao_credito', label: 'Cartão de Crédito', description: 'Parcelado no cartão de crédito com juros adicionais da maquininha' },
]

const CIVIL_STATUS_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
]

const PACKAGE_TYPES = [
  { value: 'simples', label: 'Pacote Simples' },
  { value: 'completo', label: 'Pacote Completo' },
]

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 last:mb-0">{children}</div>
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-[var(--destructive)] mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

const selectClass = "flex h-9 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"

type PersistedClauseTemplate = Omit<ContractClause, 'edited'>

interface PersistedClauseStructure {
  customClauses: PersistedClauseTemplate[]
  removedDefaultClauseIds: string[]
}

const EMPTY_CLAUSE_STRUCTURE: PersistedClauseStructure = {
  customClauses: [],
  removedDefaultClauseIds: [],
}

// ─── Contractor (owner) data persistence ────────────────────────────────────

interface ContractorOverrides {
  ownerName?: string
  ownerCPF?: string
  ownerCNPJ?: string
  ownerEmail?: string
  ownerPhone?: string
  ownerRG?: string
  ownerRole?: string
  ownerAddress?: string
  bankName?: string
  bankCode?: string
  bankAgency?: string
  bankAccount?: string
  bankHolder?: string
  bankHolderDoc?: string
}

const CONTRACTOR_FIELDS: { key: keyof ContractorOverrides; label: string; placeholder: string; colSpan?: string; section?: string }[] = [
  { key: 'ownerName', label: 'Nome do Contratado', placeholder: 'Nome completo', colSpan: 'sm:col-span-2' },
  { key: 'ownerCPF', label: 'CPF', placeholder: '000.000.000-00' },
  { key: 'ownerRG', label: 'RG', placeholder: '00.000.000-0' },
  { key: 'ownerCNPJ', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { key: 'ownerEmail', label: 'E-mail', placeholder: 'email@exemplo.com' },
  { key: 'ownerPhone', label: 'Telefone (WhatsApp)', placeholder: '19999999999' },
  { key: 'ownerRole', label: 'Qualificação', placeholder: 'Proprietário / Locador' },
  { key: 'ownerAddress', label: 'Endereço Completo', placeholder: 'Rua, nº, Bairro — Cidade/UF CEP', colSpan: 'sm:col-span-2 lg:col-span-3' },
  { key: 'bankName', label: 'Banco', placeholder: 'Santander', section: 'bank' },
  { key: 'bankCode', label: 'Código do Banco', placeholder: '033', section: 'bank' },
  { key: 'bankAgency', label: 'Agência', placeholder: '0194', section: 'bank' },
  { key: 'bankAccount', label: 'Conta Corrente', placeholder: '01003495-8', section: 'bank' },
  { key: 'bankHolder', label: 'Nome do Titular', placeholder: 'Nome do titular', colSpan: 'sm:col-span-2', section: 'bank' },
  { key: 'bankHolderDoc', label: 'CPF do Titular', placeholder: '000.000.000-00', section: 'bank' },
]

function getContractorStorageKey(spaceId: string): string {
  return `contract-contractor:${spaceId}`
}

function loadContractorOverrides(spaceId: string): ContractorOverrides {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(getContractorStorageKey(spaceId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result: ContractorOverrides = {}
    for (const { key } of CONTRACTOR_FIELDS) {
      if (typeof parsed[key] === 'string' && parsed[key]) {
        result[key] = parsed[key] as string
      }
    }
    return result
  } catch {
    return {}
  }
}

function saveContractorOverrides(spaceId: string, overrides: ContractorOverrides): void {
  if (typeof window === 'undefined') return
  // Only persist keys that differ from empty
  const cleaned: ContractorOverrides = {}
  for (const { key } of CONTRACTOR_FIELDS) {
    if (overrides[key]) cleaned[key] = overrides[key]
  }
  window.localStorage.setItem(getContractorStorageKey(spaceId), JSON.stringify(cleaned))
}

function mergeSpaceWithOverrides(space: SpaceConfig, overrides: ContractorOverrides): SpaceConfig {
  return {
    ...space,
    ownerName: overrides.ownerName || space.ownerName,
    ownerCPF: overrides.ownerCPF || space.ownerCPF,
    ownerCNPJ: overrides.ownerCNPJ || space.ownerCNPJ,
    ownerEmail: overrides.ownerEmail || space.ownerEmail,
    ownerPhone: overrides.ownerPhone || space.ownerPhone,
    ownerRG: overrides.ownerRG || space.ownerRG,
    ownerRole: overrides.ownerRole || space.ownerRole,
    ownerAddress: overrides.ownerAddress || space.ownerAddress,
    bankName: overrides.bankName || space.bankName,
    bankCode: overrides.bankCode || space.bankCode,
    bankAgency: overrides.bankAgency || space.bankAgency,
    bankAccount: overrides.bankAccount || space.bankAccount,
    bankHolder: overrides.bankHolder || space.bankHolder,
    bankHolderDoc: overrides.bankHolderDoc || space.bankHolderDoc,
  }
}

// ─── Clause structure persistence ────────────────────────────────────────────

function getClauseStructureStorageKey(spaceId: string): string {
  return `contract-structure:${spaceId}:clauses`
}

function loadClauseStructure(spaceId: string): PersistedClauseStructure {
  if (typeof window === 'undefined') return EMPTY_CLAUSE_STRUCTURE

  try {
    const raw = window.localStorage.getItem(getClauseStructureStorageKey(spaceId))
    if (!raw) return EMPTY_CLAUSE_STRUCTURE

    const parsed = JSON.parse(raw) as Partial<PersistedClauseStructure>
    const customClauses = Array.isArray(parsed.customClauses)
      ? parsed.customClauses
          .filter((item): item is PersistedClauseTemplate => (
            Boolean(item)
            && typeof item.id === 'string'
            && typeof item.number === 'string'
            && typeof item.title === 'string'
            && typeof item.content === 'string'
          ))
          .map((item) => ({
            id: item.id,
            number: item.number,
            title: item.title,
            content: item.content,
          }))
      : []

    const removedDefaultClauseIds = Array.isArray(parsed.removedDefaultClauseIds)
      ? parsed.removedDefaultClauseIds.filter((id): id is string => typeof id === 'string')
      : []

    return { customClauses, removedDefaultClauseIds }
  } catch {
    return EMPTY_CLAUSE_STRUCTURE
  }
}

function saveClauseStructure(spaceId: string, structure: PersistedClauseStructure): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getClauseStructureStorageKey(spaceId), JSON.stringify(structure))
}

function buildClauseTemplates(spaceId: string, structure: PersistedClauseStructure): PersistedClauseTemplate[] {
  const removedClauseIds = new Set(structure.removedDefaultClauseIds)
  const defaults = getDefaultClauseTemplates(spaceId).filter((clause) => !removedClauseIds.has(clause.id))
  return [...defaults, ...structure.customClauses]
}

interface EventOption {
  id: number
  title: string
  start: string
  clientName: string
  clientPhone: string
  clientEmail: string
  spaceName: string
  spaceId: number
  contractStatus: string
  totalValue: number
  deposit: number
}

export function ContractEditor({ space, eventId: initialEventId, loadContractId }: Props) {
  const requiresExtendedEventData = space.id === 'estancia-aveiro'
  const requiresCheckoutDate = requiresExtendedEventData || space.id === 'rancho-aveiro'
  const schema = useMemo(
    () => createSchema(requiresExtendedEventData, requiresCheckoutDate),
    [requiresCheckoutDate, requiresExtendedEventData]
  )

  const [clauses, setClauses] = useState<ContractClause[]>(() => getInitialClauses(space.id))
  const [clauseStructure, setClauseStructure] = useState<PersistedClauseStructure>(EMPTY_CLAUSE_STRUCTURE)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [allExpanded, setAllExpanded] = useState(false)
  const [clausesApplied, setClausesApplied] = useState(false)
  const [showAddClauseForm, setShowAddClauseForm] = useState(false)
  const [newClauseNumber, setNewClauseNumber] = useState('')
  const [newClauseTitle, setNewClauseTitle] = useState('')
  const [newClauseContent, setNewClauseContent] = useState('')
  const [newClauseError, setNewClauseError] = useState('')
  const [pendingRemovalClauseId, setPendingRemovalClauseId] = useState<string | null>(null)

  // Contractor (owner) overrides
  const [contractorOverrides, setContractorOverrides] = useState<ContractorOverrides>({})
  const effectiveSpace = useMemo(() => mergeSpaceWithOverrides(space, contractorOverrides), [space, contractorOverrides])

  // Clicksign integration state
  const [selectedEventId, setSelectedEventId] = useState<number | null>(initialEventId ?? null)
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventSearch, setEventSearch] = useState('')
  const [existingSignature, setExistingSignature] = useState<{
    status: string
    signingUrl?: string | null
  } | null>(null)

  // Load events for linking
  useEffect(() => {
    let cancelled = false
    setEventsLoading(true)
    getEventsForContractLinking().then((result) => {
      if (cancelled) return
      if (result.success && result.data) setEvents(result.data)
      setEventsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // Load existing signature when event is selected
  useEffect(() => {
    if (!selectedEventId) {
      setExistingSignature(null)
      return
    }
    let cancelled = false
    getContractSignature(selectedEventId).then((result) => {
      if (cancelled) return
      if (result.success && result.data) {
        setExistingSignature({
          status: result.data.status,
          signingUrl: result.data.signingUrl,
        })
      } else {
        setExistingSignature(null)
      }
    })
    return () => { cancelled = true }
  }, [selectedEventId])

  const {
    register,
    formState: { errors, isValid },
    getValues,
    setValue,
    control,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      contractNumber: generateContractNumber(space),
      contractDate: toDateInputValue(new Date()),
      clientName: '',
      clientCPF: '',
      clientRG: '',
      clientNationality: 'Brasileira',
      clientCivilStatus: '',
      clientProfession: '',
      clientAddress: '',
      clientCity: '',
      clientState: '',
      clientPhone: '',
      clientEmail: '',
      eventDate: '',
      eventStartTime: '15:00',
      eventEndTime: '02:00',
      eventType: '',
      guestCount: '',
      dailyCount: '',
      packageType: '',
      eventCheckoutDate: '',
      totalValue: '',
      depositValue: '',
      depositDueDate: '',
      remainingValue: '',
      remainingDueDate: '',
      paymentMethod: '',
      paymentCondition: '',
      cautionValue: '',
      benchCount: '20',
      observations: '',
    },
  })

  // Detect CPF vs CNPJ for dynamic labels
  const clientCPFValue = useWatch({ control, name: 'clientCPF' })
  const clientIsCNPJ = isCNPJ(clientCPFValue || '')

  // Payment installments state
  const [installments, setInstallments] = useState<PaymentInstallment[]>([])

  // Auto-calculate remaining value when total or deposit changes
  const totalValue = useWatch({ control, name: 'totalValue' })
  const depositValue = useWatch({ control, name: 'depositValue' })
  const paymentCondition = useWatch({ control, name: 'paymentCondition' }) as PaymentConditionType

  // Auto-calculate 20% deposit when condition is entrada_parcelas
  useEffect(() => {
    if (paymentCondition === 'entrada_parcelas' && totalValue) {
      const total = parseFloat((totalValue || '').replace(',', '.'))
      if (!isNaN(total) && total > 0) {
        const deposit20 = (total * 0.2).toFixed(2).replace('.', ',')
        setValue('depositValue', deposit20)
      }
    }
    if (paymentCondition === 'a_vista') {
      setValue('depositValue', totalValue || '')
      setValue('remainingValue', '0,00')
    }
  }, [paymentCondition, totalValue, setValue])

  useEffect(() => {
    const total = parseFloat((totalValue || '').replace(',', '.'))
    const deposit = parseFloat((depositValue || '').replace(',', '.'))
    if (!isNaN(total) && !isNaN(deposit) && total > 0) {
      const remaining = Math.max(0, total - deposit)
      setValue('remainingValue', remaining.toFixed(2).replace('.', ','))
    }
  }, [totalValue, depositValue, setValue])

  // Auto-calculate bench/chairs/tables from guest count
  const guestCountValue = useWatch({ control, name: 'guestCount' })

  useEffect(() => {
    const loadedStructure = loadClauseStructure(space.id)
    setClauseStructure(loadedStructure)
    setClauses(buildClauseTemplates(space.id, loadedStructure).map((clause) => ({ ...clause, edited: false })))
    setExpandedId(null)
    setEditingContent('')
    setAllExpanded(false)
    setClausesApplied(false)
    setShowAddClauseForm(false)
    setPendingRemovalClauseId(null)
    setContractorOverrides(loadContractorOverrides(space.id))
  }, [space.id])

  // ─── Load existing generated contract for editing ─────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!loadContractId) return
    let cancelled = false
    getGeneratedContractById(loadContractId).then((result) => {
      if (cancelled || !result.success || !result.data) return
      const saved = result.data
      const savedFormData = saved.formData as Record<string, unknown>
      const savedClauses = saved.clauses as unknown as ContractClause[]
      const savedOverrides = saved.contractorOverrides as unknown as ContractorOverrides | null

      // Restore form fields
      const formKeys = [
        'contractNumber', 'contractDate',
        'clientName', 'clientCPF', 'clientRG', 'clientNationality', 'clientCivilStatus', 'clientProfession',
        'clientAddress', 'clientCity', 'clientState', 'clientPhone', 'clientEmail',
        'eventDate', 'eventStartTime', 'eventEndTime', 'eventType', 'guestCount',
        'dailyCount', 'packageType', 'eventCheckoutDate',
        'totalValue', 'depositValue', 'depositDueDate', 'remainingValue', 'remainingDueDate',
        'paymentMethod', 'paymentCondition', 'cautionValue', 'benchCount', 'observations',
      ]
      for (const key of formKeys) {
        if (savedFormData[key] !== undefined && savedFormData[key] !== null) {
          setValue(key as keyof FormValues, savedFormData[key] as string, { shouldValidate: true })
        }
      }

      // Restore installments
      if (Array.isArray(savedFormData.installments)) {
        setInstallments(savedFormData.installments as PaymentInstallment[])
      }

      // Restore clauses
      if (Array.isArray(savedClauses) && savedClauses.length > 0) {
        setClauses(savedClauses)
        setClausesApplied(true)
      }

      // Restore contractor overrides
      if (savedOverrides) {
        setContractorOverrides(savedOverrides)
      }

      // Select the linked event
      setSelectedEventId(saved.eventId)
    })
    return () => { cancelled = true }
  }, [loadContractId, setValue])

  // ─── Pre-fill from event data when eventId is provided ────────────────
  // If a contract was previously generated for this event, load it instead
  // so all form fields (including contract-only fields) are restored.
  useEffect(() => {
    if (!initialEventId || loadContractId) return
    let cancelled = false

    // First check if there's a previously generated contract for this event
    getLatestGeneratedContractForEvent(initialEventId).then((contractResult) => {
      if (cancelled) return

      if (contractResult.success && contractResult.data) {
        // Restore from saved contract (same logic as loadContractId)
        const saved = contractResult.data
        const savedFormData = saved.formData as Record<string, unknown>
        const savedClauses = saved.clauses as unknown as ContractClause[]
        const savedOverrides = saved.contractorOverrides as unknown as ContractorOverrides | null

        const formKeys = [
          'contractNumber', 'contractDate',
          'clientName', 'clientCPF', 'clientRG', 'clientNationality', 'clientCivilStatus', 'clientProfession',
          'clientAddress', 'clientCity', 'clientState', 'clientPhone', 'clientEmail',
          'eventDate', 'eventStartTime', 'eventEndTime', 'eventType', 'guestCount',
          'dailyCount', 'packageType', 'eventCheckoutDate',
          'totalValue', 'depositValue', 'depositDueDate', 'remainingValue', 'remainingDueDate',
          'paymentMethod', 'paymentCondition', 'cautionValue', 'benchCount', 'observations',
        ]
        for (const key of formKeys) {
          if (savedFormData[key] !== undefined && savedFormData[key] !== null) {
            setValue(key as keyof FormValues, savedFormData[key] as string, { shouldValidate: true })
          }
        }

        if (Array.isArray(savedFormData.installments)) {
          setInstallments(savedFormData.installments as PaymentInstallment[])
        }

        if (Array.isArray(savedClauses) && savedClauses.length > 0) {
          setClauses(savedClauses)
          setClausesApplied(true)
        }

        if (savedOverrides) {
          setContractorOverrides(savedOverrides)
        }

        setSelectedEventId(saved.eventId)
        return
      }

      // No previous contract — fall back to pre-filling from event data
      getEventDataForContract(initialEventId).then((result) => {
        if (cancelled || !result.success || !result.data) return
        const event = result.data
        const client = event.client
        const installmentsList = event.installments || []

        // Client data
        if (client) {
          if (client.name) setValue('clientName', client.name, { shouldValidate: true })
          if (client.cpf) setValue('clientCPF', client.cpf, { shouldValidate: true })
          if (client.rg) setValue('clientRG', client.rg, { shouldValidate: true })
          if (client.phone) setValue('clientPhone', client.phone, { shouldValidate: true })
          if (client.email) setValue('clientEmail', client.email, { shouldValidate: true })
          if (client.address) setValue('clientAddress', client.address, { shouldValidate: true })
          if (client.city) setValue('clientCity', client.city, { shouldValidate: true })
          if (client.state) setValue('clientState', client.state, { shouldValidate: true })
        }

        // Event dates
        const startDate = new Date(event.start)
        const endDate = new Date(event.end)
        setValue('eventDate', startDate.toISOString().split('T')[0], { shouldValidate: true })
        const startHours = startDate.getHours().toString().padStart(2, '0')
        const startMinutes = startDate.getMinutes().toString().padStart(2, '0')
        setValue('eventStartTime', `${startHours}:${startMinutes}`, { shouldValidate: true })
        const endHours = endDate.getHours().toString().padStart(2, '0')
        const endMinutes = endDate.getMinutes().toString().padStart(2, '0')
        setValue('eventEndTime', `${endHours}:${endMinutes}`, { shouldValidate: true })

        // Event type & guest count
        if (event.eventType) setValue('eventType', event.eventType, { shouldValidate: true })
        if (event.guestCount) setValue('guestCount', String(event.guestCount), { shouldValidate: true })

        // Financial data
        const totalVal = Number(event.totalValue)
        const depositVal = Number(event.deposit)
        if (totalVal > 0) {
          setValue('totalValue', totalVal.toFixed(2).replace('.', ','), { shouldValidate: true })
        }
        if (depositVal > 0) {
          setValue('depositValue', depositVal.toFixed(2).replace('.', ','), { shouldValidate: true })
        }

        // Notes → observations
        if (event.notes) setValue('observations', event.notes, { shouldValidate: true })

        // Payment data from installments
        const sinal = installmentsList.find((i) => i.isSinal)
        const regularInstallments = installmentsList.filter((i) => !i.isSinal)

        if (sinal) {
          const sinalDate = new Date(sinal.dueDate)
          setValue('depositDueDate', sinalDate.toISOString().split('T')[0], { shouldValidate: true })
          if (sinal.paymentMethod) setValue('paymentMethod', sinal.paymentMethod, { shouldValidate: true })
        }

        // Infer payment condition and set installments
        if (totalVal > 0 && depositVal >= totalVal) {
          setValue('paymentCondition', 'a_vista', { shouldValidate: true })
        } else if (regularInstallments.length > 0) {
          setValue('paymentCondition', 'entrada_parcelas', { shouldValidate: true })
          const mappedInstallments: PaymentInstallment[] = regularInstallments.map((inst) => ({
            date: toDateInputValue(inst.dueDate),
            value: Number(inst.amount).toFixed(2).replace('.', ','),
          }))
          setInstallments(mappedInstallments)
        }
      })
    })

    return () => { cancelled = true }
  }, [initialEventId, loadContractId, setValue])

  // ─── Save handler for after PDF generation ────────────────────────────
  const handleSaveContract = useCallback(async (
    pdfBlob: Blob,
    formData: ContractFormData,
    finalClauses: ContractClause[],
    generatedVia: 'download' | 'clicksign'
  ) => {
    if (!selectedEventId) return
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(pdfBlob)
      })

      const result = await saveGeneratedContract({
        eventId: selectedEventId,
        spaceId: space.id,
        contractNumber: formData.contractNumber,
        formData: formData as unknown as Record<string, unknown>,
        clauses: finalClauses as unknown as Array<Record<string, unknown>>,
        contractorOverrides: Object.keys(contractorOverrides).length > 0 ? contractorOverrides as unknown as Record<string, unknown> : undefined,
        pdfBase64: base64,
        generatedVia,
      })

      if (result.success) {
        setSaveMessage(`Contrato v${result.data?.version} salvo no evento`)
        setTimeout(() => setSaveMessage(null), 5000)
      }
    } catch (err) {
      console.error('Erro ao salvar contrato:', err)
    } finally {
      setIsSaving(false)
    }
  }, [selectedEventId, space.id, contractorOverrides])

  const handleAfterDownload = useCallback((blob: Blob, formData: ContractFormData, clauses: ContractClause[]) => {
    handleSaveContract(blob, formData, clauses, 'download')
  }, [handleSaveContract])

  const handleAfterClicksign = useCallback((blob: Blob, formData: ContractFormData, clauses: ContractClause[]) => {
    handleSaveContract(blob, formData, clauses, 'clicksign')
  }, [handleSaveContract])

  const persistClauseStructure = useCallback((nextStructure: PersistedClauseStructure) => {
    setClauseStructure(nextStructure)
    saveClauseStructure(space.id, nextStructure)
  }, [space.id])

  const applyFormDataToClauses = useCallback(() => {
    const v = getValues()
    const formData: ContractFormData = {
      ...v,
      clientRG: v.clientRG ?? '',
      clientNationality: v.clientNationality ?? '',
      clientCivilStatus: v.clientCivilStatus ?? '',
      clientProfession: v.clientProfession ?? '',
      clientEmail: v.clientEmail ?? '',
      remainingValue: v.remainingValue ?? '',
      remainingDueDate: v.remainingDueDate ?? '',
      depositValue: v.depositValue ?? '',
      depositDueDate: v.depositDueDate ?? '',
      paymentMethod: v.paymentMethod ?? '',
      paymentCondition: (v.paymentCondition || '') as PaymentConditionType,
      installments,
      dailyCount: v.dailyCount ?? '',
      packageType: v.packageType ?? '',
      eventCheckoutDate: v.eventCheckoutDate ?? '',
      cautionValue: v.cautionValue ?? '',
      benchCount: v.benchCount ?? '20',
      observations: v.observations ?? '',
    }
    setClauses((prev) =>
      prev.map((clause) => {
        if (clause.edited) return clause
        const template = getDefaultClauseTemplates(space.id).find((c) => c.id === clause.id)?.content || clause.content
        return { ...clause, content: substituteClause(template, formData, effectiveSpace) }
      })
    )
    setClausesApplied(true)
  }, [getValues, space.id, effectiveSpace, installments])

  const toggleClause = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setPendingRemovalClauseId(null)
    } else {
      const clause = clauses.find((c) => c.id === id)
      if (clause) setEditingContent(clause.content)
      setExpandedId(id)
      setPendingRemovalClauseId(null)
    }
  }

  const saveClause = (id: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content: editingContent, edited: true } : c))
    )
    setExpandedId(null)
  }

  const resetClause = (id: string) => {
    const formData = getValues() as ContractFormData
    const template = buildClauseTemplates(space.id, clauseStructure).find((c) => c.id === id)?.content || ''
    if (!template) return
    const restored = substituteClause(template, formData, effectiveSpace)
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content: restored, edited: false } : c))
    )
    if (expandedId === id) setEditingContent(restored)
  }

  const resetAllClauses = () => {
    const formData = getValues() as ContractFormData
    setClauses(
      buildClauseTemplates(space.id, clauseStructure).map((clause) => ({
        ...clause,
        edited: false,
        content: substituteClause(clause.content, formData, effectiveSpace),
      }))
    )
    setClausesApplied(false)
    setExpandedId(null)
    setPendingRemovalClauseId(null)
  }

  const toggleAllClauses = () => {
    setAllExpanded((v) => !v)
    setExpandedId(null)
  }

  const getNextAdditionalClauseNumber = useCallback(() => {
    const count = clauses.filter((clause) => clause.id.startsWith('custom-')).length + 1
    return `ADICIONAL ${count}`
  }, [clauses])

  const openAddClauseForm = () => {
    setShowAddClauseForm(true)
    setNewClauseNumber(getNextAdditionalClauseNumber())
    setNewClauseTitle('')
    setNewClauseContent('')
    setNewClauseError('')
    setPendingRemovalClauseId(null)
  }

  const closeAddClauseForm = () => {
    setShowAddClauseForm(false)
    setNewClauseNumber('')
    setNewClauseTitle('')
    setNewClauseContent('')
    setNewClauseError('')
  }

  const addCustomClause = () => {
    const title = newClauseTitle.trim()
    const content = newClauseContent.trim()
    const number = newClauseNumber.trim() || getNextAdditionalClauseNumber()

    if (!title || !content) {
      setNewClauseError('Preencha o título e o conteúdo da nova cláusula.')
      return
    }

    const newClauseTemplate: PersistedClauseTemplate = {
      id: `custom-${Date.now()}`,
      number,
      title,
      content,
    }

    const nextStructure: PersistedClauseStructure = {
      ...clauseStructure,
      customClauses: [...clauseStructure.customClauses, newClauseTemplate],
    }

    persistClauseStructure(nextStructure)
    setClauses((prev) => [...prev, { ...newClauseTemplate, edited: false }])
    setClausesApplied(false)
    closeAddClauseForm()
  }

  const requestClauseRemoval = (id: string) => {
    setPendingRemovalClauseId(id)
  }

  const cancelClauseRemoval = () => {
    setPendingRemovalClauseId(null)
  }

  const confirmClauseRemoval = (id: string) => {
    const clauseExists = clauses.some((clause) => clause.id === id)
    if (!clauseExists) {
      setPendingRemovalClauseId(null)
      return
    }

    const defaultClauseIds = new Set(getDefaultClauseTemplates(space.id).map((clause) => clause.id))

    let nextStructure = clauseStructure
    if (defaultClauseIds.has(id)) {
      nextStructure = {
        ...clauseStructure,
        removedDefaultClauseIds: Array.from(new Set([...clauseStructure.removedDefaultClauseIds, id])),
      }
    } else {
      nextStructure = {
        ...clauseStructure,
        customClauses: clauseStructure.customClauses.filter((clause) => clause.id !== id),
      }
    }

    persistClauseStructure(nextStructure)
    setClauses((prev) => prev.filter((clause) => clause.id !== id))
    setClausesApplied(false)
    setPendingRemovalClauseId(null)

    if (expandedId === id) {
      setExpandedId(null)
      setEditingContent('')
    }
  }

  const getFormDataForPDF = (): ContractFormData => {
    const v = getValues()
    return {
      ...v,
      clientRG: v.clientRG ?? '',
      clientNationality: v.clientNationality ?? '',
      clientCivilStatus: v.clientCivilStatus ?? '',
      clientProfession: v.clientProfession ?? '',
      clientEmail: v.clientEmail ?? '',
      remainingValue: v.remainingValue ?? '',
      remainingDueDate: v.remainingDueDate ?? '',
      depositValue: v.depositValue ?? '',
      depositDueDate: v.depositDueDate ?? '',
      paymentMethod: v.paymentMethod ?? '',
      paymentCondition: (v.paymentCondition || '') as PaymentConditionType,
      installments,
      dailyCount: v.dailyCount ?? '',
      packageType: v.packageType ?? '',
      eventCheckoutDate: v.eventCheckoutDate ?? '',
      cautionValue: v.cautionValue ?? '',
      benchCount: v.benchCount ?? '20',
      observations: v.observations ?? '',
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: space.bgColor }}
        >
          <FileText className="h-5 w-5" style={{ color: space.color }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">{space.displayName}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Gerador de Contrato de Locação</p>
        </div>
      </div>

      {/* ── SECTION 0: Vincular Evento (Clicksign) ── */}
      <SectionCard title="Vincular ao Evento (Clicksign)">
        <div className="space-y-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            Selecione um evento para habilitar o envio do contrato para assinatura via Clicksign/WhatsApp.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              placeholder="Buscar evento por nome do cliente..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {eventsLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando eventos...
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-[var(--border)] p-1">
              {events
                .filter((e) => {
                  if (!eventSearch) return true
                  const q = eventSearch.toLowerCase()
                  return (
                    e.clientName.toLowerCase().includes(q) ||
                    e.title.toLowerCase().includes(q)
                  )
                })
                .map((e) => {
                  const isSelected = selectedEventId === e.id
                  const eventDate = new Date(e.start).toLocaleDateString('pt-BR')
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedEventId(isSelected ? null : e.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                          : 'hover:bg-[var(--secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium">{e.clientName}</span>
                          <span className="text-xs opacity-70">- {e.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs opacity-70">{eventDate}</span>
                          <ContractStatusBadge status={e.contractStatus} />
                        </div>
                      </div>
                    </button>
                  )
                })}
              {events.length === 0 && (
                <p className="text-xs text-[var(--muted-foreground)] text-center py-3">
                  Nenhum evento encontrado.
                </p>
              )}
            </div>
          )}
          {selectedEventId && existingSignature && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] p-3">
              <ContractStatusBadge status={existingSignature.status} />
              {existingSignature.signingUrl && (
                <a
                  href={existingSignature.signingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver link de assinatura
                </a>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── SECTION 1: Identificação ── */}
      <SectionCard title="Identificação do Contrato">
        <FieldRow>
          <Field label="Número do Contrato *" error={errors.contractNumber?.message}>
            <Input {...register('contractNumber')} placeholder="EST-20250101" />
          </Field>
          <Field label="Data do Contrato *" error={errors.contractDate?.message}>
            <Input type="date" {...register('contractDate')} />
          </Field>
        </FieldRow>
      </SectionCard>

      {/* ── SECTION: Dados do Contratado (nossos dados) ── */}
      <SectionCard title="Dados do(a) Contratado(a) — Nossos Dados">
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          Estes são os dados do contratado que aparecerão no contrato. Edite se necessário — as alterações serão salvas para os próximos contratos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONTRACTOR_FIELDS.filter(f => !f.section).map(({ key, label, placeholder, colSpan }) => (
            <Field key={key} label={label} className={colSpan}>
              <Input
                value={contractorOverrides[key] ?? ''}
                placeholder={effectiveSpace[key] || placeholder}
                onChange={(e) => {
                  const next = { ...contractorOverrides, [key]: e.target.value }
                  setContractorOverrides(next)
                  saveContractorOverrides(space.id, next)
                  setClausesApplied(false)
                }}
              />
            </Field>
          ))}
        </div>
        <p className="text-xs font-semibold text-[var(--muted-foreground)] mt-5 mb-3 uppercase tracking-wide">Dados Bancários</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONTRACTOR_FIELDS.filter(f => f.section === 'bank').map(({ key, label, placeholder, colSpan }) => (
            <Field key={key} label={label} className={colSpan}>
              <Input
                value={contractorOverrides[key] ?? ''}
                placeholder={effectiveSpace[key] || placeholder}
                onChange={(e) => {
                  const next = { ...contractorOverrides, [key]: e.target.value }
                  setContractorOverrides(next)
                  saveContractorOverrides(space.id, next)
                  setClausesApplied(false)
                }}
              />
            </Field>
          ))}
        </div>
      </SectionCard>

      {/* ── SECTION 2: Dados do Contratante ── */}
      <SectionCard title="Dados do(a) Contratante">
        <FieldRow>
          <Field label={clientIsCNPJ ? 'Razão Social *' : 'Nome Completo *'} error={errors.clientName?.message} className="sm:col-span-2 lg:col-span-2">
            <Input {...register('clientName')} placeholder={clientIsCNPJ ? 'Empresa Ltda' : 'João da Silva'} />
          </Field>
          <Field label="CPF / CNPJ *" error={errors.clientCPF?.message}>
            <Input {...register('clientCPF')} placeholder="000.000.000-00" />
          </Field>
        </FieldRow>
        <FieldRow>
          {!clientIsCNPJ && (
            <Field label="RG" error={errors.clientRG?.message}>
              <Input {...register('clientRG')} placeholder="00.000.000-0" />
            </Field>
          )}
          <Field label="Telefone *" error={errors.clientPhone?.message}>
            <Input {...register('clientPhone')} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="E-mail" error={errors.clientEmail?.message}>
            <Input {...register('clientEmail')} placeholder="email@exemplo.com" />
          </Field>
        </FieldRow>
        {!clientIsCNPJ && (
          <FieldRow>
            <Field label="Nacionalidade" error={errors.clientNationality?.message}>
              <Input {...register('clientNationality')} placeholder="Brasileira" />
            </Field>
            <Field label="Estado Civil" error={errors.clientCivilStatus?.message}>
              <select {...register('clientCivilStatus')} className={selectClass}>
                <option value="">Selecione...</option>
                {CIVIL_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Profissão" error={errors.clientProfession?.message}>
              <Input {...register('clientProfession')} placeholder="Engenheiro, Professor..." />
            </Field>
          </FieldRow>
        )}
        <FieldRow>
          <Field label="Endereço Completo *" error={errors.clientAddress?.message} className="sm:col-span-2">
            <Input {...register('clientAddress')} placeholder="Rua Exemplo, 123 — Bairro" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade *" error={errors.clientCity?.message}>
              <Input {...register('clientCity')} placeholder="São Paulo" />
            </Field>
            <Field label="UF *" error={errors.clientState?.message}>
              <Input {...register('clientState')} placeholder="SP" maxLength={2} className="uppercase" />
            </Field>
          </div>
        </FieldRow>
      </SectionCard>

      {/* ── SECTION 3: Dados do Evento ── */}
      <SectionCard title="Dados do Evento">
        <FieldRow>
          <Field label="Data do Evento *" error={errors.eventDate?.message}>
            <Input type="date" {...register('eventDate')} />
          </Field>
          <Field label="Horário de Início *" error={errors.eventStartTime?.message}>
            <Input type="time" {...register('eventStartTime')} />
          </Field>
          <Field label="Horário de Término *" error={errors.eventEndTime?.message}>
            <Input type="time" {...register('eventEndTime')} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Tipo do Evento *" error={errors.eventType?.message} className="sm:col-span-2">
            <select {...register('eventType')} className={selectClass}>
              <option value="">Selecione...</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Nº de Convidados *" error={errors.guestCount?.message}>
            <Input type="number" {...register('guestCount')} placeholder="150" min="1" />
          </Field>
        </FieldRow>
        {space.id === 'rancho-aveiro' && (
          <>
            <FieldRow>
              <Field label="Data de Saída *" error={errors.eventCheckoutDate?.message}>
                <Input type="date" {...register('eventCheckoutDate')} />
              </Field>
              <Field label="Bancos p/ Cerimônia">
                <Input type="number" {...register('benchCount')} placeholder="20" min="0" />
              </Field>
            </FieldRow>
            {guestCountValue && parseInt(guestCountValue) > 0 && (
              <div className="mt-2 p-3 bg-[var(--secondary)] rounded-lg">
                <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Itens calculados automaticamente (Cláusula 11ª):</p>
                <div className="flex gap-4 text-xs text-[var(--foreground)]">
                  <span>Cadeiras: <strong>{parseInt(guestCountValue)}</strong></span>
                  <span>Mesas: <strong>{Math.ceil(parseInt(guestCountValue) / 8)}</strong></span>
                  <span>Bancos cerimônia: <strong>{parseInt(getValues().benchCount || '20') || 20}</strong></span>
                </div>
              </div>
            )}
          </>
        )}
        {requiresExtendedEventData && (
          <FieldRow>
            <Field label="Quantidade de Diárias *" error={errors.dailyCount?.message}>
              <Input type="number" {...register('dailyCount')} placeholder="1" min="1" />
            </Field>
            <Field label="Data de Saída *" error={errors.eventCheckoutDate?.message}>
              <Input type="date" {...register('eventCheckoutDate')} />
            </Field>
            <Field label="Pacote *" error={errors.packageType?.message}>
              <select {...register('packageType')} className={selectClass}>
                <option value="">Selecione...</option>
                {PACKAGE_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
          </FieldRow>
        )}
      </SectionCard>

      {/* ── SECTION 4: Condições Financeiras ── */}
      <SectionCard title="Condições Financeiras">
        <FieldRow>
          <Field label="Valor Total (R$) *" error={errors.totalValue?.message}>
            <Input
              {...register('totalValue')}
              placeholder="5000,00"
              onBlur={(e) => {
                const v = parseFloat(e.target.value.replace(',', '.'))
                if (!isNaN(v)) setValue('totalValue', v.toFixed(2).replace('.', ','))
              }}
            />
          </Field>
          {requiresExtendedEventData && (
            <Field label="Valor do Caução (R$) *" error={errors.cautionValue?.message}>
              <Input
                {...register('cautionValue')}
                placeholder="1000,00"
                onBlur={(e) => {
                  const v = parseFloat(e.target.value.replace(',', '.'))
                  if (!isNaN(v)) setValue('cautionValue', v.toFixed(2).replace('.', ','))
                }}
              />
            </Field>
          )}
        </FieldRow>

        {/* Payment Condition Selector */}
        <div className="mt-4">
          <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-2 block">Condição de Pagamento *</Label>
          {errors.paymentCondition && (
            <p className="text-xs text-[var(--destructive)] mb-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.paymentCondition.message}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYMENT_CONDITIONS.map((pc) => (
              <button
                key={pc.value}
                type="button"
                onClick={() => {
                  setValue('paymentCondition', pc.value, { shouldValidate: true })
                  if (pc.value !== 'entrada_parcelas') {
                    setInstallments([])
                  }
                  setClausesApplied(false)
                }}
                className={`text-left p-3 rounded-lg border-2 transition-all ${
                  paymentCondition === pc.value
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] hover:border-[var(--muted-foreground)]/30'
                }`}
              >
                <p className="text-sm font-medium text-[var(--foreground)]">{pc.label}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{pc.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Condition-specific fields */}
        {paymentCondition === 'a_vista' && (
          <div className="mt-4 p-4 bg-[var(--secondary)] rounded-lg">
            <p className="text-xs text-[var(--muted-foreground)] mb-3">Pagamento integral via Pix/Depósito na assinatura do contrato.</p>
            <FieldRow>
              <Field label="Data do Pagamento">
                <Input type="date" {...register('depositDueDate')} />
              </Field>
            </FieldRow>
          </div>
        )}

        {paymentCondition === 'entrada_parcelas' && (
          <div className="mt-4 p-4 bg-[var(--secondary)] rounded-lg space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Entrada (20%) (R$)">
                <Input
                  {...register('depositValue')}
                  placeholder="auto-calculado"
                  readOnly
                  className="bg-[var(--input-bg)] text-[var(--muted-foreground)] cursor-default"
                />
              </Field>
              <Field label="Data da Entrada">
                <Input type="date" {...register('depositDueDate')} />
              </Field>
              <Field label="Saldo Restante (R$)">
                <Input
                  {...register('remainingValue')}
                  placeholder="auto-calculado"
                  readOnly
                  className="bg-[var(--input-bg)] text-[var(--muted-foreground)] cursor-default"
                />
              </Field>
            </div>

            {/* Installments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium text-[var(--muted-foreground)]">Parcelas do Saldo Restante</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInstallments((prev) => [...prev, { date: '', value: '' }])
                    setClausesApplied(false)
                  }}
                  className="gap-1 text-xs h-7"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar parcela
                </Button>
              </div>

              {installments.length === 0 && (
                <p className="text-xs text-[var(--muted-foreground)] italic py-2">
                  Nenhuma parcela adicionada. Clique em &ldquo;Adicionar parcela&rdquo; para definir as parcelas.
                </p>
              )}

              {installments.map((inst, i) => (
                <div key={i} className="flex items-end gap-3 mb-2">
                  <div className="flex-shrink-0 w-8 h-9 flex items-center justify-center">
                    <span className="text-xs font-bold text-[var(--muted-foreground)]">{i + 1}ª</span>
                  </div>
                  <Field label={i === 0 ? 'Valor (R$)' : ''} className="flex-1">
                    <Input
                      value={inst.value}
                      placeholder="1000,00"
                      onChange={(e) => {
                        const next = [...installments]
                        next[i] = { ...next[i], value: e.target.value }
                        setInstallments(next)
                        setClausesApplied(false)
                      }}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'))
                        if (!isNaN(v)) {
                          const next = [...installments]
                          next[i] = { ...next[i], value: v.toFixed(2).replace('.', ',') }
                          setInstallments(next)
                        }
                      }}
                    />
                  </Field>
                  <Field label={i === 0 ? 'Vencimento' : ''} className="flex-1">
                    <Input
                      type="date"
                      value={inst.date}
                      onChange={(e) => {
                        const next = [...installments]
                        next[i] = { ...next[i], date: e.target.value }
                        setInstallments(next)
                        setClausesApplied(false)
                      }}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInstallments((prev) => prev.filter((_, idx) => idx !== i))
                      setClausesApplied(false)
                    }}
                    className="h-9 w-9 p-0 text-[var(--destructive)] flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {paymentCondition === 'cartao_credito' && (
          <div className="mt-4 p-4 bg-[var(--secondary)] rounded-lg">
            <p className="text-xs text-[var(--muted-foreground)]">
              Pagamento parcelado no cartão de crédito com juros adicionais da maquininha.
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── SECTION 5: Observações ── */}
      <SectionCard title="Observações Gerais">
        <Textarea
          {...register('observations')}
          placeholder="Informações adicionais, itens incluídos, condições especiais..."
          rows={3}
          className="resize-none"
        />
      </SectionCard>

      {/* ── SECTION 6: Cláusulas ── */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Cláusulas do Contrato
          </h3>
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyFormDataToClauses}
              className="gap-1.5 text-xs w-full justify-start sm:w-auto sm:justify-center"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="sm:hidden">{clausesApplied ? 'Reatualizar' : 'Aplicar dados'}</span>
              <span className="hidden sm:inline">
                {clausesApplied ? 'Reatualizar com formulário' : 'Aplicar dados do formulário'}
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleAllClauses}
              className="gap-1.5 text-xs w-full justify-start sm:w-auto sm:justify-center"
            >
              {allExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span className="sm:hidden">{allExpanded ? 'Recolher' : 'Expandir'}</span>
              <span className="hidden sm:inline">{allExpanded ? 'Recolher' : 'Expandir'} todas</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetAllClauses}
              className="gap-1.5 text-xs text-[var(--muted-foreground)] w-full justify-start sm:w-auto sm:justify-center"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddClauseForm}
              className="gap-1.5 text-xs w-full justify-start sm:w-auto sm:justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova cláusula
            </Button>
          </div>
        </div>

        {clausesApplied && (
          <div className="px-5 py-2.5 bg-[var(--success-light)] border-b border-[var(--border)] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--success)] flex-shrink-0" />
            <p className="text-xs text-[var(--success)]">
              Dados do formulário aplicados nas cláusulas. Clique em qualquer cláusula para revisar e editar.
            </p>
          </div>
        )}

        {showAddClauseForm && (
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--secondary)]/30">
            <p className="text-sm font-medium text-[var(--foreground)] mb-3">Adicionar nova cláusula</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <Field label="Número da Cláusula">
                <Input
                  value={newClauseNumber}
                  onChange={(e) => setNewClauseNumber(e.target.value)}
                  placeholder="ADICIONAL 1 ou DÉCIMA QUARTA"
                />
              </Field>
              <Field label="Título *" className="md:col-span-2">
                <Input
                  value={newClauseTitle}
                  onChange={(e) => setNewClauseTitle(e.target.value)}
                  placeholder="Ex.: DAS CONDIÇÕES ESPECIAIS"
                />
              </Field>
            </div>
            <Field label="Conteúdo da Cláusula *">
              <Textarea
                value={newClauseContent}
                onChange={(e) => setNewClauseContent(e.target.value)}
                rows={5}
                placeholder="Digite o texto da nova cláusula..."
                className="text-sm leading-relaxed"
              />
            </Field>
            {newClauseError && (
              <p className="text-xs text-[var(--destructive)] mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {newClauseError}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Button type="button" size="sm" onClick={addCustomClause} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Incluir cláusula
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={closeAddClauseForm}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-[var(--border)]">
          {clauses.map((clause, index) => {
            const isOpen = allExpanded || expandedId === clause.id

            return (
              <div key={clause.id}>
                {/* Clause header */}
                <button
                  type="button"
                  onClick={() => !allExpanded && toggleClause(clause.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[var(--secondary)] transition-colors group"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--secondary)] group-hover:bg-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--muted-foreground)] transition-colors">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                        Cláusula {clause.number}
                      </span>
                      {clause.edited && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[var(--warning-light)] text-[var(--warning-foreground)]">
                          <Edit3 className="h-2.5 w-2.5" />
                          Editada
                        </span>
                      )}
                      {clause.id.startsWith('custom-') && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)]">
                          Nova
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{clause.title}</p>
                  </div>
                  {!allExpanded && (
                    isOpen ? (
                      <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                    )
                  )}
                </button>

                {/* Clause content */}
                {isOpen && (
                  <div className="px-5 pb-5 bg-[var(--secondary)]/30">
                    {allExpanded ? (
                      /* Read-only when all expanded */
                      <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-4">
                        {clause.content}
                      </div>
                    ) : (
                      /* Editable when individually expanded */
                      <>
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          rows={Math.max(4, editingContent.split('\n').length + 1)}
                          className="text-sm font-mono leading-relaxed resize-y"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => saveClause(clause.id)}
                            className="gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Salvar cláusula
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => resetClause(clause.id)}
                            className="gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar padrão
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => requestClauseRemoval(clause.id)}
                          >
                            Remover cláusula
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(null)}
                            className="text-[var(--muted-foreground)]"
                          >
                            Cancelar
                          </Button>
                        </div>
                        {pendingRemovalClauseId === clause.id && (
                          <div className="mt-3 border border-red-300 bg-red-50 rounded-lg p-3">
                            <p className="text-xs text-red-700">
                              Esta ação irá remover a cláusula definitivamente da estrutura do contrato.
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={cancelClauseRemoval}
                              >
                                Cancelar Remoção
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => confirmClauseRemoval(clause.id)}
                              >
                                Remover Cláusula
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Generate PDF / Send to Clicksign ── */}
      <div className="flex items-center justify-between bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm px-5 py-4">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">Pronto para gerar o contrato?</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Revise as cláusulas e verifique os dados antes de gerar.
          </p>
          {!isValid && (
            <p className="text-xs text-[var(--warning)] mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Há campos obrigatórios não preenchidos ou inválidos.
            </p>
          )}
          {isValid && !clausesApplied && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Clique em &ldquo;Aplicar dados do formulário&rdquo; para atualizar as cláusulas.
            </p>
          )}
          {isValid && !selectedEventId && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Vincule um evento acima para enviar via Clicksign.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PDFGeneratorButton
            space={effectiveSpace}
            clauses={clauses}
            getFormData={getFormDataForPDF}
            isValid={isValid}
            onAfterGenerate={handleAfterDownload}
          />
          <ClicksignButton
            space={effectiveSpace}
            clauses={clauses}
            getFormData={getFormDataForPDF}
            isValid={isValid}
            eventId={selectedEventId}
            existingSignature={existingSignature}
            onAfterGenerate={handleAfterClicksign}
          />
        </div>
        {(isSaving || saveMessage) && (
          <div className="flex items-center gap-2 mt-2">
            {isSaving && (
              <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando contrato no evento...
              </span>
            )}
            {saveMessage && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {saveMessage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
