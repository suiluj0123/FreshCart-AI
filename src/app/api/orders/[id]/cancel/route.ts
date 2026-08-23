import { NextResponse } from 'next/server'
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const admin = getAdminClient()

    // 1. Fetch order
    const { data: order, error: orderErr } = await admin
      .from('Order')
      .select('id, status, createdAt')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'placed') {
      return NextResponse.json(
        { error: 'Order can only be cancelled while in placed status' },
        { status: 400 }
      )
    }

    // 2. Fetch order items to restore inventory
    const { data: items } = await admin
      .from('OrderItem')
      .select('productId, quantity')
      .eq('orderId', orderId)

    // 3. Restore inventory batches
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: batches } = await admin
          .from('InventoryBatch')
          .select('id, quantity')
          .eq('productId', item.productId)
          .order('receivedAt', { ascending: false })
          .limit(1)

        if (batches && batches.length > 0) {
          await admin
            .from('InventoryBatch')
            .update({ quantity: batches[0].quantity + item.quantity })
            .eq('id', batches[0].id)
        }
      }
    }

    // 4. Update order status to cancelled
    const { error: updateErr } = await admin
      .from('Order')
      .update({ status: 'cancelled' })
      .eq('id', orderId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Order cancelled and stock restored successfully' })
  } catch (err: any) {
    console.error('[API /api/orders/[id]/cancel] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}