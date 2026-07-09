'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button, buttonVariants } from '@/components/ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Quando informado, mostra um atalho para a página do evento (usado fora dela, ex.: lista). */
  eventId?: number
}

/**
 * Exibido quando o usuário tenta excluir um evento que já tem contrato
 * (gerado, anexado manualmente ou enviado para assinatura). A exclusão é
 * bloqueada — também no servidor — para não apagar contratos por engano;
 * o caminho é excluir/cancelar os contratos na página do evento primeiro.
 */
export function DeleteEventBlockedModal({ isOpen, onClose, eventId }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Este evento tem contrato e não pode ser excluído
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm leading-relaxed text-foreground">
          <p>
            Este evento já tem <strong>contrato gerado, anexado ou enviado para assinatura</strong>.
            Excluir o evento apagaria também os contratos e os registros de assinatura — inclusive
            contratos já assinados.
          </p>

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <p className="font-semibold">Precisa mesmo excluir este evento?</p>
            <p className="mt-1">
              Primeiro <strong>exclua ou cancele os contratos</strong> na seção{' '}
              <strong>Contrato</strong> da página do evento. Depois disso, a exclusão do evento é
              liberada.
            </p>
          </div>
        </div>

        <DialogFooter>
          {eventId !== undefined && (
            <Link
              href={`/events/${eventId}`}
              className={buttonVariants({ variant: 'outline' })}
              onClick={onClose}
            >
              Ver contratos do evento
            </Link>
          )}
          <Button type="button" onClick={onClose}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
