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
import { ArrowRight, CheckCircle2, Pencil } from 'lucide-react'
import { Lead, LeadStatus, LeadSource, PipelineStage, ProductCategory } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

async function findOrCreateCompany(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  name: string,
  phone: string,
  email: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('companies').select('id')
    .eq('tenant_id', tenantId).ilike('name', name.trim()).limit(1).maybeSingle()
  if (existing) return existing.id
  const { data: created } = await supabase
    .from('companies')
    .insert({ tenant_id: tenantId, name: name.trim(), phone: phone || null, email: email || null })
    .select('id').single()
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
  if (email) {
    const { data: byEmail } = await supabase
      .from('contacts').select('id')
      .eq('tenant_id', tenantId).eq('email', email.trim()).limit(1).maybeSingle()
    if (byEmail) return byEmail.id
  }
  const { data: created } = await supabase
    .from('contacts')
    .insert({ tenant_id: tenantId, company_id: companyId, name: name.trim(), email: email || null, phone: phone || null })
    .select('id').single()
  return created?.id ?? null
}

const statusColors: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-yellow-100 text-yellow-700',
  qualificado: 'bg-green-100 text-green-700',
  desqualificado: 'bg-gray-100 text-gray-500',
}

const statusLabels: Record<LeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  qualificado: 'Qualificado',
  desqualificado: 'Desqualificado',
}

const sourceLabels: Record<LeadSource, string> = {
  site: 'Site',
  whatsapp: 'WhatsApp',
  indicacao: 'Indicação',
  ligacao: 'Ligação',
  email: 'Email',
  outro: 'Outro',
}

const categories: Record<ProductCategory, string> = {
  tubos: 'Tubos',
  eletrodutos: 'Eletrodutos',
  conexoes: 'Conexões Galvanizadas',
  valvulas: 'Válvulas',
  outro: 'Outro',
}

interface LeadsTableProps {
  leads: (Lead & { assignee?: { id: string; name: string } | null })[]
  stages: PipelineStage[]
  tenantId: string
  users: { id: string; name: string }[]
}

