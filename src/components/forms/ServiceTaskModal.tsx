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
import { Checkbox } from '@/components/ui/Checkbox'
import { getSpaces } from '@/app/actions/spaces'
import {
  getServiceTypes,
  createServiceTask,
  updateServiceTask,
} from '@/app/actions/services'

const taskSchema = z
  .object({
    spaceId: z.string().min(1, 'Espaço é obrigatório'),
    serviceTypeId: z.string().min(1, 'Tipo de serviço é obrigatório'),
    scheduleDate: z.boolean(),
    start: z.string().optional(),
    end: z.string().optional(),
    responsible: z.string().optional(),
    status: z.string(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scheduleDate && !data.start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['start'],
        message: 'Data de início é obrigatória ao agendar',
      })
    }
    if (data.scheduleDate && data.start && data.end) {
      if (new Date(data.end) <= new Date(data.start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['end'],
          message: 'Data de fim deve ser após o início',
        })
      }
    }
  })

type TaskFormValues = z.infer<typeof taskSchema>

interface ServiceTaskModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
  initialTask?: any
  onSuccess: () => void
}

export function ServiceTaskModal({
  isOpen,
  onClose,
  initialDate,
  initialTask,
  onSuccess,
}: ServiceTaskModalProps) {
  const [spaces, setSpaces] = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      status: 'pending',
      scheduleDate: false,
    },
  })

  const watchScheduleDate = watch('scheduleDate')

  useEffect(() => {
    async function loadData() {
      const [spacesRes, typesRes] = await Promise.all([getSpaces(), getServiceTypes()])
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
        setValue('responsible', initialTask.responsible || '')
        setValue('status', initialTask.status)
        setValue('notes', initialTask.notes || '')

        const hasStart = Boolean(initialTask.start)
        setValue('scheduleDate', hasStart)

        if (hasStart) {
          setValue('start', new Date(initialTask.start).toISOString().slice(0, 16))
          setValue(
            'end',
            initialTask.end ? new Date(initialTask.end).toISOString().slice(0, 16) : ''
          )
        } else {
          setValue('start', '')
          setValue('end', '')
        }
      } else {
        reset()
        setValue('status', 'pending')
        if (initialDate) {
          setValue('scheduleDate', true)
          setValue('start', new Date(initialDate).toISOString().slice(0, 16))
        } else {
          setValue('scheduleDate', false)
        }
      }
    }
  }, [isOpen, initialDate, initialTask, setValue, reset])

  const onSubmit = async (data: TaskFormValues) => {
    try {
      const payload = {
        spaceId: parseInt(data.spaceId),
        serviceTypeId: parseInt(data.serviceTypeId),
        start: data.scheduleDate && data.start ? new Date(data.start) : null,
        end:
          data.scheduleDate && data.end && data.end.trim() !== ''
            ? new Date(data.end)
            : null,
        responsible: data.responsible || null,
        status: data.status,
        notes: data.notes || null,
      }

      if (initialTask) {
        await updateServiceTask(initialTask.id, payload)
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

  const modalTitle = initialTask
    ? initialTask.start == null
      ? 'Agendar Serviço'
      : 'Editar Tarefa'
    : 'Nova Tarefa'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="spaceId">Espaço</Label>
            <select id="spaceId" {...register('spaceId')}>
              <option value="">Selecione...</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.spaceId && (
              <span className="text-sm text-red-500">{errors.spaceId.message}</span>
            )}
          </div>

          <div>
            <Label htmlFor="serviceTypeId">Tipo de Serviço</Label>
            <select id="serviceTypeId" {...register('serviceTypeId')}>
              <option value="">Selecione...</option>
              {serviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.serviceTypeId && (
              <span className="text-sm text-red-500">{errors.serviceTypeId.message}</span>
            )}
          </div>

          {/* Toggle: schedule for a specific date */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3">
            <Checkbox
              id="scheduleDate"
              checked={Boolean(watchScheduleDate)}
              onCheckedChange={(checked) => {
                setValue('scheduleDate', Boolean(checked))
                if (!checked) {
                  setValue('start', '')
                  setValue('end', '')
                }
              }}
            />
            <Label htmlFor="scheduleDate" className="cursor-pointer font-medium">
              Agendar para uma data específica
            </Label>
          </div>

          {/* Date fields — shown only when toggle is on */}
          {watchScheduleDate && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Início</Label>
                <Input id="start" type="datetime-local" {...register('start')} />
                {errors.start && (
                  <span className="text-sm text-red-500">{errors.start.message}</span>
                )}
              </div>
              <div>
                <Label htmlFor="end">
                  Fim <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input id="end" type="datetime-local" {...register('end')} />
                {errors.end && (
                  <span className="text-sm text-red-500">{errors.end.message}</span>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="responsible">Responsável</Label>
            <Input
              id="responsible"
              {...register('responsible')}
              placeholder="Nome do responsável"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" {...register('status')}>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Execução</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" {...register('notes')} />
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
