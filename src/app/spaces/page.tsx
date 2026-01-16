'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Home, MapPin, CheckCircle, XCircle } from 'lucide-react'
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
import { getSpaces, deleteSpace } from '@/app/actions/spaces'
import { SpaceModal } from '@/components/forms/SpaceModal'

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState<any | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSpaces = async () => {
    setIsLoading(true)
    const res = await getSpaces()
    if (res.success && res.data) {
      setSpaces(res.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchSpaces()
  }, [])

  const handleCreate = () => {
    setSelectedSpace(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (space: any) => {
    setSelectedSpace(space)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este espaço?')) {
      await deleteSpace(id)
      fetchSpaces()
    }
  }

  const activeSpaces = spaces.filter(s => s.active).length
  const inactiveSpaces = spaces.filter(s => !s.active).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Espaços</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus espaços para reserva</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Novo Espaço
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{spaces.length}</p>
              <p className="text-sm text-muted-foreground">Total de Espaços</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeSpaces}</p>
              <p className="text-sm text-muted-foreground">Espaços Ativos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{inactiveSpaces}</p>
              <p className="text-sm text-muted-foreground">Espaços Inativos</p>
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
              <span className="text-sm text-muted-foreground">Carregando espaços...</span>
            </div>
          </div>
        ) : spaces.length === 0 ? (
          <EmptyState
            icon={Home}
            title="Nenhum espaço cadastrado"
            description="Comece adicionando seu primeiro espaço para gerenciar reservas."
            action={
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Adicionar Espaço
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spaces.map((space) => (
                <TableRow key={space.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Home className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{space.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {space.address ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {space.address}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={space.active ? 'success' : 'destructive'}>
                      {space.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(space)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(space.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <SpaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialSpace={selectedSpace}
        onSuccess={fetchSpaces}
      />
    </div>
  )
}
