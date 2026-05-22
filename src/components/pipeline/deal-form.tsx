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
import { Plus, RefreshCw } from 'lucide-react'
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
  isAdmin: boolean
  rotationEnabled: boolean
  currentUserId: string   // tenant_users.id do usuário logado
}

export function DealForm({
  tenantId,
  stages,
  contacts,
  companies,
  users,
  isAdmin,
  rotationEnabled,
  currentUserId,
}: DealFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rotationLoading, setRotationLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    title: '',
    stage_id: stages[0]?.id ?? '',
    contact_id: '',
    company_id: '',
    assigned_to: isAdmin ? '' : currentUserId,   // vendedor auto-atribuído a si mesmo
    value: '',
    product_category: '' as ProductCategory | '',
    expected_close_date: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function useRotation() {
    setRotationLoading(true)
    const res = await fetch('/api/rotation-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erro ao usar rodízio')
    } else {
      setForm(prev => ({ ...prev, assigned_to: data.tenantUserId }))
      toast.success(`Rodízio: próximo é ${data.name}`)
    }
    setRotationLoading(false)
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
    setForm({
      title: '',
      stage_id: stages[0]?.id ?? '',
      contact_id: '',
      company_id: '',
      assigned_to: isAdmin ? '' : currentUserId,
      value: '',
      product_category: '',
      expected_close_date: '',
      notes: '',
    })
    router.refresh()
    setLoading(false)
  }

  const assignedUser = users.find(u => u.id === form.assigned_to)

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
                <Input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Ex: Orçamento tubos galv. — Construtora XYZ"
                  required
                />
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

              {/* Responsável — admin pode escolher ou usar rodízio; vendedor é auto-atribuído */}
              {isAdmin ? (
                <div className="space-y-1.5 col-span-2">
                  <Label>Responsável</Label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none"
                      value={form.assigned_to}
                      onChange={e => set('assigned_to', e.target.value)}
                    >
                      <option value="">Nenhum</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    {rotationEnabled && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={useRotation}
                        disabled={rotationLoading}
                        className="shrink-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        title="Usar rodízio — atribui ao próximo da fila"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${rotationLoading ? 'animate-spin' : ''}`} />
                        <span className="ml-1.5 text-xs">Rodízio</span>
                      </Button>
                    )}
                  </div>
                  {assignedUser && (
                    <p className="text-xs text-indigo-600">→ Atribuído para: <strong>{assignedUser.name}</strong></p>
                  )}
                </div>
              ) : (
                // Vendedor vê apenas o próprio nome (sem dropdown de outros)
                <div className="space-y-1.5 col-span-2">
                  <Label>Responsável</Label>
                  <p className="text-sm text-gray-700 py-1">{users[0]?.name ?? 'Você'}</p>
                </div>
              )}

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
