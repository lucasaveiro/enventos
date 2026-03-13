'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users, Phone, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { getClients, deleteClient } from '@/app/actions/clients'
import { ClientModal } from '@/components/forms/ClientModal'
import { InterestDatesModal } from '@/components/forms/InterestDatesModal'

const EVENT_TYPE_LABELS: Record<string, string> = {
  casamento: 'Casamento',
  aniversario: 'Aniversario',
  confraternizacao: 'Confraternizacao',
  outros: 'Outros',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  casamento: 'bg-pink-100 text-pink-700',
  aniversario: 'bg-blue-100 text-blue-700',
  confraternizacao: 'bg-amber-100 text-amber-700',
  outros: 'bg-gray-100 text-gray-700',
}

function formatDateShort(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [interestDatesClient, setInterestDatesClient] = useState<any | null>(null)

  const fetchClients = async () => {
    setIsLoading(true)
    const res = await getClients()
    if (res.success && res.data) {
      setClients(res.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleCreate = () => {
    setSelectedClient(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (client: any) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      await deleteClient(id)
      fetchClients()
    }
  }

  const clientsWithInterest = clients.filter(c => c.interestDates && c.interestDates.length > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua base de clientes</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <CalendarDays className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {clientsWithInterest.length}
              </p>
              <p className="text-sm text-muted-foreground">Com Datas de Interesse</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <Phone className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {clients.filter(c => c.phone).length}
              </p>
              <p className="text-sm text-muted-foreground">Com Telefone</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Carregando clientes...</span>
            </div>
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum cliente cadastrado"
            description="Comece adicionando seu primeiro cliente para gerenciar suas reservas."
            action={
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Adicionar Cliente
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Datas de Interesse</TableHead>
                <TableHead>Tipo de Evento</TableHead>
                <TableHead>Qtd. Pessoas</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const interestDates = client.interestDates || []
                const nextDates = interestDates.slice(0, 3)
                const eventTypes = [...new Set(interestDates.map((d: any) => d.eventType).filter(Boolean))] as string[]
                const maxPeople = interestDates.reduce((max: number, d: any) => {
                  return d.numberOfPeople && d.numberOfPeople > max ? d.numberOfPeople : max
                }, 0)

                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.phone ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {client.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {nextDates.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {nextDates.map((d: any) => (
                            <Badge
                              key={d.id}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-purple-50"
                              onClick={() => setInterestDatesClient(client)}
                            >
                              {formatDateShort(d.date)}
                            </Badge>
                          ))}
                          {interestDates.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-purple-50"
                              onClick={() => setInterestDatesClient(client)}
                            >
                              +{interestDates.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {eventTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {eventTypes.map((type: string) => (
                            <Badge
                              key={type}
                              className={`text-xs ${EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.outros}`}
                            >
                              {EVENT_TYPE_LABELS[type] || type}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {maxPeople > 0 ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {maxPeople}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setInterestDatesClient(client)}
                          className="h-8 w-8"
                          title="Datas de Interesse"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(client)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(client.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialClient={selectedClient}
        onSuccess={fetchClients}
      />

      <InterestDatesModal
        client={interestDatesClient}
        isOpen={!!interestDatesClient}
        onClose={() => {
          setInterestDatesClient(null)
          fetchClients()
        }}
      />
    </div>
  )
}
