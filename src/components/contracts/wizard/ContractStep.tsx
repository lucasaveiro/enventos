'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronUp, Edit3, RotateCcw, Plus, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  ContractClause,
  ContractFormData,
  SpaceConfig,
  SPACES,
  generateContractNumber,
  getDefaultClauseTemplates,
  getInitialClauses,
  substituteClause,
  formatCurrency,
  formatDate,
} from '@/lib/contractTemplates'
import type { ClientEventData } from './ClientEventStep'
import type { PaymentData } from './PaymentStep'

export interface ContractData {
  contractNumber: string
  contractDate: string
  observations: string
  spaceConfigId: string
  // Extended fields for specific spaces
  dailyCount: string
  packageType: string
  eventCheckoutDate: string
}

interface Props {
  data: ContractData
  onChange: (data: ContractData) => void
  clientEventData: ClientEventData
  paymentData: PaymentData
  clauses: ContractClause[]
  onClausesChange: (clauses: ContractClause[]) => void
  errors: Record<string, string>
}

const selectClass = "flex h-9 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"

export function ContractStep({ data, onChange, clientEventData, paymentData, clauses, onClausesChange, errors }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [allExpanded, setAllExpanded] = useState(false)
  const [showAddClauseForm, setShowAddClauseForm] = useState(false)
  const [newClauseNumber, setNewClauseNumber] = useState('')
  const [newClauseTitle, setNewClauseTitle] = useState('')
  const [newClauseContent, setNewClauseContent] = useState('')
  const [newClauseError, setNewClauseError] = useState('')

  const spaceConfig = useMemo(() => {
    if (data.spaceConfigId) return SPACES[data.spaceConfigId]
    return Object.values(SPACES)[0]
  }, [data.spaceConfigId])

  const requiresExtendedData = spaceConfig?.id === 'estancia-aveiro'
  const requiresCheckoutDate = requiresExtendedData || spaceConfig?.id === 'rancho-aveiro'

  const update = (field: keyof ContractData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  // Build form data for clause substitution
  const buildFormData = useCallback((): Partial<ContractFormData> => {
    const totalValue = parseFloat((paymentData.totalValue || '0').replace(',', '.')) || 0
    const depositAmount = parseFloat((paymentData.depositAmount || '0').replace(',', '.')) || 0
    const remaining = Math.max(0, totalValue - depositAmount)

    // Compute remaining due date from installment preview
    const numberOfInstallments = parseInt(paymentData.numberOfInstallments || '1') || 1
    let remainingDueDate = paymentData.firstInstallmentDate
    if (numberOfInstallments > 1 && paymentData.firstInstallmentDate) {
      const { addMonths } = require('date-fns')
      const lastDate = addMonths(new Date(paymentData.firstInstallmentDate + 'T12:00:00'), numberOfInstallments - 1)
      remainingDueDate = lastDate.toISOString().split('T')[0]
    }

    return {
      contractNumber: data.contractNumber,
      contractDate: data.contractDate,
      clientName: clientEventData.clientName,
      clientCPF: clientEventData.clientCPF,
      clientRG: clientEventData.clientRG,
      clientAddress: clientEventData.clientAddress,
      clientCity: clientEventData.clientCity,
      clientState: clientEventData.clientState,
      clientPhone: clientEventData.clientPhone,
      clientEmail: clientEventData.clientEmail,
      eventDate: clientEventData.eventStart?.split('T')[0] || '',
      eventStartTime: clientEventData.eventStart?.split('T')[1] || '',
      eventEndTime: clientEventData.eventEnd?.split('T')[1] || '',
      eventType: clientEventData.eventType,
      guestCount: clientEventData.guestCount,
      dailyCount: data.dailyCount,
      packageType: data.packageType,
      eventCheckoutDate: data.eventCheckoutDate,
      totalValue: paymentData.totalValue,
      depositValue: paymentData.depositAmount,
      depositDueDate: paymentData.depositDueDate,
      remainingValue: remaining.toFixed(2),
      remainingDueDate,
      paymentMethod: paymentData.paymentMethod,
      cautionValue: paymentData.cautionValue,
      observations: data.observations,
    }
  }, [data, clientEventData, paymentData])

  // Apply form data to clauses
  const applyFormDataToClauses = useCallback(() => {
    if (!spaceConfig) return
    const formData = buildFormData()
    onClausesChange(
      clauses.map((clause) => {
        if (clause.edited) return clause
        const template = getDefaultClauseTemplates(spaceConfig.id).find((c) => c.id === clause.id)?.content || clause.content
        return { ...clause, content: substituteClause(template, formData, spaceConfig) }
      })
    )
  }, [buildFormData, clauses, onClausesChange, spaceConfig])

  // Auto-apply on mount and when space changes
  useEffect(() => {
    if (spaceConfig && clauses.length > 0) {
      applyFormDataToClauses()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceConfig?.id])

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
    onClausesChange(
      clauses.map((c) => (c.id === id ? { ...c, content: editingContent, edited: true } : c))
    )
    setExpandedId(null)
  }

  const resetClause = (id: string) => {
    if (!spaceConfig) return
    const formData = buildFormData()
    const template = getDefaultClauseTemplates(spaceConfig.id).find((c) => c.id === id)?.content || ''
    if (!template) return
    const restored = substituteClause(template, formData, spaceConfig)
    onClausesChange(
      clauses.map((c) => (c.id === id ? { ...c, content: restored, edited: false } : c))
    )
    if (expandedId === id) setEditingContent(restored)
  }

  const removeClause = (id: string) => {
    onClausesChange(clauses.filter((c) => c.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const addCustomClause = () => {
    const title = newClauseTitle.trim()
    const content = newClauseContent.trim()
    const number = newClauseNumber.trim() || `ADICIONAL ${clauses.filter((c) => c.id.startsWith('custom-')).length + 1}`

    if (!title || !content) {
      setNewClauseError('Preencha o título e o conteúdo da nova cláusula.')
      return
    }

    const newClause: ContractClause = {
      id: `custom-${Date.now()}`,
      number,
      title,
      content,
      edited: false,
    }

    onClausesChange([...clauses, newClause])
    setShowAddClauseForm(false)
    setNewClauseNumber('')
    setNewClauseTitle('')
    setNewClauseContent('')
    setNewClauseError('')
  }

  return (
    <div className="space-y-6">
      {/* Contract header */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Informações do Contrato
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Espaço do Contrato *</Label>
              <select
                className={selectClass}
                value={data.spaceConfigId}
                onChange={(e) => {
                  update('spaceConfigId', e.target.value)
                  // Reset clauses for new space
                  const newSpace = SPACES[e.target.value]
                  if (newSpace) {
                    onClausesChange(getInitialClauses(newSpace.id))
                  }
                }}
              >
                {Object.values(SPACES).map((s) => (
                  <option key={s.id} value={s.id}>{s.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Nº do Contrato</Label>
              <Input
                value={data.contractNumber}
                onChange={(e) => update('contractNumber', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Data do Contrato</Label>
              <Input
                type="date"
                value={data.contractDate}
                onChange={(e) => update('contractDate', e.target.value)}
              />
            </div>
          </div>

          {/* Extended fields for specific spaces */}
          {(requiresExtendedData || requiresCheckoutDate) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)]">
              {requiresCheckoutDate && (
                <div>
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Data de Saída</Label>
                  <Input
                    type="date"
                    value={data.eventCheckoutDate}
                    onChange={(e) => update('eventCheckoutDate', e.target.value)}
                  />
                </div>
              )}
              {requiresExtendedData && (
                <>
                  <div>
                    <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Total de Diárias</Label>
                    <Input
                      value={data.dailyCount}
                      onChange={(e) => update('dailyCount', e.target.value)}
                      placeholder="Ex: 2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Tipo de Pacote</Label>
                    <select
                      className={selectClass}
                      value={data.packageType}
                      onChange={(e) => update('packageType', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="simples">Pacote Simples</option>
                      <option value="completo">Pacote Completo</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Observações</Label>
            <Textarea
              value={data.observations}
              onChange={(e) => update('observations', e.target.value)}
              placeholder="Observações adicionais para o contrato..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={applyFormDataToClauses} className="text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Atualizar Cláusulas com Dados
            </Button>
          </div>
        </div>
      </div>

      {/* Clauses Section */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Cláusulas do Contrato ({clauses.length})
          </h3>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAllExpanded(!allExpanded)} className="text-xs gap-1">
              {allExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {allExpanded ? 'Recolher' : 'Expandir'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddClauseForm(true)} className="text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {clauses.map((clause) => {
            const isExpanded = allExpanded || expandedId === clause.id

            return (
              <div key={clause.id} className="group">
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--secondary)] transition-colors"
                  onClick={() => toggleClause(clause.id)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase">{clause.number}</span>
                    <span className="text-sm font-medium text-[var(--foreground)] ml-2">{clause.title}</span>
                    {clause.edited && (
                      <span className="ml-2 text-xs text-amber-600 font-medium">(editada)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {clause.edited && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); resetClause(clause.id) }}
                        className="p-1.5 rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)]"
                        title="Restaurar original"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeClause(clause.id) }}
                      className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      title="Remover cláusula"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                  )}
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4">
                    {expandedId === clause.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          rows={8}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => saveClause(clause.id)} className="text-xs gap-1">
                            <Edit3 className="h-3 w-3" /> Salvar Edição
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setExpandedId(null)} className="text-xs">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap cursor-pointer hover:text-[var(--foreground)] transition-colors"
                        onClick={(e) => { e.stopPropagation(); toggleClause(clause.id) }}
                      >
                        {clause.content}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add clause form */}
        {showAddClauseForm && (
          <div className="p-5 border-t border-[var(--border)] bg-[var(--secondary)] space-y-3">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">Nova Cláusula</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Número (ex: DÉCIMA TERCEIRA)"
                value={newClauseNumber}
                onChange={(e) => setNewClauseNumber(e.target.value)}
              />
              <Input
                placeholder="Título"
                value={newClauseTitle}
                onChange={(e) => setNewClauseTitle(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Conteúdo da cláusula..."
              value={newClauseContent}
              onChange={(e) => setNewClauseContent(e.target.value)}
              rows={4}
            />
            {newClauseError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {newClauseError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={addCustomClause} className="text-xs">Adicionar</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddClauseForm(false)} className="text-xs">Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
