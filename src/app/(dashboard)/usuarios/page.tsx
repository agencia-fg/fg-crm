import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug, getCurrentTenantUser } from '@/lib/tenant'
import { UsersSection } from '@/components/usuarios/users-section'
import { TenantUser, Plan } from '@/types'

export default async function UsuariosPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')!
  const supabase = await createClient()

  const [tenant, currentUser] = await Promise.all([
    getTenantBySlug(tenantSlug),
    getCurrentTenantUser(),
  ])

  if (!tenant || !currentUser) redirect('/login')

  const { data: usersData } = await supabase
    .from('tenant_users')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at')

  const users = (usersData ?? []) as TenantUser[]

  return (
    <UsersSection
      initialUsers={users}
      currentUserId={currentUser.user_id}
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      plan={tenant.plan as Plan}
      isAdmin={currentUser.role === 'admin'}
    />
  )
}
