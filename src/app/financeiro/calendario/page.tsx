'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { FinancialCalendar } from '@/components/calendar/FinancialCalendar'
import { getSpaces } from '@/app/actions/spaces'

export default function FinancialCalendarPage() {
  const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    async function loadSpaces() {
      const res = await getSpaces()
      if (res.success && res.data) {
        setSpaces(res.data.map((s: any) => ({ id: s.id, name: s.name })))
      }
    }
    loadSpaces()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <CalendarDays className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe vencimentos e parcelas dos eventos
          </p>
        </div>
      </div>

      <FinancialCalendar spaces={spaces} />
    </div>
  )
}
