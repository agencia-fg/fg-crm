'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import { DealProduct, Product } from '@/types'

interface DealProductsProps {
  dealId: string
  tenantId: string
  initialItems: DealProduct[]
  products: Product[]
}

export function DealProducts({ dealId, tenantId, initialItems, products }: DealProductsProps) {
  const [items, setItems] = useState(initialItems)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [form, setForm] = useState({
    product_id: '',
    name: '',
    unit_price: '',
    quantity: '1',
    discount_pct: '0',
  })

  function onProductSelect(id: string) {
    const p = products.find(x => x.id === id)
    if (p) {
      setForm(prev => ({
        ...prev,
        product_id: id,
        name: p.name,
        unit_price: String(p.unit_price),
      }))
    } else {
      setForm(prev => ({ ...prev, product_id: '', name: '', unit_price: '' }))
    }
  }

  const lineTotal = (unit: number, qty: number, disc: number) =>
    unit * qty * (1 - disc / 100)

  const grandTotal = items.reduce((s, i) => s + Number(i.total), 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const unit = parseFloat(form.unit_price) || 0
    const qty = parseInt(form.quantity) || 1
    const disc = parseFloat(form.discount_pct) || 0

    const { data, error } = await supabase
      .from('deal_products')
      .insert({
        tenant_id: tenantId,
        deal_id: dealId,
        product_id: form.product_id || null,
        name: form.name,
        unit_price: unit,
        quantity: qty,
        discount_pct: disc,
      })
      .select()
      .single()

    if (error) { toast.error('Erro ao adicionar item'); setLoading(false); return }

    setItems(prev => [...prev, { ...data, total: lineTotal(unit, qty, disc) }])
    setOpen(false)
    setForm({ product_id: '', name: '', unit_price: '', quantity: '1', discount_pct: '0' })
    setLoading(false)
    toast.success('Item adicionado!')
  }

  async function handleRemove(id: string) {
    const { error } = await supabase.from('deal_products').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover item'); return }
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Item removido')
  }

  const activeProducts = products.filter(p => p.status === 'ativo')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" />
          Produtos / Itens
        </h3>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum item vinculado</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity}× {Number(item.unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {item.discount_pct > 0 && ` · ${item.discount_pct}% desc.`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-900">
                  {Number(item.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <button onClick={() => handleRemove(item.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</span>
            <span className="text-base font-bold text-indigo-600">
              {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Item ao Negócio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Produto do Catálogo</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none"
                value={form.product_id}
                onChange={e => onProductSelect(e.target.value)}
              >
                <option value="">— Selecionar do catálogo (opcional) —</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.category ? ` · ${p.category}` : ''} — {Number(p.unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição do Item *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome do produto ou serviço"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label>Qtd.</Label>
                <Input
                  type="number" min="1"
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label>Valor Unit. (R$)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.unit_price}
                  onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label>Desconto %</Label>
                <Input
                  type="number" step="0.1" min="0" max="100"
                  value={form.discount_pct}
                  onChange={e => setForm(p => ({ ...p, discount_pct: e.target.value }))}
                />
              </div>
            </div>
            {form.unit_price && (
              <p className="text-sm text-gray-500">
                Subtotal: <strong className="text-gray-900">
                  {lineTotal(parseFloat(form.unit_price)||0, parseInt(form.quantity)||1, parseFloat(form.discount_pct)||0)
                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Adicionar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