export function LeadsTable({ leads, stages, tenantId, users }: LeadsTableProps) {
  const [convertLead, setConvertLead] = useState<Lead | null>(null)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [localLeads, setLocalLeads] = useState(leads)
  const router = useRouter()
  const supabase = createClient()

  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', company_name: '',
    source: 'outro' as LeadSource, status: 'novo' as LeadStatus,
    message: '', assigned_to: '',
  })

  function openEdit(lead: Lead) {
    setEditForm({
      name: lead.name,
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      company_name: lead.company_name ?? '',
      source: lead.source,
      status: lead.status,
      message: lead.message ?? '',
      assigned_to: lead.assigned_to ?? '',
    })
    setEditLead(lead)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editLead) return
    setLoading(true)

    // Auto-cria empresa e contato se necessário
    let companyId = editLead.company_id ?? null
    let contactId = editLead.contact_id ?? null
    try {
      if (editForm.company_name) {
        companyId = await findOrCreateCompany(supabase, tenantId, editForm.company_name, editForm.phone, editForm.email)
      }
      contactId = await findOrCreateContact(supabase, tenantId, editForm.name, editForm.email, editForm.phone, companyId)
    } catch {
      // Não bloqueia — atualiza o lead mesmo se a criação de empresa/contato falhar
    }

    const { error } = await supabase
      .from('leads')
      .update({
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        company_name: editForm.company_name || null,
        source: editForm.source,
        status: editForm.status,
        message: editForm.message || null,
        assigned_to: editForm.assigned_to || null,
        company_id: companyId,
        contact_id: contactId,
      })
      .eq('id', editLead.id)

    if (error) { toast.error('Erro ao salvar'); setLoading(false); return }

    setLocalLeads(prev => prev.map(l =>
      l.id === editLead.id
        ? { ...l, ...editForm, email: editForm.email || null, phone: editForm.phone || null,
            company_name: editForm.company_name || null, message: editForm.message || null,
            assigned_to: editForm.assigned_to || null, company_id: companyId, contact_id: contactId }
        : l
    ))
    toast.success('Lead atualizado!')
    setEditLead(null)
    setLoading(false)
    router.refresh()
  }

  const [dealForm, setDealForm] = useState({
    title: '',
    value: '',
    stage_id: stages[0]?.id ?? '',
    product_category: '' as ProductCategory | '',
  })

  function openConvert(lead: Lead) {
    setDealForm({
      title: `Orçamento — ${lead.company_name || lead.name}`,
      value: '',
      stage_id: stages[0]?.id ?? '',
      product_category: '',
    })
    setConvertLead(lead)
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()
    if (!convertLead) return
    setLoading(true)

    // Cria o deal vinculando empresa e contato do lead
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        tenant_id: tenantId,
        title: dealForm.title,
        stage_id: dealForm.stage_id,
        value: dealForm.value ? parseFloat(dealForm.value) : null,
        product_category: dealForm.product_category || null,
        assigned_to: convertLead.assigned_to,
        notes: convertLead.message,
        company_id: convertLead.company_id ?? null,
        contact_id: convertLead.contact_id ?? null,
      })
      .select()
      .single()

    if (dealError) {
      toast.error('Erro ao criar negócio')
      setLoading(false)
      return
    }

    // Marca o lead como convertido e qualificado
    const { error: leadError } = await supabase
      .from('leads')
      .update({
        converted_to_deal_id: deal.id,
        status: 'qualificado',
      })
      .eq('id', convertLead.id)

    if (leadError) {
      toast.error('Erro ao atualizar lead')
      setLoading(false)
      return
    }

    // Atualiza localmente sem precisar de refresh
    setLocalLeads(prev =>
      prev.map(l =>
        l.id === convertLead.id
          ? { ...l, converted_to_deal_id: deal.id, status: 'qualificado' as LeadStatus }
          : l
      )
    )

    toast.success('Lead convertido em negócio! Veja no Pipeline.')
    setConvertLead(null)
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contato</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Origem</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Responsável</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pipeline</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {localLeads.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  Nenhum lead cadastrado. Crie o primeiro!
                </td>
              </tr>
            )}
            {localLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                <td className="px-4 py-3 text-gray-600">{lead.company_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{lead.phone}</div>
                  <div className="text-xs text-gray-400">{lead.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{sourceLabels[lead.source]}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                    {statusLabels[lead.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {(lead as any).assignee?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {format(new Date(lead.created_at), "dd MMM yyyy", { locale: ptBR })}
                </td>
                <td className="px-4 py-3">
                  {lead.converted_to_deal_id ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      No pipeline
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={() => openConvert(lead)}
                    >
                      <ArrowRight className="w-3 h-3" />
                      Converter
                    </Button>
                  )}
                </td>
                <td className="px-2 py-3">
                  <button
                    onClick={() => openEdit(lead)}
                    className="p-1.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Editar lead"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog de edição */}
      <Dialog open={!!editLead} onOpenChange={(o) => !o && setEditLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome *</Label>
                <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input value={editForm.company_name} onChange={e => setEditForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={editForm.source} onValueChange={v => setEditForm(p => ({ ...p, source: (v ?? 'outro') as LeadSource }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['site','whatsapp','indicacao','ligacao','email','outro'] as LeadSource[]).map(s => (
                      <SelectItem key={s} value={s}>
                        {s === 'site' ? 'Site' : s === 'whatsapp' ? 'WhatsApp' : s === 'indicacao' ? 'Indicação' : s === 'ligacao' ? 'Ligação' : s === 'email' ? 'Email' : 'Outro'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: (v ?? 'novo') as LeadStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="contatado">Contatado</SelectItem>
                    <SelectItem value="qualificado">Qualificado</SelectItem>
                    <SelectItem value="desqualificado">Desqualificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {users.length > 0 && (
                <div className="space-y-1.5 col-span-2">
                  <Label>Responsável</Label>
                  <Select value={editForm.assigned_to} onValueChange={v => setEditForm(p => ({ ...p, assigned_to: v ?? '' }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 col-span-2">
                <Label>Mensagem / Observação</Label>
                <Textarea value={editForm.message} onChange={e => setEditForm(p => ({ ...p, message: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditLead(null)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de conversão */}
      <Dialog open={!!convertLead} onOpenChange={(o) => !o && setConvertLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Converter em Negócio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            O lead <strong>{convertLead?.name}</strong> será enviado para o Pipeline.
          </p>
          <form onSubmit={handleConvert} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label>Título do Negócio *</Label>
              <Input
                value={dealForm.title}
                onChange={e => setDealForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor Estimado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={dealForm.value}
                  onChange={e => setDealForm(p => ({ ...p, value: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Etapa no Pipeline</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none"
                  value={dealForm.stage_id}
                  onChange={e => setDealForm(p => ({ ...p, stage_id: e.target.value }))}
                >
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria do Produto</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none"
                value={dealForm.product_category}
                onChange={e => setDealForm(p => ({ ...p, product_category: e.target.value as ProductCategory | '' }))}
              >
                <option value="">Selecionar</option>
                {Object.entries(categories).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setConvertLead(null)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Convertendo...' : '→ Enviar para Pipeline'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
