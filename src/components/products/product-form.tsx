'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { BillingType } from '@/types'

const billingLabels: Record<BillingType, string> = {
  unico: 'Pagamento único',
  mensal: 'Mensalidade',
  recorrente: 'Recorrente (outro período)',
}

interface ProductFormProps {
  tenantId: string
}

const emptyForm = {
  name: '',
  category: '',
  sku: '',
  description: '',
  unit_price: '',
  billing_type: 'unico' as BillingType,
  status: 'ativo',
}

export function ProductForm({ tenantId }: ProductFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const router = useRouter()
  const supabase = createClient()

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('products').insert({
      tenant_id: tenantId,
      name: form.name,
      category: form.category || null,
      sku: form.sku || null,
      description: form.description || null,
      unit_price: parseFloat(form.unit_price) || 0,
      billing_type: form.billing_type,
      status: form.status,
    })

    if (error) { toast.error('Erro ao criar produto'); setLoading(false); return }

    toast.success('Produto criado!')
    setOpen(false)
    setForm(emptyForm)
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Novo Produto
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Produto / Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ex: Tubo Galvanizado 2''" />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Tubos, Conexões..." />
              </div>
              <div className="space-y-1.5">
                <Label>SKU / Código</Label>
                <Input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="TG-2P-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Unitário (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unit_price}
                  onChange={e => set('unit_price', e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Cobrança</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none"
                  value={form.billing_type}
                  onChange={e => set('billing_type', e.target.value)}
                >
                  {Object.entries(billingLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Criar Produto'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
