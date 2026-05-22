import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug, getCurrentTenantUser } from '@/lib/tenant'
import { AccountSettings } from '@/components/configuracoes/account-settings'
import { PipelineStagesSettings } from '@/components/configuracoes/pipeline-stages-settings'
import { LossReasonsSettings } from '@/components/configuracoes/loss-reasons-settings'
import { RotationSettings } from '@/components/configuracoes/rotation-settings'
import { PipelineStage, LossReason, RotationQueueEntry, TenantUser } from '@/types'
import { Settings } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()

  const [tenant, currentUser] = await Promise.all([
    getTenantBySlug(tenantSlug),
    getCurrentTenantUser(),
  ])

  if (!tenant || !currentUser) redirect('/login')
  if (currentUser.role !== 'admin') redirect('/dashboard')

  const [stagesRes, lossReasonsRes, rotationRes, vendedoresRes] = await Promise.all([
    supabase.from('pipeline_stages').select('*').eq('tenant_id', tenant.id).order('position'),
    supabase.from('loss_reasons').select('*').eq('tenant_id', tenant.id).order('position'),
    supabase
      .from('rotation_queue')
      .select('*, tenant_user:tenant_user_id(*)')
      .eq('tenant_id', tenant.id)
      .order('position'),
    supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('role', 'vendedor')
      .order('name'),
  ])

  const stages = (stagesRes.data ?? []) as PipelineStage[]
  const lossReasons = (lossReasonsRes.data ?? []) as LossReason[]
  const rotationQueue = (rotationRes.data ?? []) as (RotationQueueEntry & { tenant_user: TenantUser })[]
  const vendedores = (vendedoresRes.data ?? []) as TenantUser[]

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" />
          Configurações
        </h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie as configurações da sua conta</p>
      </div>

      <AccountSettings
        tenantId={tenant.id}
        initialName={tenant.name}
        initialLogoUrl={tenant.logo_url ?? ''}
        isAdmin
      />

      <RotationSettings
        tenantId={tenant.id}
        initialEnabled={tenant.rotation_enabled ?? false}
        initialQueue={rotationQueue}
        initialLastUserId={tenant.rotation_last_user_id ?? null}
        vendedores={vendedores}
      />

      <PipelineStagesSettings
        tenantId={tenant.id}
        initialStages={stages}
        isAdmin
      />

      <LossReasonsSettings
        tenantId={tenant.id}
        initialReasons={lossReasons}
        isAdmin
      />
    </div>
  )
}
