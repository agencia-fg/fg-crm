import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug, getCurrentTenantUser } from '@/lib/tenant'
import { LeadForm } from '@/components/leads/lead-form'
import { LeadsTable } from '@/components/leads/leads-table'
import { Lead, TenantUser } from '@/types'

export default async function LeadsPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()
  const [tenant, currentUser] = await Promise.all([
    getTenantBySlug(tenantSlug),
    getCurrentTenantUser(),
  ])

  const isAdmin = currentUser?.role === 'admin'

  // Leads: RLS já filtra por assigned_to quando vendedor
  const [leadsRes, usersRes, stagesRes] = await Promise.all([
    supabase
      .from('leads')
      .select('*, assignee:assigned_to(id, name)')
      .eq('tenant_id', tenant!.id)
      .order('created_at', { ascending: false }),
    // Admins vêem todos os usuários; vendedores vêem apenas eles mesmos
    isAdmin
      ? supabase.from('tenant_users').select('*').eq('tenant_id', tenant!.id).order('name')
      : supabase.from('tenant_users').select('*').eq('id', currentUser!.id).limit(1),
    supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenant!.id)
      .order('position'),
  ])

  const leads = (leadsRes.data ?? []) as Lead[]
  const users = (usersRes.data ?? []) as TenantUser[]
  const stages = stagesRes.data ?? []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} cadastrado{leads.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Somente admin cria leads manualmente */}
        {isAdmin && <LeadForm tenantId={tenant!.id} users={users} />}
      </div>

      <LeadsTable
        leads={leads as any}
        stages={stages}
        tenantId={tenant!.id}
        users={users}
        isAdmin={isAdmin}
        currentUser={currentUser!}
      />
    </div>
  )
}
