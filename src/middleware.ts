import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const host = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

  // Resolve tenant slug from subdomain
  let tenantSlug: string | null = null
  if (host !== rootDomain && host !== `www.${rootDomain}`) {
    const parts = host.split('.')
    // [tenant].agenciafg.com.br → parts[0] = tenant
    // crm.agenciafg.com.br → this is the platform root, no tenant
    if (parts[0] !== 'crm' && parts[0] !== 'www') {
      tenantSlug = parts[0]
    }
  }

  // Supabase session refresh
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // If tenant subdomain, enforce auth
  if (tenantSlug) {
    const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/convite')
    const isApiRoute = url.pathname.startsWith('/api/')

    if (!user && !isAuthRoute && !isApiRoute) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Inject tenant slug for server components via header
    supabaseResponse.headers.set('x-tenant-slug', tenantSlug)
  }

  // Platform root redirect to login if not authed
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
