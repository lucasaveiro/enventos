import { DashboardCalendar } from '@/components/calendar/DashboardCalendar'
import { CalendarDays } from 'lucide-react'

export default function Home() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendário de Reservas</h1>
            <p className="text-sm text-muted-foreground">Visualize e gerencie todas as suas reservas</p>
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <DashboardCalendar />
    </div>
  )
}
