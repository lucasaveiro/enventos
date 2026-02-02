'use client'

import { useState, useEffect } from 'react'
import { getServiceTasks } from '@/app/actions/services'
import { ServiceTaskModal } from '@/components/forms/ServiceTaskModal'
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
import { Plus, CheckSquare, Calendar, Home, User, Clock, CheckCircle, Loader2, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ServicesPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = async () => {
    setIsLoading(true)
    const res = await getServiceTasks()
    if (res.success && res.data) {
      setTasks(res.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleEdit = (task: any) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedTask(undefined)
    setIsModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Concluída</Badge>
      case 'in_progress':
        return <Badge variant="info">Em Execução</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="warning">Pendente</Badge>
    }
  }

  // Stats
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <CheckSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
            <p className="text-sm text-muted-foreground">Gerencie tarefas operacionais</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
              <p className="text-sm text-muted-foreground">Total de Tarefas</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingTasks}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <Loader2 className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{inProgressTasks}</p>
              <p className="text-sm text-muted-foreground">Em Execução</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedTasks}</p>
              <p className="text-sm text-muted-foreground">Concluídas</p>
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
              <span className="text-sm text-muted-foreground">Carregando tarefas...</span>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Nenhuma tarefa encontrada"
            description="Comece criando uma nova tarefa de serviço."
            action={
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Criar Tarefa
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Espaço</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium text-foreground">
                        {format(new Date(task.start), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="text-xs">
                        {format(new Date(task.start), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{task.serviceType.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Home className="h-4 w-4" />
                      {task.space.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.responsible ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        {task.responsible}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(task)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ServiceTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTask={selectedTask}
        onSuccess={fetchTasks}
      />
    </div>
  )
}
