import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug, getCurrentTenantUser } from '@/lib/tenant'
import { AccountSettings } from '@/components/configuracoes/account-settings'
import { PipelineStagesSettings } from '@/components/configuracoes/pipeline-stages-settings'
import { LossReasonsSettings } from '@/components/configuracoes/loss-reasons-settings'
import { PipelineStage, LossReason } from '@/types'
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

  const [stagesRes, lossReasonsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('*').eq('tenant_id', tenant.id).order('position'),
    supabase.from('loss_reasons').select('*').eq('tenant_id', tenant.id).order('position'),
  ])

  const stages = (stagesRes.data ?? []) as PipelineStage[]
  const lossReasons = (lossReasonsRes.data ?? []) as LossReason[]
  const isAdmin = currentUser.role === 'admin'

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
        isAdmin={isAdmin}
      />

      <PipelineStagesSettings
        tenantId={tenant.id}
        initialStages={stages}
        isAdmin={isAdmin}
      />

      <LossReasonsSettings
        tenantId={tenant.id}
        initialReasons={lossReasons}
        isAdmin={isAdmin}
      />
    </div>
  )
}
