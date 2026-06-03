'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'

// Tempo (em segundos) que o botão de confirmar fica bloqueado, forçando o usuário a ler o aviso.
const COUNTDOWN_SECONDS = 5

interface Props {
  isOpen: boolean
  /** O que será editado — usado apenas para personalizar o texto do aviso. */
  target?: 'cliente' | 'evento'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Aviso exibido ANTES de editar dados de um evento que já possui um contrato ativo no
 * Clicksign. Alterar nome/telefone/CPF/datas/valores NÃO atualiza o contrato já enviado
 * (nem o link de assinatura no WhatsApp) — é preciso cancelar e gerar um novo. O botão de
 * confirmar fica bloqueado por COUNTDOWN_SECONDS para garantir que o usuário leia o aviso.
 */
export function ContractEditWarningModal({ isOpen, target, onConfirm, onCancel }: Props) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

  useEffect(() => {
    if (!isOpen) return
    setCountdown(COUNTDOWN_SECONDS)
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen])

  const locked = countdown > 0
  const alvo =
    target === 'cliente' ? 'do cliente' : target === 'evento' ? 'do evento' : 'do evento ou do cliente'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Atenção: este evento já tem um contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm leading-relaxed text-foreground">
          <p>
            Você está prestes a editar dados {alvo}, mas este evento{' '}
            <strong>já tem um contrato gerado e enviado</strong>.
          </p>

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <p className="font-semibold">O contrato que já foi enviado não muda sozinho.</p>
            <p className="mt-1">
              Se você alterar qualquer informação (nome, telefone, CPF, datas, valores...), o contrato
              atual continuará com os <strong>dados antigos</strong>. O link de assinatura enviado no
              WhatsApp também continuará com os dados antigos.
            </p>
          </div>

          <p>
            Para as mudanças valerem no contrato, será preciso{' '}
            <strong>cancelar o contrato atual e gerar um novo</strong>. Por exemplo: se o telefone estiver
            errado, apenas reenviar o link <strong>não resolve</strong> — o link só chega no número certo
            depois de cancelar e gerar o contrato novamente.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Voltar (não editar)
          </Button>
          <Button type="button" onClick={onConfirm} disabled={locked} className="min-w-[210px]">
            {locked ? `Aguarde ${countdown}s para confirmar` : 'Entendi, quero editar mesmo assim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
