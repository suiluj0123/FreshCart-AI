import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
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
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()

    // Primary lookup by authId (Supabase auth UUID)
    let { data: profile } = await admin
      .from('User')
      .select('id, email, authId')
      .eq('authId', authUser.id)
      .maybeSingle()

    // Fallback: look up by email (handles legacy guest authId entries)
    if (!profile && authUser.email) {
      const { data: profileByEmail } = await admin
        .from('User')
        .select('id, email, authId')
        .eq('email', authUser.email)
        .maybeSingle()

      if (profileByEmail) {
        profile = profileByEmail

        // Fix the authId on the User row so future lookups work by UUID
        await admin
          .from('User')
          .update({ authId: authUser.id })
          .eq('id', profileByEmail.id)
      }
    }

    if (!profile) {
      return NextResponse.json({ success: true, orders: [] })
    }

    // Query all orders for this user
    const { data: rawOrders } = await admin
      .from('Order')
      .select('id, userId, status, fulfillmentType, total, deliveryZip, createdAt')
      .eq('userId', profile.id)
      .order('createdAt', { ascending: false })

    let orders = rawOrders ?? []

    // Calculate auto-progression status based on elapsed time if not cancelled
    const ordersToUpdate: { id: string; status: string }[] = []
    orders = orders.map((order) => {
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

    // Sync status updates in background to Supabase DB
    if (ordersToUpdate.length > 0) {
      for (const update of ordersToUpdate) {
        await admin
          .from('Order')
          .update({ status: update.status })
          .eq('id', update.id)
      }
    }

    // Fetch items for each order
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id)

      const { data: rawItems } = await admin
        .from('OrderItem')
        .select('id, orderId, productId, quantity, priceAtOrder, wasSubstituted, Product(id, name, unit, imageUrl, category)')
        .in('orderId', orderIds)

      let items: any[] = rawItems ?? []

      if (items.some((item) => !item.Product)) {
        const productIds = items.map((i) => i.productId).filter(Boolean)
        if (productIds.length > 0) {
          const { data: products } = await admin
            .from('Product')
            .select('id, name, unit, imageUrl, category')
            .in('id', productIds)

          if (products) {
            const prodMap = new Map(products.map((p) => [p.id, p]))
            items = items.map((item) => ({
              ...item,
              Product: item.Product || prodMap.get(item.productId) || null,
            }))
          }
        }
      }

      const itemsByOrder = new Map<string, any[]>()
      for (const item of items) {
        const list = itemsByOrder.get(item.orderId) || []
        list.push(item)
        itemsByOrder.set(item.orderId, list)
      }

      orders = orders.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) || [],
      }))
    }

    return NextResponse.json({ success: true, orders })
  } catch (err: any) {
    console.error('[API /api/orders/user] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}