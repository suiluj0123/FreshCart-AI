import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/rbac'
import { resetLoginLockout } from '@/lib/auth/rate-limiter'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin()
    const { id } = await context.params
    const supabase = getAdminClient()
    const adminUser = authCheck.profile || authCheck.user

    let targetEmail = ''
    let targetName = 'User'

    if (id.startsWith('virtual_')) {
      targetEmail = id.replace('virtual_', '')
      targetName = targetEmail.split('@')[0]
    } else {
      // 1. Fetch user by ID from DB
      const { data: targetUser, error: fetchErr } = await supabase
        .from('User')
        .select('id, name, email, role')
        .eq('id', id)
        .maybeSingle()

      if (fetchErr || !targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      targetEmail = targetUser.email
      targetName = targetUser.name || targetEmail
    }

    // 2. Unlock account in rate limiter store
    resetLoginLockout(targetEmail)

    // 3. Insert Unlocked event into UserLoginLog
    try {
      await supabase.from('UserLoginLog').insert({
        userEmail: targetEmail.toLowerCase().trim(),
        userName: targetName,
        eventType: 'Account Unlocked by Administrator',
        status: 'success',
        device: 'Admin Console',
        ipAddress: '127.0.0.1 (Admin Security)',
        metadata: {
          unlockedBy: adminUser?.email || 'admin@freshcart.ph',
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      })
    } catch {
      // Non-blocking
    }

    // 4. Log to SystemAuditLog
    try {
      await supabase.from('SystemAuditLog').insert({
        category: 'security',
        action: 'USER_ACCOUNT_UNLOCKED',
        entityType: 'User',
        entityId: id,
        actorName: adminUser?.name || 'System Admin',
        actorEmail: adminUser?.email || 'admin@freshcart.ph',
        actorRole: adminUser?.role || 'admin',
        details: `Unlocked rate-limited account for user "${targetName}" (${targetEmail})`,
        previousState: { isLocked: true },
        newState: { isLocked: false, failedAttempts: 0 },
        status: 'success',
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Account for ${targetName} (${targetEmail}) has been unlocked successfully!`,
    })
  } catch (err: any) {
    console.error('[API /api/admin/users/[id]/unlock] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
