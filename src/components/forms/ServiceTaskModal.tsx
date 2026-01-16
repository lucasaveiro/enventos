'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { getSpaces } from '@/app/actions/spaces'
import { getServiceTypes, createServiceTask, updateServiceTaskStatus } from '@/app/actions/services'

const taskSchema = z.object({
  spaceId: z.string().min(1, 'Espaço é obrigatório'),
  serviceTypeId: z.string().min(1, 'Tipo de serviço é obrigatório'),
  start: z.string().min(1, 'Data de início é obrigatória'),
  responsible: z.string().optional(),
  status: z.string(),
  notes: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface ServiceTaskModalProps {
  isOpen: boolean
  onClose: () => void
  initialTask?: any
  onSuccess: () => void
}

export function ServiceTaskModal({ isOpen, onClose, initialTask, onSuccess }: ServiceTaskModalProps) {
  const [spaces, setSpaces] = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      status: 'pending',
    }
  })

  useEffect(() => {
    async function loadData() {
      const [spacesRes, typesRes] = await Promise.all([
        getSpaces(),
        getServiceTypes()
      ])
      if (spacesRes.success) setSpaces(spacesRes.data || [])
      if (typesRes.success) setServiceTypes(typesRes.data || [])
    }
    loadData()
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setValue('spaceId', String(initialTask.spaceId))
        setValue('serviceTypeId', String(initialTask.serviceTypeId))
        setValue('start', new Date(initialTask.start).toISOString().slice(0, 16))
        setValue('responsible', initialTask.responsible || '')
        setValue('status', initialTask.status)
        setValue('notes', initialTask.notes || '')
      } else {
        reset()
        setValue('status', 'pending')
      }
    }
  }, [isOpen, initialTask, setValue, reset])

  const onSubmit = async (data: TaskFormValues) => {
    try {
      const payload = {
        spaceId: parseInt(data.spaceId),
        serviceTypeId: parseInt(data.serviceTypeId),
        start: new Date(data.start),
        responsible: data.responsible,
        status: data.status,
        notes: data.notes,
      }

      if (initialTask) {
        await updateServiceTaskStatus(initialTask.id, data.status)
      } else {
        await createServiceTask(payload)
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar tarefa')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="spaceId">Espaço</Label>
            <select
              id="spaceId"
              {...register('spaceId')}
            >
              <option value="">Selecione...</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.spaceId && <span className="text-sm text-red-500">{errors.spaceId.message}</span>}
          </div>

          <div>
            <Label htmlFor="serviceTypeId">Tipo de Serviço</Label>
            <select
              id="serviceTypeId"
              {...register('serviceTypeId')}
            >
              <option value="">Selecione...</option>
              {serviceTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.serviceTypeId && <span className="text-sm text-red-500">{errors.serviceTypeId.message}</span>}
          </div>

          <div>
              <Label htmlFor="start">Data e Hora</Label>
              <Input id="start" type="datetime-local" {...register('start')} />
              {errors.start && <span className="text-sm text-red-500">{errors.start.message}</span>}
          </div>

          <div>
              <Label htmlFor="responsible">Responsável</Label>
              <Input id="responsible" {...register('responsible')} placeholder="Nome do responsável" />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register('status')}
            >
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Execução</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>

          <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea 
                  id="notes"
                  {...register('notes')}
              />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
