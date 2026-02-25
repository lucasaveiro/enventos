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
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  ContractClause,
  ContractFormData,
  SpaceConfig,
  generateContractNumber,
  getDefaultClauseTemplates,
  getInitialClauses,
  substituteClause,
} from '@/lib/contractTemplates'

// Dynamic import to avoid SSR issues with @react-pdf/renderer
const PDFGeneratorButton = dynamic(() => import('./PDFGeneratorButton'), {
  ssr: false,
  loading: () => (
    <Button disabled className="gap-2 min-w-48">
      <Loader2 className="h-4 w-4 animate-spin" />
      Preparando PDF...
    </Button>
  ),
})

const baseSchema = z.object({
  contractNumber: z.string().min(1, 'Obrigatório'),
  contractDate: z.string().min(1, 'Obrigatório'),
  clientName: z.string().min(2, 'Mínimo 2 caracteres'),
  clientCPF: z.string().min(11, 'CPF inválido'),
  clientRG: z.string().optional(),
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
  depositValue: z.string().min(1, 'Obrigatório'),
  depositDueDate: z.string().min(1, 'Obrigatório'),
  remainingValue: z.string().optional(),
  remainingDueDate: z.string().min(1, 'Obrigatório'),
  paymentMethod: z.string().min(1, 'Obrigatório'),
  cautionValue: z.string().optional(),
  observations: z.string().optional(),
})

