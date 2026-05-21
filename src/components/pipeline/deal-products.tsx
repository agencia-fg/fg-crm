'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, ShoppingCart, Pencil } from 'lucide-react'
import { DealProduct, Product } from '@/types'

interface DealProductsProps {
  dealId: string
  tenantId: string
  initialItems: DealProduct[]
  products: Product[]
  initialTaxPct: number
  initialDiscountPct: number
}

export function DealProducts({
  dealId, tenantId, initialItems, products,
  initialTaxPct, initialDiscountPct,
}: DealProductsProps) {
  const [items, setItems] = useState(initialItems)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [taxPct, setTaxPct] = useState(initialTaxPct)
  const [discountPct, setDiscountPct] = useState(initialDiscountPct)
  const [editingFinancials, setEditingFinancials] = useState(false)
  const [tempTax, setTempTax] = useState(String(initialTaxPct))
  const [tempDiscount, setTempDiscount] = useState(String(initialDiscountPct))
  const supabase = createClient()

  const [form, setForm] = useState({
    product_id: '', name: '', unit_price: '', quantity: '1', discount_pct: '0',
  })

  function onProductSelect(id: string) {
    const p = products.find(x => x.id === id)
    if (p) {
      setForm(prev => ({ ...prev, product_id: id, name: p.name, unit_price: String(p.unit_price) }))
    } else {
      setForm(prev => ({ ...prev, product_id: '', name: '', unit_price: '' }))
    }
  }

  const lineTotal = (unit: number, qty: number, disc: number) =>
    unit * qty * (1 - disc / 100)

  // Cálculo financeiro
  const subtotal = items.reduce((s, i) => s + Number(i.total), 0)
  const descontoGlobal = subtotal * (discountPct / 100)
  const base = subtotal - descontoGlobal
  const impostos = base * (taxPct / 100)
  const total = base + impostos
  const receitaPrevista = base // receita sem impostos

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const unit = parseFloat(form.unit_price) || 0
    const qty = parseInt(form.quantity) || 1
    const disc = parseFloat(form.discount_pct) || 0

    const { data, error } = await supabase
      .from('deal_products')
      .insert({
        tenant_id: tenantId, deal_id: dealId,
        product_id: form.product_id || null,
        name: form.name, unit_price: unit, quantity: qty, discount_pct: disc,
      })
      .select().single()

    if (error) { toast.error('Erro ao adicionar item'); setLoading(false); return }

    setItems(prev => [...prev, { ...data, total: lineTotal(unit, qty, disc) }])
    setOpen(false)
    setForm({ product_id: '', name: '', unit_price: '', quantity: '1', discount_pct: '0' })
    setLoading(false)
    toast.success('Item adicionado!')
  }

  async function handleRemove(id: string) {
    const { error } = await supabase.from('deal_products').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover'); return }
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function saveFinancials() {
    const newTax = parseFloat(tempTax) || 0
    const newDiscount = parseFloat(tempDiscount) || 0
    const { error } = await supabase
      .from('deals')
      .update({ tax_pct: newTax, discount_pct: newDiscount })
      .eq('id', dealId)
    if (error) { toast.error('Erro ao salvar'); return }
    setTaxPct(newTax)
    setDiscountPct(newDiscount)
    setEditingFinancials(false)
    toast.success('Valores atualizados!')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const activeProducts = products.filter(p => p.status === 'ativo')

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <ShoppingCart className="w-4 h-4 text-gray-400" />
          Produtos & Itens
        </h3>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
          <Plus className="w-3 h-3 mr-1" />
          Adicionar item
        </Button>
      </div>

      {/* Itens */}
      <div className="divide-y divide-gray-50">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum item vinculado ainda</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-2 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity}× {fmt(Number(item.unit_price))}
                  {item.discount_pct > 0 && ` · ${item.discount_pct}% desc.`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-900">{fmt(Number(item.total))}</span>
                <button onClick={() => handleRemove(item.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumo financeiro */}
      {(items.length > 0 || taxPct > 0 || discountPct > 0) && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal dos itens</span>
            <span>{fmt(subtotal)}</span>
          </div>

          {discountPct > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>(-) Desconto global ({discountPct}%)</span>
              <span>-{fmt(descontoGlobal)}</span>
            </div>
          )}

          {(discountPct > 0 || taxPct > 0) && (
            <div className="flex justify-between text-sm text-gray-600 font-medium border-t border-gray-200 pt-1.5">
              <span>Base de cálculo</span>
              <span>{fmt(base)}</span>
            </div>
          )}

          {taxPct > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>(+) Impostos ({taxPct}%)</span>
              <span>+{fmt(impostos)}</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-1">
            <span className="text-sm font-bold text-gray-700">Total da proposta</span>
            <span className="text-base font-bold text-indigo-600">{fmt(total)}</span>
          </div>

          {taxPct > 0 && (
            <div className="flex justify-between text-xs text-gray-400">
              <span>Receita prevista (sem impostos)</span>
              <span className="font-medium text-green-600">{fmt(receitaPrevista)}</span>
            </div>
          )}

          {/* Editar impostos/desconto */}
          <div className="pt-2">
            {editingFinancials ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Desconto global (%)</Label>
                    <Input
                      type="number" step="0.1" min="0" max="100" className="h-7 text-xs"
                      value={tempDiscount}
                      onChange={e => setTempDiscount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Impostos (%)</Label>
                    <Input
                      type="number" step="0.1" min="0" className="h-7 text-xs"
                      value={tempTax}
                      onChange={e => setTempTax(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={saveFinancials}>Salvar</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingFinancials(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setTempTax(String(taxPct)); setTempDiscount(String(discountPct)); setEditingFinancials(true) }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                {taxPct === 0 && discountPct === 0 ? 'Adicionar impostos / desconto global' : 'Editar impostos / desconto'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botão de ativar resumo quando não há itens */}
      {items.length === 0 && taxPct === 0 && discountPct === 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setEditingFinancials(true)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            + Adicionar impostos / desconto
          </button>
        </div>
      )}

      {/* Dialog de adicionar item */}
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
                    {p.name}{p.category ? ` · ${p.category}` : ''} — {fmt(Number(p.unit_price))}
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
              <div className="space-y-1.5">
                <Label>Qtd.</Label>
                <Input type="number" min="1" value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Unit. (R$)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" required
                  value={form.unit_price}
                  onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Desconto %</Label>
                <Input type="number" step="0.1" min="0" max="100"
                  value={form.discount_pct}
                  onChange={e => setForm(p => ({ ...p, discount_pct: e.target.value }))} />
              </div>
            </div>
            {form.unit_price && (
              <p className="text-sm text-gray-500">
                Subtotal: <strong className="text-gray-900">
                  {fmt(lineTotal(parseFloat(form.unit_price)||0, parseInt(form.quantity)||1, parseFloat(form.discount_pct)||0))}
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
