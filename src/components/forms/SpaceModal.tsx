'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { createSpace, updateSpace } from '@/app/actions/spaces'
import { Home, MapPin } from 'lucide-react'

const spaceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  address: z.string().optional(),
  active: z.boolean(),
})

type SpaceFormValues = z.infer<typeof spaceSchema>

interface SpaceModalProps {
  isOpen: boolean
  onClose: () => void
  initialSpace?: any
  onSuccess: () => void
}

export function SpaceModal({ isOpen, onClose, initialSpace, onSuccess }: SpaceModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      name: '',
      address: '',
      active: true,
    },
    values: initialSpace ? {
      name: initialSpace.name,
      address: initialSpace.address || '',
      active: initialSpace.active,
    } : undefined
  })

  const onSubmit = async (data: SpaceFormValues) => {
    try {
      if (initialSpace) {
        await updateSpace(initialSpace.id, data)
      } else {
        await createSpace(data)
      }
      onSuccess()
      onClose()
      reset()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar espaço')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialSpace ? 'Editar Espaço' : 'Novo Espaço'}</DialogTitle>
          <DialogDescription>
            {initialSpace ? 'Atualize as informações do espaço.' : 'Preencha os dados para cadastrar um novo espaço.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Espaço *</Label>
            <Input
              id="name"
              placeholder="Ex: Casa da Praia, Salão de Festas..."
              icon={<Home className="h-4 w-4" />}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              placeholder="Endereço completo do espaço"
              icon={<MapPin className="h-4 w-4" />}
              {...register('address')}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div className="flex-1">
              <Label htmlFor="active" className="cursor-pointer">Espaço Ativo</Label>
              <p className="text-xs text-muted-foreground">Espaços inativos não aparecem para novas reservas</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {initialSpace ? 'Salvar Alterações' : 'Cadastrar Espaço'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
