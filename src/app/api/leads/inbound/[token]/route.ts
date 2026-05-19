import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const body = await request.json()
    const supabase = await createServiceClient()

    // Valida token
    const { data: formToken } = await supabase
      .from('form_tokens')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .single()

    if (!formToken) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Mapeia campos do form para o schema de lead
    const mappings = formToken.field_mappings as Record<string, string>
    const leadData: Record<string, string> = {}
    for (const [formField, leadField] of Object.entries(mappings)) {
      if (body[formField]) leadData[leadField] = body[formField]
    }

    // Cria o lead
    const { error } = await supabase.from('leads').insert({
      tenant_id: formToken.tenant_id,
      source: 'site',
      status: 'novo',
      name: leadData.name ?? body.name ?? 'Sem nome',
      email: leadData.email ?? body.email ?? null,
      phone: leadData.phone ?? body.phone ?? null,
      company_name: leadData.company_name ?? body.empresa ?? null,
      message: leadData.message ?? body.mensagem ?? null,
    })

    if (error) {
      console.error('Lead insert error:', error)
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }
}

// CORS para formulários externos
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
