import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { KanbanBoard } from '@/components/pipeline/kanban-board'

export default async function PipelinePage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const tenant = await getTenantBySlug(tenantSlug)

  const [stagesRes, dealsRes] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenant!.id)
      .order('position'),
    supabase
      .from('deals')
      .select('*, company:company_id(id, name), contact:contact_id(id, name), assignee:assigned_to(id, name)')
      .eq('tenant_id', tenant!.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline de Orçamentos</h1>
        <p className="text-gray-500 text-sm mt-1">
          {dealsRes.data?.length ?? 0} negócio{(dealsRes.data?.length ?? 0) !== 1 ? 's' : ''} no funil
        </p>
      </div>

      <KanbanBoard
        stages={stagesRes.data ?? []}
        deals={(dealsRes.data ?? []) as any}
        tenantId={tenant!.id}
      />
    </div>
  )
}
