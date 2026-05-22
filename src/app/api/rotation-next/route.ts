import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assignNextInRotation } from '@/lib/rotation'

// POST /api/rotation-next — avança a fila e retorna o próximo responsável
export async function POST(req: NextRequest) {
  const { tenantId } = await req.json()
  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 })

  // Verifica que o chamador é admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: tu } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!tu || tu.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem usar o rodízio' }, { status: 403 })
  }

  const tenantUserId = await assignNextInRotation(tenantId)
  if (!tenantUserId) {
    return NextResponse.json({ error: 'Rodízio desativado ou fila vazia' }, { status: 400 })
  }

  // Retorna o tenant_user completo para mostrar no form
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('id, name, email')
    .eq('id', tenantUserId)
    .single()

  return NextResponse.json({ tenantUserId, name: tenantUser?.name ?? 'Vendedor' })
}
