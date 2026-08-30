import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/rbac'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { status } = body

    const validStatuses = ['placed', 'packed', 'out_for_delivery', 'ready_pickup', 'completed', 'cancelled']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('Order')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Log to SystemAuditLog
    try {
      await supabase.from('SystemAuditLog').insert({
        category: 'orders',
        action: 'ORDER_STATUS_CHANGED',
        entityType: 'Order',
        entityId: id,
        actorName: authCheck.profile?.name || authCheck.user?.email?.split('@')[0] || 'Admin',
        actorEmail: authCheck.profile?.email || authCheck.user?.email || 'admin@freshcart.ph',
        actorRole: authCheck.profile?.role || 'admin',
        details: `Order #${id.slice(0, 8)} status changed to ${status}`,
        newState: { status },
        status: status === 'cancelled' ? 'danger' : status === 'completed' ? 'success' : 'info',
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order #${id.slice(0, 8)} status updated to ${status}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}