'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { EventModal } from '@/components/forms/EventModal'
import { Button } from '@/components/ui/Button'

type EventDetailsActionsProps = {
  event: any
}

export function EventDetailsActions({ event }: EventDetailsActionsProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} variant="outline">
        <Pencil className="h-4 w-4" />
        Editar evento
      </Button>
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialEvent={event}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
