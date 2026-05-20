'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Lead, LeadStatus, LeadSource, PipelineStage, TenantUser, ProductCategory } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
}

export function LeadsTable({ leads, stages, tenantId }: LeadsTableProps) {
  const [convertLead, setConvertLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [localLeads, setLocalLeads] = useState(leads)
  const router = useRouter()
  const supabase = createClient()

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

    // Cria o deal
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
