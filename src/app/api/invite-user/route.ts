import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PLAN_USER_LIMITS: Record<string, number> = {
  trial: 3,
  starter: 3,
  pro: 10,
}

export async function POST(req: NextRequest) {
  const { email, name, role, tenantId, tenantSlug, plan } = await req.json()

  if (!email || !name || !tenantId || !tenantSlug) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // 1. Verifica se o usuário chamador é admin do tenant
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: callerTU } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', caller.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!callerTU || callerTU.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem convidar usuários' }, { status: 403 })
  }

  // 2. Verifica limite do plano
  const { count } = await supabase
    .from('tenant_users')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const limit = PLAN_USER_LIMITS[plan] ?? 3
  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Limite de ${limit} usuários atingido para o plano ${plan}. Faça upgrade para adicionar mais.` },
      { status: 400 }
    )
  }

  // 3. Verifica se email já está no tenant
  const { data: existingTU } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existingTU) {
    return NextResponse.json({ error: 'Este e-mail já está cadastrado nesta conta' }, { status: 400 })
  }

  // 4. Convida via service role
  const service = await createServiceClient()
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'agenciafg.com.br'
  const redirectTo = `https://${tenantSlug}.${appDomain}/dashboard`

  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    { redirectTo, data: { name } }
  )

  if (inviteError) {
    // Usuário já existe no auth mas não no tenant — ainda criamos o tenant_users
    if (!inviteError.message.includes('already been registered')) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }
    // Busca o user_id existente
    const { data: existingUsers } = await service.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email.trim().toLowerCase())
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário já cadastrado em outro sistema' }, { status: 400 })
    }

    await service.from('tenant_users').upsert({
      tenant_id: tenantId,
      user_id: existingUser.id,
      role: role || 'vendedor',
      name,
      email: email.trim().toLowerCase(),
    }, { onConflict: 'tenant_id,user_id' })

    return NextResponse.json({ success: true, note: 'Usuário já existia, acesso concedido' })
  }

  // 5. Cria o tenant_users
  const { error: tuError } = await service.from('tenant_users').insert({
    tenant_id: tenantId,
    user_id: invited.user.id,
    role: role || 'vendedor',
    name,
    email: email.trim().toLowerCase(),
  })

  if (tuError) {
    return NextResponse.json({ error: 'Convite enviado mas erro ao criar perfil: ' + tuError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
