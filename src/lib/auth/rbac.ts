import { createClient as createServerClient } from '@/lib/auth/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

export type AdminRole = 'system_admin' | 'admin'

export interface AdminAuthResult {
  authorized: boolean
  user?: any
  profile?: any
  role?: string
  error?: string
}

/**
 * Enforces server-side RBAC: Verifies current session has 'system_admin' or 'admin' role.
 * Call this at the start of any mutating admin API route.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return {
        authorized: false,
        error: 'Unauthorized: Please log in to perform this operation.',
      }
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('User')
      .select('id, email, name, role')
      .or(`authId.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    const rawRole = (profile?.role || user.user_metadata?.role || '').toLowerCase()
    const isAllowed = rawRole === 'system_admin' || rawRole === 'systemadmin' || rawRole === 'admin'

    if (!isAllowed) {
      return {
        authorized: false,
        error: 'Forbidden: Only System Administrators and Admins have permission to modify inventory or orders.',
      }
    }

    return {
      authorized: true,
      user,
      profile,
      role: rawRole,
    }
  } catch (err: any) {
    return {
      authorized: false,
      error: err?.message || 'Authentication check failed.',
    }
  }
}
