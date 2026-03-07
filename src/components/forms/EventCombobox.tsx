'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Calendar, MapPin, User, ChevronDown, Check, X } from 'lucide-react'

export type EventOption = {
  id: number
  title: string
  start: string | Date
  client?: { name: string } | null
  space: { name: string }
}

interface EventComboboxProps {
  events: EventOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: boolean
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function EventCombobox({
  events,
  value,
  onChange,
  placeholder = 'Selecione um evento',
  error,
}: EventComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = events.find((e) => String(e.id) === value)

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.client?.name.toLowerCase().includes(q) ||
        e.space.name.toLowerCase().includes(q) ||
        formatDate(e.start).toLowerCase().includes(q),
    )
  }, [events, search])

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setSearch('')
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: number) => {
    onChange(String(id))
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-auto min-h-10 w-full items-center justify-between rounded-lg border-2 bg-background px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          error
            ? 'border-destructive'
            : open
              ? 'border-primary'
              : 'border-border hover:border-border-hover'
        }`}
      >
        {selected ? (
          <div className="flex flex-1 flex-col items-start gap-0.5 min-w-0 text-left">
            <span className="font-semibold text-foreground leading-tight">{selected.title}</span>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {selected.client && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  {selected.client.name}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {selected.space.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                {formatDate(selected.start)}
              </span>
            </div>
          </div>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              className="rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por evento, cliente ou espaço..."
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              />
            </div>
            {events.length > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground px-1">
                {filtered.length === events.length
                  ? `${events.length} evento${events.length !== 1 ? 's' : ''}`
                  : `${filtered.length} de ${events.length} eventos`}
              </p>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nenhum evento encontrado
              </div>
            ) : (
              filtered.map((event) => {
                const isSelected = String(event.id) === value
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => handleSelect(event.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors flex items-start gap-2 border-l-2 ${
                      isSelected
                        ? 'border-l-success bg-success/5'
                        : 'border-l-transparent hover:bg-muted'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm leading-tight truncate">
                          {event.title}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-success shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {event.client && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            {event.client.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {event.space.name}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDate(event.start)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
