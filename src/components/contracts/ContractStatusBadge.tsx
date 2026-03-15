'use client'

import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_sent: {
    label: 'Não enviado',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  uploaded: {
    label: 'Enviando...',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  signer_added: {
    label: 'Processando',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  sent_whatsapp: {
    label: 'Enviado via WhatsApp',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  sent: {
    label: 'Enviado',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  signed: {
    label: 'Assinado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  closed: {
    label: 'Finalizado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  manual_uploaded: {
    label: 'Contrato Manual',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
}

interface Props {
  status: string
  className?: string
}

export function ContractStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_sent
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
