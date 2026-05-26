'use client'

import * as React from 'react'
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  getDaysInMonth,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { Button } from '@/components/ui/Button'
import { cn, parseLocalDate, toDateInputValue } from '@/lib/utils'
import { getSpaceOccupationByMonth } from '@/app/actions/events'

type Mode = 'event' | 'interest'

interface OccupationCache {
  // key: spaceId-year-month → fetched result
  [key: string]: {
    eventClientIds: Map<string, number | null>
    interestClientIds: Map<string, Set<number>>
  }
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface DatePickerProps {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  spaceId?: number | null
  ownerClientId?: number | null
  mode?: Mode
  disabled?: boolean
  placeholder?: string
  className?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  spaceId,
  ownerClientId,
  mode = 'event',
  disabled,
  placeholder = 'Selecione uma data',
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const initialDate = value ? parseLocalDate(value) : new Date()
  const [viewMonth, setViewMonth] = React.useState(startOfMonth(initialDate))
  const [cache, setCache] = React.useState<OccupationCache>({})
  const [isLoading, setIsLoading] = React.useState(false)

  // Sync view month when external value changes meaningfully
  React.useEffect(() => {
    if (value) {
      const d = parseLocalDate(value)
      if (
        d.getMonth() !== viewMonth.getMonth() ||
        d.getFullYear() !== viewMonth.getFullYear()
      ) {
        setViewMonth(startOfMonth(d))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  React.useEffect(() => {
    if (!spaceId) return
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const key = `${spaceId}-${year}-${month}`
    if (cache[key]) return

    let cancelled = false
    setIsLoading(true)
    getSpaceOccupationByMonth(spaceId, year, month)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          const eventMap = new Map<string, number | null>()
          for (const e of res.data.events) {
            const d = new Date(e.date)
            eventMap.set(dateKey(d), e.clientId)
          }
          const interestMap = new Map<string, Set<number>>()
          for (const i of res.data.interests) {
            const d = new Date(i.date)
            const k = dateKey(d)
            const set = interestMap.get(k) ?? new Set<number>()
            set.add(i.clientId)
            interestMap.set(k, set)
          }
          setCache((prev) => ({
            ...prev,
            [key]: { eventClientIds: eventMap, interestClientIds: interestMap },
          }))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [spaceId, viewMonth, cache])

  const occupation = spaceId
    ? cache[`${spaceId}-${viewMonth.getFullYear()}-${viewMonth.getMonth()}`]
    : undefined

  const selectedDate = value ? parseLocalDate(value) : null
  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: ptBR })

  const daysInMonth = getDaysInMonth(viewMonth)
  const firstDayOffset = getDay(startOfMonth(viewMonth))
  const totalCells = firstDayOffset + daysInMonth
  const trailingCells = (7 - (totalCells % 7)) % 7

  const handleSelect = (day: number, isBlocked: boolean) => {
    if (isBlocked) return
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    onChange(toDateInputValue(d))
    setOpen(false)
  }

  const displayLabel = selectedDate
    ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })
    : placeholder

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-input-bg px-3 py-2 text-sm transition-colors',
            'hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-ring',
            disabled && 'cursor-not-allowed opacity-50',
            !selectedDate && 'text-muted-foreground',
            className,
          )}
        >
          <span>{displayLabel}</span>
          <CalendarDays className="ml-2 h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px]">
        <div className="flex items-center justify-between pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize text-foreground">
            {monthLabel}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            aria-label="Proximo mes"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
          {WEEKDAYS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`leading-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
            const k = dateKey(d)

            const eventClientId = occupation?.eventClientIds.get(k)
            const hasEvent = occupation?.eventClientIds.has(k) ?? false
            const interestClientIds = occupation?.interestClientIds.get(k)
            const otherInterest = interestClientIds
              ? Array.from(interestClientIds).some(
                  (id) => !ownerClientId || id !== ownerClientId,
                )
              : false

            // Block when there's an event AND it's not the owner's own event
            const isOwnerEvent =
              ownerClientId != null && eventClientId === ownerClientId
            const isBlocked =
              mode === 'event' && hasEvent && !isOwnerEvent

            const isSelected = selectedDate && isSameDay(selectedDate, d)
            const todayMark = isToday(d)

            return (
              <button
                key={day}
                type="button"
                disabled={isBlocked}
                onClick={() => handleSelect(day, isBlocked)}
                className={cn(
                  'relative h-8 w-8 rounded-md text-xs transition-colors',
                  'hover:bg-secondary',
                  isBlocked && 'cursor-not-allowed opacity-90 hover:bg-transparent',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                  !isSelected && hasEvent && 'text-red-600 font-semibold',
                  !isSelected && !hasEvent && otherInterest && 'text-amber-600 font-semibold',
                  todayMark && !isSelected && 'ring-1 ring-primary/40',
                )}
                title={
                  hasEvent
                    ? 'Espaco ja reservado nesta data'
                    : otherInterest
                      ? 'Outro cliente cadastrou interesse nesta data'
                      : undefined
                }
              >
                {day}
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-500" />
                )}
                {otherInterest && !hasEvent && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-500" />
                )}
              </button>
            )
          })}
          {Array.from({ length: trailingCells }).map((_, i) => (
            <div key={`trailing-${i}`} />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Reservado
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Interesse
            </span>
          </div>
          {isLoading && <span>Carregando...</span>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export interface DateTimePickerProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
  value?: string // YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
}

/**
 * Combines DatePicker (date) + native time input — produces YYYY-MM-DDTHH:mm
 * for compatibility with the existing react-hook-form `datetime-local` schema.
 */
export function DateTimePicker({ value, onChange, ...rest }: DateTimePickerProps) {
  const [datePart, timePart] = React.useMemo(() => {
    if (!value) return ['', '00:00']
    const [d, t] = value.split('T')
    return [d ?? '', t?.slice(0, 5) ?? '00:00']
  }, [value])

  const emit = (date: string, time: string) => {
    if (!date) {
      onChange('')
      return
    }
    onChange(`${date}T${time || '00:00'}`)
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <DatePicker
          value={datePart}
          onChange={(d) => emit(d, timePart)}
          {...rest}
        />
      </div>
      <input
        type="time"
        value={timePart}
        onChange={(e) => emit(datePart, e.target.value)}
        disabled={rest.disabled}
        className="h-10 w-24 rounded-md border border-input bg-input-bg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}
