import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { Users, Kanban, TrendingUp, AlertCircle, Target } from 'lucide-react'
import { PipelineChart, LeadsOrigemChart, MonthlyChart } from '@/components/dashboard/dashboard-charts'

const SOURCE_LABELS: Record<string, string> = {
  site: 'Site', whatsapp: 'WhatsApp', indicacao: 'Indicação',
  ligacao: 'Ligação', email: 'Email', outro: 'Outro',
}

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default async function DashboardPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const tenant = await getTenantBySlug(tenantSlug)

  const [leadsRes, dealsRes, stagesRes, activitiesRes, dealProductsRes] = await Promise.all([
    supabase.from('leads').select('id, status, source, created_at').eq('tenant_id', tenant!.id),
    supabase.from('deals').select('id, value, stage_id, discount_pct, tax_pct, created_at').eq('tenant_id', tenant!.id),
    supabase.from('pipeline_stages').select('id, name, color, position').eq('tenant_id', tenant!.id).order('position'),
    supabase.from('activities').select('id').eq('tenant_id', tenant!.id).is('completed_at', null),
    supabase.from('deal_products').select('deal_id, total').eq('tenant_id', tenant!.id),
  ])

  const leads = leadsRes.data ?? []
  const deals = dealsRes.data ?? []
  const stages = stagesRes.data ?? []
  const dealProducts = dealProductsRes.data ?? []

  // Mapa de total por deal (produtos)
  const productTotalByDeal: Record<string, number> = {}
  for (const dp of dealProducts) {
    productTotalByDeal[dp.deal_id] = (productTotalByDeal[dp.deal_id] ?? 0) + Number(dp.total)
  }

  // Calcula receita real de cada deal (aplica desconto e imposto)
  function dealRevenue(deal: any): number {
    const base = productTotalByDeal[deal.id] ?? Number(deal.value ?? 0)
    const afterDiscount = base * (1 - (Number(deal.discount_pct) || 0) / 100)
    const withTax = afterDiscount * (1 + (Number(deal.tax_pct) || 0) / 100)
    return withTax
  }

  // KPIs
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newLeadsThisMonth = leads.filter(l => l.status === 'novo' && new Date(l.created_at) >= startOfMonth).length
  const totalLeads = leads.length
  const totalDeals = deals.length
  const totalReceita = deals.reduce((s, d) => s + dealRevenue(d), 0)
  const pendingActivities = activitiesRes.count ?? activitiesRes.data?.length ?? 0
  const conversionRate = totalLeads > 0 ? Math.round((totalDeals / totalLeads) * 100) : 0

  // Pipeline por etapa
  const pipelineData = stages.map(stage => {
    const stageDeals = deals.filter(d => d.stage_id === stage.id)
    return {
      name: stage.name.length > 12 ? stage.name.slice(0, 12) + '…' : stage.name,
      deals: stageDeals.length,
      valor: stageDeals.reduce((s, d) => s + dealRevenue(d), 0),
      color: stage.color,
    }
  }).filter(s => s.deals > 0 || true) // mostra todas as etapas

  // Leads por origem
  const sourceCount: Record<string, number> = {}
  for (const l of leads) {
    sourceCount[l.source] = (sourceCount[l.source] ?? 0) + 1
  }
  const leadSourceData = Object.entries(sourceCount)
    .map(([k, v]) => ({ name: SOURCE_LABELS[k] ?? k, total: v }))
    .sort((a, b) => b.total - a.total)

  // Receita por mês (últimos 6 meses)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const monthDeals = deals.filter(deal => {
      const created = new Date(deal.created_at)
      return created >= d && created < end
    })
    return {
      mes: MONTH_LABELS[d.getMonth()],
      receita: monthDeals.reduce((s, d) => s + dealRevenue(d), 0),
      leads: leads.filter(l => {
        const created = new Date(l.created_at)
        return created >= d && created < end
      }).length,
    }
  })

  const stats = [
    {
      title: 'Leads Novos',
      value: newLeadsThisMonth,
      sub: `${totalLeads} total cadastrado${totalLeads !== 1 ? 's' : ''}`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Negócios no Pipeline',
      value: totalDeals,
      sub: `${stages.length} etapas configuradas`,
      icon: Kanban,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Receita Prevista',
      value: totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
      sub: 'soma de todos os deals',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Taxa de Conversão',
      value: `${conversionRate}%`,
      sub: `${totalDeals} deals de ${totalLeads} leads`,
      icon: Target,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do seu pipeline de vendas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráficos linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Funil do Pipeline</h2>
            <p className="text-xs text-gray-400">Negócios e receita prevista por etapa</p>
          </div>
          <PipelineChart data={pipelineData} />
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-indigo-100" />
              Nº de negócios
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              Valor (R$)
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Leads por Origem</h2>
            <p className="text-xs text-gray-400">De onde vêm seus leads</p>
          </div>
          <LeadsOrigemChart data={leadSourceData} />
        </div>
      </div>

      {/* Gráfico receita mensal */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Receita Prevista por Mês</h2>
          <p className="text-xs text-gray-400">Valor dos negócios criados nos últimos 6 meses</p>
        </div>
        <MonthlyChart data={monthlyData} />
      </div>

      {/* Resumo por etapa */}
      {stages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Detalhamento por Etapa</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Etapa</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Negócios</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Receita Prevista</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">% do Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pipelineData.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stages[i]?.color ?? '#6366f1' }} />
                      <span className="font-medium text-gray-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{s.deals}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                    {s.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {totalReceita > 0 ? Math.round((s.valor / totalReceita) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
