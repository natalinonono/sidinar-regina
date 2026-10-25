import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
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

  const pathname = request.nextUrl.pathname

  // Public paths allowed without auth
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/'
  const isApiRoute = pathname.startsWith('/api')

  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in, check role for routing
  if (user && isAuthRoute && pathname !== '/') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if ((profile as any)?.role === 'pengurus') {
      url.pathname = '/pengurus'
    } else {
      url.pathname = '/anggota'
    }
    return NextResponse.redirect(url)
  }

  // Pengurus route restriction
  if (user && pathname.startsWith('/pengurus')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as any)?.role !== 'pengurus') {
      const url = request.nextUrl.clone()
      url.pathname = '/anggota'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
