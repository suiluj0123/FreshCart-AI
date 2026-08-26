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

export async function GET() {
  try {
    const supabase = getAdminClient()

    // Query all orders with user and items info
    const { data: rawOrders, error: ordersErr } = await supabase
      .from('Order')
      .select(`
        id,
        userId,
        status,
        fulfillmentType,
        total,
        deliveryZip,
        createdAt,
        User:userId (
          id,
          name,
          email,
          address,
          phone,
          zip
        )
      `)
      .order('createdAt', { ascending: false })

    // Auto-progress active orders based on elapsed time if not cancelled
    const ordersToUpdate: { id: string; status: string }[] = []
    const syncedRawOrders = (rawOrders ?? []).map((order) => {
      let currentStatus = order.status
      if (currentStatus !== 'completed' && currentStatus !== 'cancelled') {
        const elapsedSeconds = (Date.now() - new Date(order.createdAt).getTime()) / 1000
        if (elapsedSeconds > 300) {
          currentStatus = 'completed'
        } else if (elapsedSeconds > 180) {
          currentStatus = order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'ready_pickup'
        } else if (elapsedSeconds > 60) {
          currentStatus = 'packed'
        }

        if (currentStatus !== order.status) {
          ordersToUpdate.push({ id: order.id, status: currentStatus })
        }
      }

      return {
        ...order,
        status: currentStatus,
      }
    })

    if (ordersToUpdate.length > 0) {
      for (const item of ordersToUpdate) {
        await supabase
          .from('Order')
          .update({ status: item.status })
          .eq('id', item.id)
      }
    }

    // Also fetch items for all orders
    const orderIds = syncedRawOrders.map((o) => o.id)
    let itemsByOrder: Record<string, any[]> = {}

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('OrderItem')
        .select(`
          id,
          orderId,
          productId,
          quantity,
          priceAtOrder,
          wasSubstituted,
          Product:productId (
            name,
            category,
            unit
          )
        `)
        .in('orderId', orderIds)

      if (items) {
        for (const it of items) {
          if (!itemsByOrder[it.orderId]) {
            itemsByOrder[it.orderId] = []
          }
          itemsByOrder[it.orderId].push(it)
        }
      }
    }

    const orders = syncedRawOrders.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    }))

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}