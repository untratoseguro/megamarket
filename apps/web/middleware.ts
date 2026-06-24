import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            )
          },
        },
      },
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  } catch {
    // Si Supabase falla, dejar pasar la request sin bloquear páginas públicas.
    // Solo /admin queda sin protección temporal, pero el layout de admin
    // tiene su propia verificación server-side como fallback.
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
