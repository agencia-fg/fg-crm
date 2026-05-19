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
import { PipelineStage, Contact, Company, TenantUser, ProductCategory } from '@/types'

const categories: Record<ProductCategory, string> = {
  tubos: 'Tubos',
  eletrodutos: 'Eletrodutos',
  conexoes: 'Conexões Galvanizadas',
  valvulas: 'Válvulas',
  outro: 'Outro',
}

interface DealFormProps {
  tenantId: string
  stages: PipelineStage[]
  contacts: Contact[]
  companies: Company[]
  users: TenantUser[]
}

export function DealForm({ tenantId, stages, contacts, companies, users }: DealFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    title: '',
    stage_id: stages[0]?.id ?? '',
    contact_id: '',
    company_id: '',
    assigned_to: '',
    value: '',
    product_category: '' as ProductCategory | '',
    expected_close_date: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('deals').insert({
      tenant_id: tenantId,
      title: form.title,
      stage_id: form.stage_id,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      assigned_to: form.assigned_to || null,
      value: form.value ? parseFloat(form.value) : null,
      product_category: form.product_category || null,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes || null,
    })

    if (error) { toast.error('Erro ao criar negócio'); setLoading(false); return }

    toast.success('Negócio criado!')
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Novo Negócio
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Negócio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Orçamento tubos galv. — Construtora XYZ" required />
              </div>
              <div className="space-y-1.5">
                <Label>Etapa</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none" value={form.stage_id} onChange={e => set('stage_id', e.target.value)}>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none" value={form.product_category} onChange={e => set('product_category', e.target.value)}>
                  <option value="">Selecionar</option>
                  {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Previsão de Fechamento</Label>
                <Input type="date" value={form.expected_close_date} onChange={e => set('expected_close_date', e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Empresa</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none" value={form.company_id} onChange={e => set('company_id', e.target.value)}>
                  <option value="">Nenhuma</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Contato</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none" value={form.contact_id} onChange={e => set('contact_id', e.target.value)}>
                  <option value="">Nenhum</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Responsável</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                  <option value="">Nenhum</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Criar Negócio'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
