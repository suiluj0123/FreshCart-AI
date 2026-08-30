import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/rbac'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

export async function GET() {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const supabase = getAdminClient()
    const user = authCheck.user
    const email = user.email || ''

    const { data: profile } = await supabase
      .from('User')
      .select('id, name, email, role, phone, address, zip, createdAt')
      .or(`authId.eq.${user.id},email.eq.${email}`)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      profile: profile || {
        name: user.user_metadata?.name || email.split('@')[0] || 'Administrator',
        email,
        role: 'admin',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const body = await req.json()
    const { name, phone } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const trimmedName = name.trim()
    const trimmedPhone = (phone || '').trim()
    const supabase = getAdminClient()
    const user = authCheck.user
    const email = user.email || ''

    // Update in User table
    const { data: updatedProfile, error: updateErr } = await supabase
      .from('User')
      .update({
        name: trimmedName,
        phone: trimmedPhone,
      })
      .or(`authId.eq.${user.id},email.eq.${email}`)
      .select()
      .maybeSingle()

    if (updateErr) {
      console.warn('[Profile Update Warning]:', updateErr.message)
    }

    // Update Supabase Auth metadata
    try {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { name: trimmedName },
      })
    } catch {
      // Non-blocking
    }

    // Log to SystemAuditLog
    try {
      await supabase.from('SystemAuditLog').insert({
        category: 'system',
        action: 'ADMIN_PROFILE_UPDATED',
        entityType: 'User',
        entityId: user.id,
        actorName: trimmedName,
        actorEmail: email,
        actorRole: authCheck.profile?.role || 'admin',
        details: `Administrator updated profile name to "${trimmedName}"`,
        newState: { name: trimmedName, phone: trimmedPhone },
        status: 'success',
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile || { name: trimmedName, email, phone: trimmedPhone },
      message: 'Profile updated successfully!',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
