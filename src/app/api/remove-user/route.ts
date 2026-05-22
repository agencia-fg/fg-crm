import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { userId, tenantId } = await req.json()

  if (!userId || !tenantId) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // 1. Verifica se o chamador é admin
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (caller.id === userId) {
    return NextResponse.json({ error: 'Você não pode remover a si mesmo' }, { status: 400 })
  }

  const { data: callerTU } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', caller.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!callerTU || callerTU.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem remover usuários' }, { status: 403 })
  }

  // 2. Não permite remover o último admin
  const { count: adminCount } = await supabase
    .from('tenant_users')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')

  const { data: targetTU } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (targetTU?.role === 'admin' && (adminCount ?? 0) <= 1) {
    return NextResponse.json({ error: 'Não é possível remover o único admin' }, { status: 400 })
  }

  // 3. Remove do tenant (revoga acesso sem deletar o usuário do auth)
  const service = await createServiceClient()
  const { error } = await service
    .from('tenant_users')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
