'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { LeadSource, TenantUser } from '@/types'

const sourceLabels: Record<LeadSource, string> = {
  site: 'Formulário do Site',
  whatsapp: 'WhatsApp',
  indicacao: 'Indicação',
  ligacao: 'Ligação',
  email: 'Email',
  outro: 'Outro',
}

interface LeadFormProps {
  tenantId: string
  users: TenantUser[]
}

async function findOrCreateCompany(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  name: string,
  phone: string,
  email: string
): Promise<string | null> {
  // Busca empresa existente pelo nome (case-insensitive)
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', name.trim())
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from('companies')
    .insert({ tenant_id: tenantId, name: name.trim(), phone: phone || null, email: email || null })
    .select('id')
    .single()

  return created?.id ?? null
}

async function findOrCreateContact(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  name: string,
  email: string,
  phone: string,
  companyId: string | null
): Promise<string | null> {
  // Busca por email (mais preciso) ou por nome + empresa
  if (email) {
    const { data: byEmail } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email.trim())
      .limit(1)
      .maybeSingle()
    if (byEmail) return byEmail.id
  }

  const { data: created } = await supabase
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      company_id: companyId,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
    })
    .select('id')
    .single()

  return created?.id ?? null
}

export function LeadForm({ tenantId, users }: LeadFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    source: 'outro' as LeadSource,
    message: '',
    assigned_to: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // 1. Cria o lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        tenant_id: tenantId,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        company_name: form.company_name || null,
        source: form.source,
        message: form.message || null,
        assigned_to: form.assigned_to || null,
      })
      .select('id')
      .single()

    if (error || !lead) {
      toast.error('Erro ao criar lead')
      setLoading(false)
      return
    }

    // 2. Cria empresa e contato automaticamente
    try {
      const companyId = form.company_name
        ? await findOrCreateCompany(supabase, tenantId, form.company_name, form.phone, form.email)
        : null

      const contactId = await findOrCreateContact(
        supabase, tenantId, form.name, form.email, form.phone, companyId
      )

      // 3. Vincula ao lead
      if (companyId || contactId) {
        await supabase
          .from('leads')
          .update({ company_id: companyId, contact_id: contactId })
          .eq('id', lead.id)
      }
    } catch {
      // Não bloqueia — lead foi criado, empresa/contato falhou silenciosamente
    }

    toast.success('Lead criado!')
    setOpen(false)
    setForm({ name: '', email: '', phone: '', company_name: '', source: 'outro', message: '', assigned_to: '' })
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Novo Lead
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome do Contato *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Empresa *</Label>
                <Input
                  value={form.company_name}
                  onChange={e => set('company_name', e.target.value)}
                  placeholder="Razão social ou nome fantasia"
                  required
                />
                <p className="text-xs text-gray-400">Se a empresa já estiver cadastrada, será vinculada automaticamente</p>
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={form.source} onValueChange={v => set('source', v ?? 'outro')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Mensagem / Observação</Label>
                <Textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Criar Lead'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
