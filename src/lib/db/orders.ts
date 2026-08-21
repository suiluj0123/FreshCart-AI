import { createClient } from '@supabase/supabase-js'
import type { CreateOrderPayload } from '@/types/cart'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('[orders] Missing NEXT_PUBLIC_SUPABASE_URL env var.')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    },
  })
}

export async function createOrderInDb(payload: CreateOrderPayload) {
  const supabase = getAdminClient()

  let orderUserId: string | null = payload.userId || null

  if (!orderUserId && payload.customerDetails?.email) {
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('email', payload.customerDetails.email.trim())
      .maybeSingle()

    if (existingUser) {
      orderUserId = existingUser.id
    }
  }

  const orderInsertData: any = {
    fulfillmentType: payload.fulfillmentType,
    total: payload.total,
    deliveryZip: payload.deliveryZip || null,
    status: 'placed',
  }

  if (orderUserId) {
    orderInsertData.userId = orderUserId
  }

  const { data: order, error: orderError } = await supabase
    .from('Order')
    .insert(orderInsertData)
    .select('id, status, total, createdAt')
    .single()

  if (orderError || !order) {
    console.error('[createOrderInDb] Order insert error:', orderError?.message)
    throw new Error('Failed to place order: ' + (orderError?.message || 'Database error'))
  }

  const orderItemsData = payload.items.map((item) => ({
    orderId: order.id,
    productId: item.productId,
    quantity: item.quantity,
    priceAtOrder: item.priceAtOrder,
    wasSubstituted: false,
  }))

  const { error: itemsError } = await supabase
    .from('OrderItem')
    .insert(orderItemsData)

  if (itemsError) {
    console.error('[createOrderInDb] OrderItem insert error:', itemsError?.message)
  }

  for (const item of payload.items) {
    const { data: batches } = await supabase
      .from('InventoryBatch')
      .select('id, quantity')
      .eq('productId', item.productId)
      .gt('quantity', 0)
      .order('expiryDate', { ascending: true })

    if (batches && batches.length > 0) {
      let remainingToDeduct = item.quantity

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break

        const deduct = Math.min(batch.quantity, remainingToDeduct)
        const newQty = batch.quantity - deduct

        await supabase
          .from('InventoryBatch')
          .update({ quantity: newQty })
          .eq('id', batch.id)

        remainingToDeduct -= deduct
      }
    }
  }

  return {
    orderId: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
  }
}

/**
 * Fetch full order details & auto-advance status based on elapsed time for realistic testing
 */
export async function getOrderById(orderId: string) {
  const supabase = getAdminClient()

  const { data: order, error: orderErr } = await supabase
    .from('Order')
    .select('id, userId, status, fulfillmentType, total, deliveryZip, createdAt')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) return null

  // Auto-progression calculation based on elapsed seconds
  const elapsedSeconds = (Date.now() - new Date(order.createdAt).getTime()) / 1000
  let targetStatus = order.status

  if (order.status !== 'completed') {
    if (elapsedSeconds > 300) {
      targetStatus = 'completed'
    } else if (elapsedSeconds > 120) {
      targetStatus = order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'ready_pickup'
    } else if (elapsedSeconds > 60) {
      targetStatus = 'packed'
    }

    if (targetStatus !== order.status) {
      await supabase
        .from('Order')
        .update({ status: targetStatus })
        .eq('id', orderId)
      order.status = targetStatus
    }
  }

  const { data: items } = await supabase
    .from('OrderItem')
    .select('id, productId, quantity, priceAtOrder, wasSubstituted, Product(id, name, unit, imageUrl, category)')
    .eq('orderId', orderId)

  let userDetails: { name: string; email: string } | null = null
  if (order.userId) {
    const { data: user } = await supabase
      .from('User')
      .select('name, email')
      .eq('id', order.userId)
      .single()
    if (user) {
      userDetails = { name: user.name ?? '', email: user.email }
    }
  }

  return {
    ...order,
    items: items ?? [],
    user: userDetails,
  }
}

export async function getOrdersByUserId(userId: string) {
  const supabase = getAdminClient()

  const { data: orders } = await supabase
    .from('Order')
    .select('id, status, fulfillmentType, total, deliveryZip, createdAt')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })

  return orders ?? []
}