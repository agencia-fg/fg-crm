import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const host = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

  let tenantSlug: string | null = null
  if (host !== rootDomain && host !== `www.${rootDomain}`) {
    const parts = host.split('.')
    if (parts[0] !== 'crm' && parts[0] !== 'www') {
      tenantSlug = parts[0]
    }
  }

  // Injeta tenant no REQUEST para Server Components lerem via headers()
  const requestHeaders = new Headers(request.headers)
  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug)
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // Atualiza cookies no objeto request
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Propaga os cookies renovados para requestHeaders, para que os
          // Server Components vejam o token atualizado via cookies() do next/headers
          requestHeaders.set(
            'cookie',
            request.cookies.getAll().map(({ name, value }) => `${name}=${value}`).join('; ')
          )
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          // Envia os cookies renovados para o browser também
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (tenantSlug) {
    const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/convite')
    const isApiRoute = url.pathname.startsWith('/api/')

    if (!user && !isAuthRoute && !isApiRoute) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  if (!tenantSlug && url.pathname === '/' && !user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
