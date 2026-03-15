'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Upload, FileText, X } from 'lucide-react'

interface UploadContractModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: number
  onSuccess: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadContractModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}: UploadContractModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setSelectedFile(null)
    setNotes('')
    setError(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
      onClose()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setError(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.type !== 'application/pdf') {
      setError('Apenas arquivos PDF sao permitidos')
      setSelectedFile(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no maximo 5MB')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('eventId', String(eventId))
      if (notes.trim()) {
        formData.append('notes', notes.trim())
      }

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (result.success) {
        resetForm()
        onSuccess()
        onClose()
      } else {
        setError(result.error || 'Erro ao enviar contrato')
      }
    } catch {
      setError('Erro inesperado ao enviar contrato')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Contrato</DialogTitle>
          <DialogDescription>
            Envie um contrato em PDF para vincular a este evento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File input area */}
          {!selectedFile ? (
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-secondary/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Clique para selecionar o PDF
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Maximo 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3">
              <FileText className="h-8 w-8 flex-shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="flex-shrink-0 rounded-full p-1 hover:bg-secondary"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Observacoes (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Contrato assinado em cartorio..."
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedFile || isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Contrato'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
