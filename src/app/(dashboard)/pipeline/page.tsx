import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug, getCurrentTenantUser } from '@/lib/tenant'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { DealForm } from '@/components/pipeline/deal-form'
import { TenantUser } from '@/types'

export default async function PipelinePage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const [tenant, currentUser] = await Promise.all([
    getTenantBySlug(tenantSlug),
    getCurrentTenantUser(),
  ])

  const isAdmin = currentUser?.role === 'admin'

  const [stagesRes, dealsRes, contactsRes, companiesRes, usersRes, tenantRes] = await Promise.all([
    supabase.from('pipeline_stages').select('*').eq('tenant_id', tenant!.id).order('position'),
    // RLS filtra deals automaticamente por assigned_to quando vendedor
    supabase
      .from('deals')
      .select('*, company:company_id(id, name), contact:contact_id(id, name), assignee:assigned_to(id, name)')
      .eq('tenant_id', tenant!.id)
      .order('created_at', { ascending: false }),
    supabase.from('contacts').select('id, name').eq('tenant_id', tenant!.id).order('name'),
    supabase.from('companies').select('id, name').eq('tenant_id', tenant!.id).order('name'),
    // Admin vê todos os usuários para atribuição; vendedor vê só ele mesmo
    isAdmin
      ? supabase.from('tenant_users').select('*').eq('tenant_id', tenant!.id).order('name')
      : supabase.from('tenant_users').select('*').eq('id', currentUser!.id).limit(1),
    // Precisa do rotation_enabled para mostrar botão de rodízio no form
    isAdmin
      ? supabase.from('tenants').select('rotation_enabled').eq('id', tenant!.id).single()
      : Promise.resolve({ data: null }),
  ])

  const rotationEnabled = (tenantRes as any).data?.rotation_enabled ?? false
  const users = (usersRes.data ?? []) as TenantUser[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de Orçamentos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {dealsRes.data?.length ?? 0} negócio{(dealsRes.data?.length ?? 0) !== 1 ? 's' : ''} no funil
          </p>
        </div>
        <DealForm
          tenantId={tenant!.id}
          stages={stagesRes.data ?? []}
          contacts={(contactsRes.data ?? []) as any}
          companies={(companiesRes.data ?? []) as any}
          users={users}
          isAdmin={isAdmin}
          rotationEnabled={rotationEnabled}
          currentUserId={currentUser!.id}
        />
      </div>

      <KanbanBoard
        stages={stagesRes.data ?? []}
        deals={(dealsRes.data ?? []) as any}
        tenantId={tenant!.id}
      />
    </div>
  )
}
