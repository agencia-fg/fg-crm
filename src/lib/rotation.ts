import { createClient } from './supabase/server'

/**
 * Retorna o próximo tenant_users.id na fila de rodízio E avança a posição.
 * Retorna null se rodízio desativado ou fila vazia.
 */
export async function assignNextInRotation(tenantId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('rotation_enabled, rotation_last_user_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.rotation_enabled) return null

  const { data: queue } = await supabase
    .from('rotation_queue')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('position')

  if (!queue || queue.length === 0) return null

  const lastIdx = queue.findIndex(q => q.tenant_user_id === tenant.rotation_last_user_id)
  const nextIdx = (lastIdx + 1) % queue.length
  const next = queue[nextIdx]

  // Avança a fila
  await supabase
    .from('tenants')
    .update({ rotation_last_user_id: next.tenant_user_id })
    .eq('id', tenantId)

  return next.tenant_user_id
}

/**
 * Retorna o próximo da fila SEM avançar — usado para preview na UI.
 */
export async function peekNextInRotation(
  tenantId: string
): Promise<{ tenantUserId: string; name: string } | null> {
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('rotation_enabled, rotation_last_user_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.rotation_enabled) return null

  const { data: queue } = await supabase
    .from('rotation_queue')
    .select('*, tenant_user:tenant_user_id(id, name)')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('position')

  if (!queue || queue.length === 0) return null

  const lastIdx = queue.findIndex(q => q.tenant_user_id === tenant.rotation_last_user_id)
  const nextIdx = (lastIdx + 1) % queue.length
  const next = queue[nextIdx] as any

  return {
    tenantUserId: next.tenant_user_id,
    name: next.tenant_user?.name ?? 'Vendedor',
  }
}
