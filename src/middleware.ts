import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/auth/middleware'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const url = request.nextUrl.clone()
  const isAdminPath = url.pathname.startsWith('/admin')
  const isAccountPath = url.pathname.startsWith('/account')

  if (isAdminPath) {
    if (!user) {
      url.pathname = '/login'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const isValidKey = supabaseServiceKey && (supabaseServiceKey.startsWith('sb_') || supabaseServiceKey.startsWith('eyJ'))
    if (isValidKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      const { data: profile } = await supabaseAdmin
        .from('User')
        .select('role')
        .eq('authId', user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    } else {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  if (isAccountPath) {
    if (!user) {
      url.pathname = '/login'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [

    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
