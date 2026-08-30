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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, role, phone, address, zip } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const validRoles = ['customer', 'admin', 'system_admin', 'staff']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // 1. Fetch current user state
    const { data: currentUser, error: fetchErr } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updatePayload: Record<string, any> = {
      name: name.trim(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      zip: (zip || '').trim(),
    }

    if (role) {
      updatePayload.role = role
    }

    // 2. Update in User table
    const { data: updatedUser, error: updateErr } = await supabase
      .from('User')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // 3. Update Supabase Auth metadata if authId is present
    if (currentUser.authId) {
      try {
        await supabase.auth.admin.updateUserById(currentUser.authId, {
          user_metadata: { name: name.trim(), role: role || currentUser.role },
        })
      } catch {
        // Non-blocking
      }
    }

    // 4. Log to SystemAuditLog
    try {
      const adminUser = authCheck.profile || authCheck.user
      await supabase.from('SystemAuditLog').insert({
        category: 'security',
        action: role && role !== currentUser.role ? 'USER_ROLE_CHANGED' : 'USER_PROFILE_UPDATED',
        entityType: 'User',
        entityId: id,
        actorName: adminUser?.name || 'System Admin',
        actorEmail: adminUser?.email || 'admin@freshcart.ph',
        actorRole: adminUser?.role || 'admin',
        details: `Updated details for user "${currentUser.name || currentUser.email}" (Role: ${role || currentUser.role})`,
        previousState: { name: currentUser.name, role: currentUser.role, phone: currentUser.phone },
        newState: updatePayload,
        status: 'success',
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User details updated successfully!',
    })
  } catch (err: any) {
    console.error('[API /api/admin/users/[id] PATCH] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const { id } = await context.params
    const supabase = getAdminClient()
    const adminUser = authCheck.profile || authCheck.user

    // 1. Fetch user to delete
    const { data: targetUser, error: fetchErr } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Prevent self-deletion
    const isSelf =
      targetUser.id === adminUser?.id ||
      (targetUser.email && targetUser.email.toLowerCase() === adminUser?.email?.toLowerCase()) ||
      (targetUser.authId && targetUser.authId === authCheck.user?.id)

    if (isSelf) {
      return NextResponse.json(
        { error: 'Action blocked: You cannot delete your own active administrator account.' },
        { status: 400 }
      )
    }

    // 3. Delete from User table
    const { error: deleteErr } = await supabase
      .from('User')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    // 4. Also delete from Supabase Auth if authId exists
    if (targetUser.authId) {
      try {
        await supabase.auth.admin.deleteUser(targetUser.authId)
      } catch {
        // Non-blocking
      }
    }

    // 5. Log to SystemAuditLog
    try {
      await supabase.from('SystemAuditLog').insert({
        category: 'security',
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: id,
        actorName: adminUser?.name || 'System Admin',
        actorEmail: adminUser?.email || 'admin@freshcart.ph',
        actorRole: adminUser?.role || 'admin',
        details: `Deleted user account "${targetUser.name || targetUser.email}" (${targetUser.email})`,
        previousState: targetUser,
        newState: { deleted: true },
        status: 'danger',
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `User account "${targetUser.name || targetUser.email}" was successfully deleted.`,
    })
  } catch (err: any) {
    console.error('[API /api/admin/users/[id] DELETE] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
