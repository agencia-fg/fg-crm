import { createClient } from './supabase/server'
import { Tenant, TenantUser } from '@/types'

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

export async function getCurrentTenantUser(): Promise<TenantUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('tenant_users')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return data
}

export function getTenantSlugFromHost(host: string): string | null {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

  if (host === rootDomain || host === `crm.${process.env.NEXT_PUBLIC_APP_DOMAIN}`) {
    return null
  }

  // [tenant].agenciafg.com.br or [tenant].localhost:3000
  const subdomain = host.split('.')[0]
  return subdomain || null
}
