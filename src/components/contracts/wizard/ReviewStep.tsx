'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { addMonths } from 'date-fns'
import {
  User,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  Users,
  CreditCard,
} from 'lucide-react'
import type { ClientEventData } from './ClientEventStep'
import type { PaymentData } from './PaymentStep'
import type { ContractData } from './ContractStep'
import { ContractClause, SPACES } from '@/lib/contractTemplates'

interface Props {
  clientEventData: ClientEventData
  paymentData: PaymentData
  contractData: ContractData
  clauses: ContractClause[]
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="text-sm font-medium text-[var(--foreground)] break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

export function ReviewStep({ clientEventData, paymentData, contractData, clauses }: Props) {
  const totalValue = parseFloat((paymentData.totalValue || '0').replace(',', '.')) || 0
  const depositAmount = parseFloat((paymentData.depositAmount || '0').replace(',', '.')) || 0
  const remainingValue = Math.max(0, totalValue - depositAmount)
  const numberOfInstallments = parseInt(paymentData.numberOfInstallments || '1') || 1

  const spaceConfig = SPACES[contractData.spaceConfigId]

  const installmentPreview = useMemo(() => {
    if (remainingValue <= 0 || numberOfInstallments <= 0 || !paymentData.firstInstallmentDate) return []
    const installmentAmount = Math.floor((remainingValue / numberOfInstallments) * 100) / 100
    const lastAmount = remainingValue - installmentAmount * (numberOfInstallments - 1)
    return Array.from({ length: numberOfInstallments }, (_, i) => {
      const dueDate = addMonths(new Date(paymentData.firstInstallmentDate + 'T12:00:00'), i)
      const isLast = i === numberOfInstallments - 1
      return {
        number: i + 1,
        dueDate,
        amount: isLast ? Math.round(lastAmount * 100) / 100 : installmentAmount,
      }
    })
  }, [remainingValue, numberOfInstallments, paymentData.firstInstallmentDate])

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Revisão do Contrato</h3>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300">
          Confira todas as informações abaixo antes de confirmar. Ao clicar em &quot;Confirmar e Criar&quot;, o cliente, evento, plano de pagamento e data de interesse serão criados automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client info */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-2">
              <User className="h-4 w-4" /> Cliente
            </h3>
          </div>
          <div className="p-5 space-y-1">
            <InfoRow label="Nome" value={clientEventData.clientName} />
            <InfoRow label="CPF" value={clientEventData.clientCPF} />
            {clientEventData.clientRG && <InfoRow label="RG" value={clientEventData.clientRG} />}
            <InfoRow label="Telefone" value={clientEventData.clientPhone} />
            <InfoRow label="Email" value={clientEventData.clientEmail} />
            <InfoRow label="Endereço" value={`${clientEventData.clientAddress}, ${clientEventData.clientCity} - ${clientEventData.clientState}`} />
            {clientEventData.clientId && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Cliente existente - dados serão atualizados
              </p>
            )}
          </div>
        </div>

        {/* Event info */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Evento
            </h3>
          </div>
          <div className="p-5 space-y-1">
            <InfoRow label="Título" value={clientEventData.eventTitle} />
            <InfoRow label="Tipo" value={clientEventData.eventType} icon={FileText} />
            <InfoRow
              label="Data e Horário"
              value={
                clientEventData.eventStart
                  ? `${format(new Date(clientEventData.eventStart), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — ${clientEventData.eventEnd ? format(new Date(clientEventData.eventEnd), "HH:mm", { locale: ptBR }) : ''}`
                  : ''
              }
              icon={Clock}
            />
            {clientEventData.guestCount && (
              <InfoRow label="Convidados" value={`${clientEventData.guestCount} pessoas`} icon={Users} />
            )}
            {clientEventData.professionalIds.length > 0 && (
              <InfoRow label="Profissionais" value={`${clientEventData.professionalIds.length} selecionados`} />
            )}
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Financeiro
          </h3>
        </div>

        <div className="p-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-[var(--secondary)]">
              <p className="text-xs text-[var(--muted-foreground)]">Valor Total</p>
              <p className="text-lg font-bold text-[var(--foreground)]">{formatCurrency(totalValue)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--secondary)]">
              <p className="text-xs text-[var(--muted-foreground)]">Entrada</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(depositAmount)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--secondary)]">
              <p className="text-xs text-[var(--muted-foreground)]">Restante</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(remainingValue)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--secondary)]">
              <p className="text-xs text-[var(--muted-foreground)]">Parcelas</p>
              <p className="text-lg font-bold text-[var(--foreground)]">{numberOfInstallments}x</p>
            </div>
          </div>

          {/* Payment plan */}
          <div className="rounded-lg border border-[var(--border)] overflow-hidden">
            <div className="divide-y divide-[var(--border)]">
              {depositAmount > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <DollarSign className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="flex-1 font-medium">Sinal</span>
                  <span className="text-[var(--muted-foreground)]">
                    {paymentData.depositDueDate
                      ? format(new Date(paymentData.depositDueDate + 'T12:00:00'), 'dd/MM/yyyy')
                      : '—'}
                  </span>
                  <span className="font-semibold w-28 text-right">{formatCurrency(depositAmount)}</span>
                  {paymentData.depositPaid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                </div>
              )}
              {installmentPreview.map((inst) => (
                <div key={inst.number} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <CreditCard className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="flex-1">Parcela {inst.number}/{numberOfInstallments}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {format(inst.dueDate, 'dd/MM/yyyy')}
                  </span>
                  <span className="font-semibold w-28 text-right">{formatCurrency(inst.amount)}</span>
                  <Clock className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 text-sm">
            <CreditCard className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-[var(--muted-foreground)]">Forma de pagamento:</span>
            <span className="font-medium text-[var(--foreground)]">{paymentData.paymentMethod || '—'}</span>
          </div>
        </div>
      </div>

      {/* Contract info */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-2">
            <FileText className="h-4 w-4" /> Contrato
          </h3>
        </div>
        <div className="p-5 space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <InfoRow label="Espaço" value={spaceConfig?.displayName || '—'} icon={MapPin} />
            <InfoRow label="Nº do Contrato" value={contractData.contractNumber} />
            <InfoRow label="Data" value={contractData.contractDate ? format(new Date(contractData.contractDate + 'T12:00:00'), 'dd/MM/yyyy') : '—'} />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {clauses.length} cláusulas • {clauses.filter((c) => c.edited).length} editadas manualmente
          </p>
        </div>
      </div>

      {/* What will be created */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">
          O que será criado ao confirmar:
        </h4>
        <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {clientEventData.clientId ? 'Atualização do cliente existente com dados completos' : 'Novo cliente com dados completos (nome, CPF, endereço)'}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Evento com status &quot;Reservado&quot;
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Plano de pagamento com {depositAmount > 0 ? '1 sinal + ' : ''}{numberOfInstallments} parcela(s)
          </li>
          {paymentData.depositPaid && (
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Entrada marcada como paga + transação registrada
            </li>
          )}
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Data de interesse confirmada para o cliente
          </li>
        </ul>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
          Após a criação, você será redirecionado para a página do evento onde poderá gerar o PDF do contrato e enviá-lo para assinatura no Clicksign.
        </p>
      </div>
    </div>
  )
}
