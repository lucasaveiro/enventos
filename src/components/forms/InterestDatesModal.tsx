'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { CalendarDays, Plus, Trash2, Users } from 'lucide-react'
import { getInterestDatesByClient, createInterestDate, updateInterestDate, deleteInterestDate } from '@/app/actions/interestDates'
import { getSpaces } from '@/app/actions/spaces'

interface InterestDatesModalProps {
  client: { id: number; name: string } | null
  isOpen: boolean
  onClose: () => void
}

const STATUS_LABELS: Record<string, string> = {
  interest: 'Interesse',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  interest: 'bg-purple-100 text-purple-700 border-purple-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  casamento: 'Casamento',
  aniversario: 'Aniversario',
  confraternizacao: 'Confraternizacao',
  outros: 'Outros',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  casamento: 'bg-pink-100 text-pink-700 border-pink-200',
  aniversario: 'bg-blue-100 text-blue-700 border-blue-200',
  confraternizacao: 'bg-amber-100 text-amber-700 border-amber-200',
  outros: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function InterestDatesModal({ client, isOpen, onClose }: InterestDatesModalProps) {
  const [interestDates, setInterestDates] = useState<any[]>([])
  const [spaces, setSpaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newSpaceId, setNewSpaceId] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newNumberOfPeople, setNewNumberOfPeople] = useState('')
  const [newEventType, setNewEventType] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fetchData = useCallback(async () => {
    if (!client) return
    setIsLoading(true)
    const [datesRes, spacesRes] = await Promise.all([
      getInterestDatesByClient(client.id),
      getSpaces(),
    ])
    if (datesRes.success) setInterestDates(datesRes.data || [])
    if (spacesRes.success) setSpaces(spacesRes.data || [])
    setIsLoading(false)
  }, [client])

  useEffect(() => {
    if (isOpen && client) {
      fetchData()
      setNewDate('')
      setNewSpaceId('')
      setNewNotes('')
      setNewNumberOfPeople('')
      setNewEventType('')
    }
  }, [isOpen, client, fetchData])

  const handleAdd = async () => {
    if (!client || !newDate || !newSpaceId) return
    setIsAdding(true)
    await createInterestDate({
      clientId: client.id,
      spaceId: parseInt(newSpaceId, 10),
      date: new Date(newDate),
      notes: newNotes || undefined,
      numberOfPeople: newNumberOfPeople ? parseInt(newNumberOfPeople, 10) : undefined,
      eventType: newEventType || undefined,
    })
    setNewDate('')
    setNewSpaceId('')
    setNewNotes('')
    setNewNumberOfPeople('')
    setNewEventType('')
    setIsAdding(false)
    fetchData()
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    await updateInterestDate(id, { status: newStatus })
    fetchData()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta data de interesse?')) {
      await deleteInterestDate(id)
      fetchData()
    }
  }

  const formatDate = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Datas de Interesse
          </DialogTitle>
          <DialogDescription>
            Gerencie as datas de interesse de {client?.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing interest dates */}
            {interestDates.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma data de interesse cadastrada para este cliente.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {interestDates.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border px-3 py-2 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-medium text-sm text-foreground whitespace-nowrap">
                          {formatDate(item.date)}
                        </span>
                        <span className="text-sm text-muted-foreground truncate">
                          {item.space.name}
                        </span>
                        {item.eventType && (
                          <Badge className={`text-xs ${EVENT_TYPE_COLORS[item.eventType] || EVENT_TYPE_COLORS.outros}`}>
                            {EVENT_TYPE_LABELS[item.eventType] || item.eventType}
                          </Badge>
                        )}
                        {item.numberOfPeople && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <Users className="h-3 w-3" />
                            {item.numberOfPeople}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className="text-xs h-7 rounded-md border border-border bg-background px-2"
                        >
                          <option value="interest">Interesse</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                        <Badge
                          className={`text-xs ${STATUS_COLORS[item.status] || STATUS_COLORS.interest}`}
                        >
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new interest date */}
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-medium">Adicionar Nova Data de Interesse</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="interestDate" className="text-xs text-muted-foreground">Data</Label>
                  <Input
                    id="interestDate"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="interestSpace" className="text-xs text-muted-foreground">Espaco</Label>
                  <select
                    id="interestSpace"
                    value={newSpaceId}
                    onChange={(e) => setNewSpaceId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>{space.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="interestEventType" className="text-xs text-muted-foreground">Tipo de Evento</Label>
                  <select
                    id="interestEventType"
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Selecione...</option>
                    <option value="casamento">Casamento</option>
                    <option value="aniversario">Aniversario</option>
                    <option value="confraternizacao">Confraternizacao</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="interestPeople" className="text-xs text-muted-foreground">Qtd. Pessoas</Label>
                  <Input
                    id="interestPeople"
                    type="number"
                    min="1"
                    value={newNumberOfPeople}
                    onChange={(e) => setNewNumberOfPeople(e.target.value)}
                    placeholder="Ex: 100"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="interestNotes" className="text-xs text-muted-foreground">Notas (opcional)</Label>
                  <Input
                    id="interestNotes"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Observacoes sobre o interesse"
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={!newDate || !newSpaceId || isAdding}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  {isAdding ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
