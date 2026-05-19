'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { createClient, updateClient } from '@/app/actions/clients'
import { User, Phone, Mail } from 'lucide-react'
import { isValidCPFOrCNPJ } from '@/lib/contractTemplates'

const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cpf: z
    .string()
    .optional()
    .refine(
      (v) => !v || isValidCPFOrCNPJ(v),
      'CPF/CNPJ inválido — verifique os dígitos'
    ),
  rg: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
})

type ClientFormValues = z.infer<typeof clientSchema>

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  initialClient?: any
  onSuccess: () => void
}

export function ClientModal({ isOpen, onClose, initialClient, onSuccess }: ClientModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      cpf: '',
      rg: '',
      address: '',
      city: '',
      state: '',
      notes: '',
    },
    values: initialClient ? {
      name: initialClient.name,
      phone: initialClient.phone || '',
      email: initialClient.email || '',
      cpf: initialClient.cpf || '',
      rg: initialClient.rg || '',
      address: initialClient.address || '',
      city: initialClient.city || '',
      state: initialClient.state || '',
      notes: initialClient.notes || '',
    } : undefined
  })

  const onSubmit = async (data: ClientFormValues) => {
    try {
      if (initialClient) {
        await updateClient(initialClient.id, data)
      } else {
        await createClient(data)
      }
      onSuccess()
      onClose()
      reset()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar cliente')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initialClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {initialClient ? 'Atualize as informações do cliente.' : 'Preencha os dados para cadastrar um novo cliente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome completo do cliente"
              icon={<User className="h-4 w-4" />}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                icon={<Mail className="h-4 w-4" />}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF / CNPJ</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                {...register('cpf')}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                placeholder="00.000.000-0"
                {...register('rg')}
              />
              {errors.rg && (
                <p className="text-sm text-destructive">{errors.rg.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              placeholder="Rua, número, bairro"
              {...register('address')}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                placeholder="São Paulo"
                {...register('city')}
              />
            </div>
            <div className="space-y-2 w-20">
              <Label htmlFor="state">UF</Label>
              <Input
                id="state"
                placeholder="SP"
                maxLength={2}
                className="uppercase"
                {...register('state')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre o cliente..."
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
              {initialClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
