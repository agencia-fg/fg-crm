import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug, getCurrentTenantUser } from '@/lib/tenant'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ArrowLeft, Calendar, DollarSign, Building2, User, Tag } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const categoryLabels: Record<string, string> = {
  tubos: 'Tubos', eletrodutos: 'Eletrodutos',
  conexoes: 'Conexões Galvanizadas', valvulas: 'Válvulas', outro: 'Outro',
}

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const [tenant, currentUser] = await Promise.all([
    getTenantBySlug(tenantSlug),
    getCurrentTenantUser(),
  ])

  const [dealRes, activitiesRes] = await Promise.all([
    supabase
      .from('deals')
      .select('*, stage:stage_id(*), company:company_id(*), contact:contact_id(*), assignee:assigned_to(*)')
      .eq('id', id)
      .eq('tenant_id', tenant!.id)
      .single(),
    supabase
      .from('activities')
      .select('*, author:created_by(*)')
      .eq('deal_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!dealRes.data) notFound()

  const deal = dealRes.data as any
  const activities = activitiesRes.data ?? []

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/pipeline" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Pipeline
      </Link>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: deal.stage?.color ?? '#6366f1' }}>
                {deal.stage?.name}
              </span>
              {deal.product_category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  <Tag className="w-3 h-3" />
                  {categoryLabels[deal.product_category]}
                </span>
              )}
            </div>
          </div>

          <ActivityFeed
            activities={activities}
            tenantId={tenant!.id}
            dealId={deal.id}
            currentUser={currentUser!}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Detalhes</h3>

            {deal.value && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Valor</p>
                  <p className="font-semibold text-gray-900">
                    {Number(deal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            )}

            {deal.expected_close_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Previsão de Fechamento</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(deal.expected_close_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}

            {deal.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Empresa</p>
                  <p className="font-medium text-gray-900">{deal.company.name}</p>
                  {deal.company.city && <p className="text-xs text-gray-500">{deal.company.city}, {deal.company.state}</p>}
                </div>
              </div>
            )}

            {deal.contact && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Contato</p>
                  <p className="font-medium text-gray-900">{deal.contact.name}</p>
                  {deal.contact.position && <p className="text-xs text-gray-500">{deal.contact.position}</p>}
                </div>
              </div>
            )}

            {deal.assignee && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 text-[9px] font-bold">{deal.assignee.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Responsável</p>
                  <p className="font-medium text-gray-900">{deal.assignee.name}</p>
                </div>
              </div>
            )}
          </div>

          {deal.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Observações</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{deal.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
