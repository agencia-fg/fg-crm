import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { LeadForm } from '@/components/leads/lead-form'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lead, LeadStatus, LeadSource } from '@/types'

const statusColors: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-yellow-100 text-yellow-700',
  qualificado: 'bg-green-100 text-green-700',
  desqualificado: 'bg-gray-100 text-gray-500',
}

const sourceLabels: Record<LeadSource, string> = {
  site: 'Site',
  whatsapp: 'WhatsApp',
  indicacao: 'Indicação',
  ligacao: 'Ligação',
  email: 'Email',
  outro: 'Outro',
}

export default async function LeadsPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const tenant = await getTenantBySlug(tenantSlug)

  const [leadsRes, usersRes] = await Promise.all([
    supabase
      .from('leads')
      .select('*, assignee:assigned_to(id, name)')
      .eq('tenant_id', tenant!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenant!.id),
  ])

  const leads = (leadsRes.data ?? []) as Lead[]
  const users = usersRes.data ?? []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">{leads.length} lead{leads.length !== 1 ? 's' : ''} cadastrado{leads.length !== 1 ? 's' : ''}</p>
        </div>
        <LeadForm tenantId={tenant!.id} users={users} />
      </div>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  Nenhum lead cadastrado. Crie o primeiro!
                </td>
              </tr>
            )}
            {leads.map((lead) => (
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
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {(lead as any).assignee?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {format(new Date(lead.created_at), "dd MMM yyyy", { locale: ptBR })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