function createSchema(requiresExtendedEventData: boolean) {
  if (!requiresExtendedEventData) return baseSchema

  return baseSchema.superRefine((data, ctx) => {
    if (!data.dailyCount?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dailyCount'], message: 'Obrigatório' })
    }

    if (!data.eventCheckoutDate?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['eventCheckoutDate'], message: 'Obrigatório' })
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

const PAYMENT_METHODS = [
  'PIX',
  'Dinheiro',
  'Transferência bancária',
  'Cartão de crédito',
  'Cartão de débito',
  'Boleto bancário',
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

export function ContractEditor({ space }: Props) {
  const requiresExtendedEventData = space.id === 'estancia-aveiro'
  const schema = useMemo(() => createSchema(requiresExtendedEventData), [requiresExtendedEventData])

  const [clauses, setClauses] = useState<ContractClause[]>(() => getInitialClauses(space.id))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [allExpanded, setAllExpanded] = useState(false)
  const [clausesApplied, setClausesApplied] = useState(false)

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
      contractDate: new Date().toISOString().split('T')[0],
      clientName: '',
      clientCPF: '',
      clientRG: '',
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
      cautionValue: '',
      observations: '',
    },
  })

  // Auto-calculate remaining value when total or deposit changes
  const totalValue = useWatch({ control, name: 'totalValue' })
  const depositValue = useWatch({ control, name: 'depositValue' })

  useEffect(() => {
    const total = parseFloat((totalValue || '').replace(',', '.'))
    const deposit = parseFloat((depositValue || '').replace(',', '.'))
    if (!isNaN(total) && !isNaN(deposit) && total > 0) {
      const remaining = Math.max(0, total - deposit)
      setValue('remainingValue', remaining.toFixed(2).replace('.', ','))
    }
  }, [totalValue, depositValue, setValue])

  const applyFormDataToClauses = useCallback(() => {
    const formData = getValues() as ContractFormData
    setClauses((prev) =>
      prev.map((clause) => {
        if (clause.edited) return clause
        const template = getDefaultClauseTemplates(space.id).find((c) => c.id === clause.id)?.content || clause.content
        return { ...clause, content: substituteClause(template, formData, space) }
      })
    )
    setClausesApplied(true)
  }, [getValues, space])

  const toggleClause = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      const clause = clauses.find((c) => c.id === id)
      if (clause) setEditingContent(clause.content)
      setExpandedId(id)
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
    const template = getDefaultClauseTemplates(space.id).find((c) => c.id === id)?.content || ''
    const restored = substituteClause(template, formData, space)
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content: restored, edited: false } : c))
    )
    if (expandedId === id) setEditingContent(restored)
  }

  const resetAllClauses = () => {
    const formData = getValues() as ContractFormData
    setClauses(
      getDefaultClauseTemplates(space.id).map((clause) => ({
        ...clause,
        edited: false,
        content: substituteClause(clause.content, formData, space),
      }))
    )
    setClausesApplied(false)
    setExpandedId(null)
  }

  const toggleAllClauses = () => {
    setAllExpanded((v) => !v)
    setExpandedId(null)
  }

  const getFormDataForPDF = (): ContractFormData => {
    const v = getValues()
    return {
      ...v,
      clientRG: v.clientRG ?? '',
      clientEmail: v.clientEmail ?? '',
      remainingValue: v.remainingValue ?? '',
      dailyCount: v.dailyCount ?? '',
      packageType: v.packageType ?? '',
      eventCheckoutDate: v.eventCheckoutDate ?? '',
      cautionValue: v.cautionValue ?? '',
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

      {/* ── SECTION 2: Dados do Contratante ── */}
      <SectionCard title="Dados do(a) Contratante">
        <FieldRow>
          <Field label="Nome Completo *" error={errors.clientName?.message} className="sm:col-span-2 lg:col-span-2">
            <Input {...register('clientName')} placeholder="João da Silva" />
          </Field>
          <Field label="CPF *" error={errors.clientCPF?.message}>
            <Input {...register('clientCPF')} placeholder="000.000.000-00" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="RG" error={errors.clientRG?.message}>
            <Input {...register('clientRG')} placeholder="00.000.000-0" />
          </Field>
          <Field label="Telefone *" error={errors.clientPhone?.message}>
            <Input {...register('clientPhone')} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="E-mail" error={errors.clientEmail?.message}>
            <Input {...register('clientEmail')} placeholder="email@exemplo.com" />
          </Field>
        </FieldRow>
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
          <Field label="Valor da Entrada (R$) *" error={errors.depositValue?.message}>
            <Input
              {...register('depositValue')}
              placeholder="2000,00"
              onBlur={(e) => {
                const v = parseFloat(e.target.value.replace(',', '.'))
                if (!isNaN(v)) setValue('depositValue', v.toFixed(2).replace('.', ','))
              }}
            />
          </Field>
          <Field label="Valor Restante (R$)" error={errors.remainingValue?.message}>
            <Input
              {...register('remainingValue')}
              placeholder="auto-calculado"
              readOnly
              className="bg-[var(--secondary)] text-[var(--muted-foreground)] cursor-default"
            />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Vencimento da Entrada *" error={errors.depositDueDate?.message}>
            <Input type="date" {...register('depositDueDate')} />
          </Field>
          <Field label="Vencimento do Restante *" error={errors.remainingDueDate?.message}>
            <Input type="date" {...register('remainingDueDate')} />
          </Field>
          <Field label="Forma de Pagamento *" error={errors.paymentMethod?.message}>
            <select {...register('paymentMethod')} className={selectClass}>
              <option value="">Selecione...</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        </FieldRow>
        {requiresExtendedEventData && (
          <FieldRow>
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
          </FieldRow>
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
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Cláusulas do Contrato
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyFormDataToClauses}
              className="gap-1.5 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {clausesApplied ? 'Reatualizar com formulário' : 'Aplicar dados do formulário'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleAllClauses}
              className="gap-1.5 text-xs"
            >
              {allExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {allExpanded ? 'Recolher' : 'Expandir'} todas
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetAllClauses}
              className="gap-1.5 text-xs text-[var(--muted-foreground)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
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
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(null)}
                            className="text-[var(--muted-foreground)]"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Generate PDF ── */}
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
        </div>
        <PDFGeneratorButton
          space={space}
          clauses={clauses}
          getFormData={getFormDataForPDF}
          isValid={isValid}
        />
      </div>
    </div>
  )
}
