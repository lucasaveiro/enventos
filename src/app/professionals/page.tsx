'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Briefcase, Phone, Tag } from 'lucide-react'
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
import { getProfessionals, deleteProfessional } from '@/app/actions/professionals'
import { ProfessionalModal } from '@/components/forms/ProfessionalModal'

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState<any | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfessionals = async () => {
    setIsLoading(true)
    const res = await getProfessionals()
    if (res.success && res.data) {
      setProfessionals(res.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchProfessionals()
  }, [])

  const handleCreate = () => {
    setSelectedProfessional(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (professional: any) => {
    setSelectedProfessional(professional)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este profissional?')) {
      await deleteProfessional(id)
      fetchProfessionals()
    }
  }

  // Get unique types for stats
  const uniqueTypes = [...new Set(professionals.map(p => p.type))]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profissionais</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua equipe de trabalho</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Novo Profissional
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{professionals.length}</p>
              <p className="text-sm text-muted-foreground">Total de Profissionais</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Tag className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{uniqueTypes.length}</p>
              <p className="text-sm text-muted-foreground">Tipos de Serviço</p>
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
                {professionals.filter(p => p.phone).length}
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
              <span className="text-sm text-muted-foreground">Carregando profissionais...</span>
            </div>
          </div>
        ) : professionals.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Nenhum profissional cadastrado"
            description="Comece adicionando sua equipe para gerenciar serviços."
            action={
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Adicionar Profissional
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionals.map((professional) => (
                <TableRow key={professional.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent font-semibold text-sm">
                        {professional.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{professional.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{professional.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {professional.phone ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {professional.phone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(professional)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(professional.id)}
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

      <ProfessionalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialProfessional={selectedProfessional}
        onSuccess={fetchProfessionals}
      />
    </div>
  )
}
