'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { createClient, updateClient } from '@/app/actions/clients'
import { User, Phone, Mail, AlertTriangle } from 'lucide-react'
import { isValidCPFOrCNPJ } from '@/lib/contractTemplates'
import { checkBrazilianPhone, countPhoneDigits } from '@/lib/phone'

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

// Confirmação pendente quando o telefone foge do padrão brasileiro de 11 dígitos.
// Guardamos os dados já validados do formulário para salvar caso o usuário confirme.
type PhoneConfirm = {
  type: 'too_long' | 'too_short'
  data: ClientFormValues
  phone: string
  digits: number
}

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

  const [confirm, setConfirm] = useState<PhoneConfirm | null>(null)
  const [saving, setSaving] = useState(false)

  const closeAll = () => {
    setConfirm(null)
    onClose()
  }

  // Salva de fato (criação ou edição). Chamado direto quando o telefone está no
  // padrão, ou pelos botões de confirmação quando está fora do padrão.
  const doSave = async (data: ClientFormValues) => {
    setSaving(true)
    try {
      const result = initialClient
        ? await updateClient(initialClient.id, data)
        : await createClient(data)
      if (result && result.success === false) {
        alert(result.error || 'Erro ao salvar cliente')
        return
      }
      onSuccess()
      reset()
      closeAll()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = async (data: ClientFormValues) => {
    // Telefone vazio ou com os 11 dígitos do padrão brasileiro: salva direto.
    // Fora do padrão: pede confirmação antes (evita número que não recebe WhatsApp).
    const status = checkBrazilianPhone(data.phone)
    if (status === 'too_long' || status === 'too_short') {
      setConfirm({
        type: status,
        data,
        phone: (data.phone || '').trim(),
        digits: countPhoneDigits(data.phone),
      })
      return
    }
    await doSave(data)
  }

  const isLong = confirm?.type === 'too_long'

  return (
    <Dialog open={isOpen} onOpenChange={closeAll}>
      <DialogContent className="sm:max-w-[480px]">
        {confirm ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirme o número de telefone
              </DialogTitle>
              <DialogDescription>
                {isLong
                  ? 'O número informado tem mais dígitos que o padrão brasileiro (XX) XXXXX-XXXX.'
                  : 'O número informado tem um ou mais dígitos a menos que o padrão brasileiro (XX) XXXXX-XXXX.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="text-xs text-muted-foreground">Número digitado</div>
                <div className="text-lg font-semibold tracking-wide text-foreground">
                  {confirm.phone || '—'}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {confirm.digits} dígito{confirm.digits === 1 ? '' : 's'} — o padrão brasileiro tem 11
                </div>
              </div>

              {isLong ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Confirme se este número é <strong>brasileiro</strong> ou <strong>internacional</strong>.
                  Se for internacional, podemos salvar fora do formato brasileiro. Se for brasileiro,
                  volte e corrija para o formato (XX) XXXXX-XXXX.
                </p>
              ) : (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm leading-relaxed text-amber-800">
                    Precisamos confirmar se este número que você digitou está mesmo fora do padrão, ou se
                    foi um erro de digitação. Favor confirmar, pois se o número estiver incorreto, o
                    contrato não chegará por WhatsApp para o cliente.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirm(null)} disabled={saving}>
                {isLong ? 'É brasileiro, vou corrigir' : 'Digitei errado'}
              </Button>
              <Button type="button" onClick={() => doSave(confirm.data)} loading={saving}>
                {isLong ? 'É internacional, salvar' : 'Ok, estou ciente'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
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
                <Button type="button" variant="outline" onClick={closeAll}>
                  Cancelar
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  {initialClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
