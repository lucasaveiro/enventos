'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Loader2, User, DollarSign, FileText, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ClientEventStep, type ClientEventData } from './ClientEventStep'
import { PaymentStep, type PaymentData } from './PaymentStep'
import { ContractStep, type ContractData } from './ContractStep'
import { ReviewStep } from './ReviewStep'
import { createClosedContract } from '@/app/actions/contractWizard'
import { ContractClause, SPACES, generateContractNumber, getInitialClauses } from '@/lib/contractTemplates'

const STEPS = [
  { id: 1, title: 'Cliente & Evento', icon: User },
  { id: 2, title: 'Pagamento', icon: DollarSign },
  { id: 3, title: 'Contrato', icon: FileText },
  { id: 4, title: 'Revisão', icon: ClipboardCheck },
]

const defaultSpaceConfig = Object.values(SPACES)[0]

export function NewContractWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Step 1: Client & Event
  const [clientEventData, setClientEventData] = useState<ClientEventData>({
    clientId: null,
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientCPF: '',
    clientRG: '',
    clientAddress: '',
    clientCity: '',
    clientState: '',
    clientNotes: '',
    eventTitle: '',
    spaceId: null,
    eventStart: '',
    eventEnd: '',
    eventType: '',
    guestCount: '',
    professionalIds: [],
    eventNotes: '',
  })

  // Step 2: Payment
  const [paymentData, setPaymentData] = useState<PaymentData>({
    totalValue: '',
    depositAmount: '',
    depositDueDate: '',
    depositPaid: false,
    depositPaidAt: '',
    depositPaymentMethod: '',
    numberOfInstallments: '1',
    firstInstallmentDate: '',
    paymentMethod: '',
    cautionValue: '',
  })

  // Step 3: Contract
  const [contractData, setContractData] = useState<ContractData>({
    contractNumber: generateContractNumber(defaultSpaceConfig),
    contractDate: new Date().toISOString().split('T')[0],
    observations: '',
    spaceConfigId: defaultSpaceConfig.id,
    dailyCount: '',
    packageType: '',
    eventCheckoutDate: '',
  })

  const [clauses, setClauses] = useState<ContractClause[]>(() => getInitialClauses(defaultSpaceConfig.id))

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep1 = useCallback((): boolean => {
    const errs: Record<string, string> = {}
    if (!clientEventData.clientName.trim()) errs.clientName = 'Nome é obrigatório'
    if (!clientEventData.clientCPF.trim()) errs.clientCPF = 'CPF é obrigatório'
    if (!clientEventData.clientAddress.trim()) errs.clientAddress = 'Endereço é obrigatório'
    if (!clientEventData.clientCity.trim()) errs.clientCity = 'Cidade é obrigatória'
    if (!clientEventData.clientState.trim()) errs.clientState = 'UF é obrigatória'
    if (!clientEventData.eventTitle.trim()) errs.eventTitle = 'Título do evento é obrigatório'
    if (!clientEventData.spaceId) errs.spaceId = 'Espaço é obrigatório'
    if (!clientEventData.eventStart) errs.eventStart = 'Data de início é obrigatória'
    if (!clientEventData.eventEnd) errs.eventEnd = 'Data de fim é obrigatória'
    if (!clientEventData.eventType) errs.eventType = 'Tipo de evento é obrigatório'
    if (clientEventData.eventStart && clientEventData.eventEnd) {
      if (new Date(clientEventData.eventEnd) <= new Date(clientEventData.eventStart)) {
        errs.eventEnd = 'Fim deve ser maior que início'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [clientEventData])

  const validateStep2 = useCallback((): boolean => {
    const errs: Record<string, string> = {}
    const totalValue = parseFloat((paymentData.totalValue || '0').replace(',', '.'))
    const depositAmount = parseFloat((paymentData.depositAmount || '0').replace(',', '.'))

    if (!totalValue || totalValue <= 0) errs.totalValue = 'Valor total é obrigatório'
    if (depositAmount < 0) errs.depositAmount = 'Valor inválido'
    if (depositAmount > totalValue) errs.depositAmount = 'Entrada não pode ser maior que o total'
    if (!paymentData.depositDueDate) errs.depositDueDate = 'Data de vencimento é obrigatória'
    if (!paymentData.paymentMethod) errs.paymentMethod = 'Forma de pagamento é obrigatória'

    const remaining = totalValue - depositAmount
    if (remaining > 0) {
      const n = parseInt(paymentData.numberOfInstallments || '0')
      if (!n || n < 1) errs.numberOfInstallments = 'Mínimo 1 parcela'
      if (!paymentData.firstInstallmentDate) errs.firstInstallmentDate = 'Data da 1ª parcela é obrigatória'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [paymentData])

  const goNext = () => {
    setSubmitError('')
    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    setErrors({})
    setCurrentStep((s) => Math.min(s + 1, 4))
  }

  const goBack = () => {
    setSubmitError('')
    setErrors({})
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const totalValue = parseFloat((paymentData.totalValue || '0').replace(',', '.'))
      const depositAmount = parseFloat((paymentData.depositAmount || '0').replace(',', '.'))
      const remaining = totalValue - depositAmount

      const result = await createClosedContract({
        clientId: clientEventData.clientId,
        clientName: clientEventData.clientName,
        clientPhone: clientEventData.clientPhone || null,
        clientEmail: clientEventData.clientEmail || null,
        clientCPF: clientEventData.clientCPF,
        clientRG: clientEventData.clientRG || null,
        clientAddress: clientEventData.clientAddress,
        clientCity: clientEventData.clientCity,
        clientState: clientEventData.clientState,
        clientNotes: clientEventData.clientNotes || null,
        eventTitle: clientEventData.eventTitle,
        spaceId: clientEventData.spaceId!,
        eventStart: new Date(clientEventData.eventStart),
        eventEnd: new Date(clientEventData.eventEnd),
        eventType: clientEventData.eventType,
        guestCount: parseInt(clientEventData.guestCount) || 0,
        professionalIds: clientEventData.professionalIds,
        eventNotes: clientEventData.eventNotes || null,
        totalValue,
        depositAmount,
        depositDueDate: new Date(paymentData.depositDueDate + 'T12:00:00'),
        depositPaid: paymentData.depositPaid,
        depositPaidAt: paymentData.depositPaidAt ? new Date(paymentData.depositPaidAt + 'T12:00:00') : null,
        depositPaymentMethod: paymentData.depositPaymentMethod || null,
        numberOfInstallments: remaining > 0 ? (parseInt(paymentData.numberOfInstallments) || 1) : 0,
        firstInstallmentDate: paymentData.firstInstallmentDate
          ? new Date(paymentData.firstInstallmentDate + 'T12:00:00')
          : new Date(),
        paymentMethod: paymentData.paymentMethod,
      })

      if (!result.success) {
        setSubmitError(result.error || 'Erro desconhecido')
        return
      }

      // Redirect to event detail page to generate contract PDF
      router.push(`/events/${result.data!.eventId}`)
    } catch (error) {
      console.error(error)
      setSubmitError('Erro ao criar contrato. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Novo Contrato Fechado</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Cadastre cliente, evento, pagamento e contrato em um só lugar
              </p>
            </div>
            <Button variant="outline" onClick={() => router.back()} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id
              const StepIcon = step.icon

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted) {
                        setErrors({})
                        setCurrentStep(step.id)
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all w-full ${
                      isCurrent
                        ? 'bg-[var(--primary)] text-white shadow-sm'
                        : isCompleted
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-[var(--secondary)] text-[var(--muted-foreground)]'
                    }`}
                    disabled={!isCompleted && !isCurrent}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                      isCurrent ? 'bg-white/20' : isCompleted ? 'bg-green-200 dark:bg-green-800' : 'bg-[var(--border)]'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-xs font-medium hidden sm:block truncate">{step.title}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 w-4 shrink-0 mx-1 rounded ${
                      isCompleted ? 'bg-green-300 dark:bg-green-700' : 'bg-[var(--border)]'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {currentStep === 1 && (
          <ClientEventStep data={clientEventData} onChange={setClientEventData} errors={errors} />
        )}
        {currentStep === 2 && (
          <PaymentStep data={paymentData} onChange={setPaymentData} errors={errors} />
        )}
        {currentStep === 3 && (
          <ContractStep
            data={contractData}
            onChange={setContractData}
            clientEventData={clientEventData}
            paymentData={paymentData}
            clauses={clauses}
            onClausesChange={setClauses}
            errors={errors}
          />
        )}
        {currentStep === 4 && (
          <ReviewStep
            clientEventData={clientEventData}
            paymentData={paymentData}
            contractData={contractData}
            clauses={clauses}
          />
        )}

        {/* Error message */}
        {submitError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {submitError}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={goBack} className="gap-1.5" disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep < 4 ? (
              <Button onClick={goNext} className="gap-1.5">
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmar e Criar
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
