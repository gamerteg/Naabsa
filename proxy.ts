// proxy.ts replaces middleware.ts in Next.js 16.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoginPage = pathname.startsWith('/login')
  const isChangePasswordPage = pathname.startsWith('/change-password')

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (isLoginPage) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active, must_change_password')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    if (isLoginPage) return supabaseResponse
    return NextResponse.redirect(new URL('/login?error=profile', request.url))
  }

  if (!profile.is_active) {
    if (isLoginPage) return supabaseResponse
    return NextResponse.redirect(new URL('/login?error=inactive', request.url))
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (profile.must_change_password && !isChangePasswordPage) {
    return NextResponse.redirect(new URL('/change-password', request.url))
  }

  if (!profile.must_change_password && isChangePasswordPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname.startsWith('/dashboard/gestor') && profile.role !== 'gestor') {
    return NextResponse.redirect(new URL('/dashboard/colaborador', request.url))
  }

  if (pathname.startsWith('/dashboard/colaborador') && profile.role !== 'colaborador') {
    return NextResponse.redirect(new URL('/dashboard/gestor', request.url))
  }

  if (/^\/reports\/[^/]+\/review$/.test(pathname) && profile.role !== 'gestor') {
    return NextResponse.redirect(new URL('/dashboard/colaborador', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/.*).*)'],
}
