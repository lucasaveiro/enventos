'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Plus, User, ChevronDown, Loader2 } from 'lucide-react'
import { getProfessionals } from '@/app/actions/professionals'
import { updateEvent } from '@/app/actions/events'
import { Button } from '@/components/ui/Button'

interface AddProfessionalPopoverProps {
  eventId: number
  currentProfessionalIds: number[]
  onSuccess: () => void
}

export function AddProfessionalPopover({
  eventId,
  currentProfessionalIds,
  onSuccess,
}: AddProfessionalPopoverProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [professionals, setProfessionals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setSearch('')
      return
    }

    setIsLoading(true)
    getProfessionals().then((res) => {
      if (res.success && res.data) {
        setProfessionals(res.data)
      }
      setIsLoading(false)
    })

    setTimeout(() => searchRef.current?.focus(), 50)
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

  const available = useMemo(() => {
    const currentSet = new Set(currentProfessionalIds)
    let filtered = professionals.filter((p) => !currentSet.has(p.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)),
      )
    }
    return filtered
  }, [professionals, currentProfessionalIds, search])

  const handleSelect = async (professionalId: number) => {
    setIsSaving(true)
    try {
      const newIds = [...currentProfessionalIds, professionalId]
      const res = await updateEvent(eventId, { professionalIds: newIds })
      if (res.success) {
        onSuccess()
        setOpen(false)
      }
    } catch (error) {
      console.error('Error adding professional:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        size="sm"
        className="gap-1"
        onClick={() => setOpen((v) => !v)}
        disabled={isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Adicionar Profissional
      </Button>

      {open && (
        <div className="absolute right-0 z-[9999] mt-1 w-80 rounded-lg border border-border bg-card shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar profissional..."
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              />
            </div>
            {!isLoading && (
              <p className="mt-1.5 text-xs text-muted-foreground px-1">
                {available.length} profissiona{available.length !== 1 ? 'is' : 'l'} disponíve{available.length !== 1 ? 'is' : 'l'}
              </p>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : available.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {professionals.length === currentProfessionalIds.length && professionals.length > 0
                  ? 'Todos os profissionais ja estao vinculados'
                  : 'Nenhum profissional encontrado'}
              </div>
            ) : (
              available.map((professional) => (
                <button
                  key={professional.id}
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSelect(professional.id)}
                  className="w-full text-left px-3 py-2.5 transition-colors flex items-start gap-2 border-l-2 border-l-transparent hover:bg-muted hover:border-l-primary disabled:opacity-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {professional.name}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{professional.type}</span>
                      {professional.phone && <span>{professional.phone}</span>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
