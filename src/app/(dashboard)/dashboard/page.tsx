import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Kanban, TrendingUp, AlertCircle } from 'lucide-react'

export default async function DashboardPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const tenant = await getTenantBySlug(tenantSlug)

  const [leadsRes, dealsRes, activitiesRes] = await Promise.all([
    supabase.from('leads').select('id, status', { count: 'exact' }).eq('tenant_id', tenant!.id),
    supabase.from('deals').select('id, value, stage_id, pipeline_stages!inner(name)', { count: 'exact' }).eq('tenant_id', tenant!.id),
    supabase.from('activities').select('id', { count: 'exact' }).eq('tenant_id', tenant!.id).is('completed_at', null),
  ])

  const totalLeads = leadsRes.count ?? 0
  const newLeads = leadsRes.data?.filter(l => l.status === 'novo').length ?? 0
  const totalDeals = dealsRes.count ?? 0
  const totalValue = dealsRes.data?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0
  const pendingActivities = activitiesRes.count ?? 0

  const stats = [
    { title: 'Leads Novos', value: newLeads, sub: `${totalLeads} total`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Negócios Abertos', value: totalDeals, sub: 'no pipeline', icon: Kanban, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Receita Prevista', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'todos os deals', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Atividades Pendentes', value: pendingActivities, sub: 'a completar', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do seu pipeline de vendas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
