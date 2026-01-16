'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { createProfessional, updateProfessional } from '@/app/actions/professionals'
import { User, Briefcase, Phone } from 'lucide-react'

const professionalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.string().min(1, 'Tipo de serviço é obrigatório'),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

type ProfessionalFormValues = z.infer<typeof professionalSchema>

interface ProfessionalModalProps {
  isOpen: boolean
  onClose: () => void
  initialProfessional?: any
  onSuccess: () => void
}

export function ProfessionalModal({ isOpen, onClose, initialProfessional, onSuccess }: ProfessionalModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: '',
      type: '',
      phone: '',
      notes: '',
    },
    values: initialProfessional ? {
      name: initialProfessional.name,
      type: initialProfessional.type,
      phone: initialProfessional.phone || '',
      notes: initialProfessional.notes || '',
    } : undefined
  })

  const onSubmit = async (data: ProfessionalFormValues) => {
    try {
      if (initialProfessional) {
        await updateProfessional(initialProfessional.id, data)
      } else {
        await createProfessional(data)
      }
      onSuccess()
      onClose()
      reset()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar profissional')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialProfessional ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
          <DialogDescription>
            {initialProfessional ? 'Atualize as informações do profissional.' : 'Cadastre um novo profissional na equipe.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome completo do profissional"
              icon={<User className="h-4 w-4" />}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Serviço *</Label>
              <Input
                id="type"
                placeholder="Ex: DJ, Buffet..."
                icon={<Briefcase className="h-4 w-4" />}
                {...register('type')}
              />
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                icon={<Phone className="h-4 w-4" />}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre o profissional..."
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {initialProfessional ? 'Salvar Alterações' : 'Cadastrar Profissional'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
