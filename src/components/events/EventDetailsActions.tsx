'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { EventModal } from '@/components/forms/EventModal'
import { ContractEditWarningModal } from '@/components/contracts/ContractEditWarningModal'
import { Button } from '@/components/ui/Button'
import { deleteEvent } from '@/app/actions/events'

type EventDetailsActionsProps = {
  event: any
  hasActiveContract?: boolean
}

export function EventDetailsActions({ event, hasActiveContract }: EventDetailsActionsProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isWarningOpen, setIsWarningOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Com contrato ativo, editar o evento exige confirmar o aviso primeiro.
  const requestEdit = () => {
    if (hasActiveContract) setIsWarningOpen(true)
    else setIsModalOpen(true)
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta marcação e todos os registros vinculados?')) return
    setIsDeleting(true)
    try {
      const res = await deleteEvent(event.id)
      if (!res.success) {
        alert(res.error || 'Erro ao excluir marcação')
        return
      }
      router.push('/')
    } catch {
      alert('Erro ao excluir marcação')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button onClick={requestEdit} variant="outline">
        <Pencil className="h-4 w-4" />
        Editar evento
      </Button>
      <Button
        onClick={handleDelete}
        variant="destructive"
        disabled={isDeleting}
        className="gap-1"
      >
        <Trash2 className="h-4 w-4" />
        {isDeleting ? 'Excluindo...' : 'Excluir'}
      </Button>
      <ContractEditWarningModal
        isOpen={isWarningOpen}
        target="evento"
        onCancel={() => setIsWarningOpen(false)}
        onConfirm={() => {
          setIsWarningOpen(false)
          setIsModalOpen(true)
        }}
      />
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialEvent={event}
        onSuccess={() => router.refresh()}
        onDelete={() => router.push('/')}
      />
    </>
  )
}
