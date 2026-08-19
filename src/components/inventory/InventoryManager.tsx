'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Loader2, Pencil, Plus, Sparkles, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { SPACES } from '@/lib/contractTemplates'
import {
  InventoryItemData,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  seedDefaultInventory,
  updateInventoryItem,
} from '@/app/actions/inventory'

const selectClass =
  'flex h-10 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] px-3 py-2 text-sm shadow-sm transition-all duration-200 focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20'

const PACKAGE_OPTIONS = [
  { value: '', label: 'Todos os pacotes' },
  { value: 'simples', label: 'Pacote Simples' },
  { value: 'completo', label: 'Pacote Completo' },
]

function packageLabel(pkg: string | null): string {
  if (pkg === 'simples') return 'Pacote Simples'
  if (pkg === 'completo') return 'Pacote Completo'
  return 'Todos os pacotes'
}

interface DraftItem {
  spaceSlug: string
  name: string
  quantity: string
  package: string
}

const emptyDraft = (spaceSlug: string): DraftItem => ({ spaceSlug, name: '', quantity: '1', package: '' })

export function InventoryManager() {
  const spaces = Object.values(SPACES)
  const [items, setItems] = useState<InventoryItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [spaceFilter, setSpaceFilter] = useState<string>('estancia-aveiro')
  const [draft, setDraft] = useState<DraftItem>(emptyDraft('estancia-aveiro'))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<DraftItem>(emptyDraft('estancia-aveiro'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const loadItems = async () => {
    setLoading(true)
    const result = await getInventoryItems()
    if (result.success) {
      setItems(result.data)
      setError(null)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [])

  const visibleItems = useMemo(
    () => items.filter((item) => item.spaceSlug === spaceFilter),
    [items, spaceFilter]
  )

  const parseDraft = (d: DraftItem) => ({
    spaceSlug: d.spaceSlug,
    name: d.name.trim(),
    quantity: parseInt(d.quantity, 10) || 0,
    package: d.package === '' ? null : d.package,
  })

  const handleAdd = async () => {
    setBusy(true)
    setError(null)
    const result = await createInventoryItem(parseDraft(draft))
    if (result.success) {
      setItems((prev) => [...prev, result.data])
      setDraft(emptyDraft(draft.spaceSlug))
    } else {
      setError(result.error)
    }
    setBusy(false)
  }

  const startEdit = (item: InventoryItemData) => {
    setEditingId(item.id)
    setEditDraft({
      spaceSlug: item.spaceSlug,
      name: item.name,
      quantity: String(item.quantity),
      package: item.package ?? '',
    })
    setPendingDeleteId(null)
  }

  const handleSaveEdit = async (id: number) => {
    setBusy(true)
    setError(null)
    const result = await updateInventoryItem(id, parseDraft(editDraft))
    if (result.success) {
      setItems((prev) => prev.map((item) => (item.id === id ? result.data : item)))
      setEditingId(null)
    } else {
      setError(result.error)
    }
    setBusy(false)
  }

  const handleDelete = async (id: number) => {
    setBusy(true)
    setError(null)
    const result = await deleteInventoryItem(id)
    if (result.success) {
      setItems((prev) => prev.filter((item) => item.id !== id))
    } else {
      setError(result.error)
    }
    setPendingDeleteId(null)
    setBusy(false)
  }

  const handleSeed = async () => {
    setBusy(true)
    setError(null)
    const result = await seedDefaultInventory(spaceFilter)
    if (result.success) {
      await loadItems()
    } else {
      setError(result.error)
    }
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      {/* Space filter */}
      <div className="flex flex-wrap items-center gap-2">
        {spaces.map((space) => (
          <button
            key={space.id}
            type="button"
            onClick={() => {
              setSpaceFilter(space.id)
              setDraft((prev) => ({ ...prev, spaceSlug: space.id }))
              setEditingId(null)
              setPendingDeleteId(null)
            }}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              spaceFilter === space.id
                ? 'text-white border-transparent'
                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--input-focus)]'
            }`}
            style={spaceFilter === space.id ? { backgroundColor: space.color } : undefined}
          >
            {space.displayName}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {/* Add form */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-4">
          Adicionar item
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr_180px_180px_auto] gap-3 items-end">
          <div>
            <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Qtd *</Label>
            <Input
              type="number"
              min="1"
              value={draft.quantity}
              onChange={(e) => setDraft((prev) => ({ ...prev, quantity: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Item *</Label>
            <Input
              value={draft.name}
              placeholder="Ex.: Poltrona de couro"
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Espaço *</Label>
            <select
              className={selectClass}
              value={draft.spaceSlug}
              onChange={(e) => setDraft((prev) => ({ ...prev, spaceSlug: e.target.value }))}
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>{space.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Pacote</Label>
            <select
              className={selectClass}
              value={draft.package}
              onChange={(e) => setDraft((prev) => ({ ...prev, package: e.target.value }))}
            >
              {PACKAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={busy || !draft.name.trim() || (parseInt(draft.quantity, 10) || 0) < 1}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mt-3">
          O pacote define em quais Termos de Vistoria o item aparece: itens do Pacote Simples também entram
          no Completo (o Completo inclui tudo); &ldquo;Todos os pacotes&rdquo; entra sempre.
        </p>
      </div>

      {/* Items table */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)] flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Itens — {SPACES[spaceFilter]?.displayName} ({visibleItems.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando itens...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
            <ClipboardList className="h-8 w-8 text-[var(--muted-foreground)]" />
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhum item cadastrado para este espaço ainda.
            </p>
            {spaceFilter === 'estancia-aveiro' && (
              <Button type="button" variant="outline" onClick={handleSeed} disabled={busy} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Carregar itens padrão da Estância
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="px-5 py-2.5 w-20">Qtd</th>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5 w-44">Pacote</th>
                  <th className="px-3 py-2.5 w-32 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    {editingId === item.id ? (
                      <>
                        <td className="px-5 py-2">
                          <Input
                            type="number"
                            min="1"
                            className="h-9"
                            value={editDraft.quantity}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            className="h-9"
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className={`${selectClass} h-9`}
                            value={editDraft.package}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, package: e.target.value }))}
                          >
                            {PACKAGE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Salvar"
                              disabled={busy || !editDraft.name.trim()}
                              onClick={() => handleSaveEdit(item.id)}
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Cancelar"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-2.5 font-medium text-[var(--foreground)]">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-[var(--foreground)]">{item.name}</td>
                        <td className="px-3 py-2.5 text-[var(--muted-foreground)]">{packageLabel(item.package)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {pendingDeleteId === item.id ? (
                              <>
                                <span className="text-xs text-[var(--muted-foreground)]">Excluir?</span>
                                <button
                                  type="button"
                                  title="Confirmar exclusão"
                                  disabled={busy}
                                  onClick={() => handleDelete(item.id)}
                                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Cancelar"
                                  onClick={() => setPendingDeleteId(null)}
                                  className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  title="Editar"
                                  onClick={() => startEdit(item)}
                                  className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Excluir"
                                  onClick={() => setPendingDeleteId(item.id)}
                                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
