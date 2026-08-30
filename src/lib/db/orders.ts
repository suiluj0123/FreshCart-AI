import { createClient } from '@supabase/supabase-js'
import type { CreateOrderPayload } from '@/types/cart'
import { cache } from '@/lib/cache'

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

  // 1. Pre-validate stock availability for all items
  for (const item of payload.items) {
    const { data: batches } = await supabase
      .from('InventoryBatch')
      .select('id, quantity')
      .eq('productId', item.productId)
      .gt('quantity', 0)

    const totalAvailable = (batches ?? []).reduce((sum, b) => sum + Number(b.quantity), 0)
    if (totalAvailable < item.quantity) {
      const { data: prod } = await supabase
        .from('Product')
        .select('name')
        .eq('id', item.productId)
        .maybeSingle()

      const prodName = prod?.name || 'Selected grocery item'
      throw new Error(
        totalAvailable === 0
          ? `Sorry, "${prodName}" is currently out of stock.`
          : `Sorry, only ${totalAvailable} unit(s) of "${prodName}" remain in stock. Please adjust your cart quantity.`
      )
    }
  }

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
    paymentMethod: payload.paymentMethod || 'cash',
    total: payload.total,
    deliveryZip: payload.deliveryZip ? payload.deliveryZip.trim().slice(0, 20) : null,
    status: 'placed',
  }

  if (orderUserId) {
    orderInsertData.userId = orderUserId

    // Save and sync customer details to User profile for future checkouts
    if (payload.customerDetails) {
      await supabase
        .from('User')
        .update({
          name: payload.customerDetails.fullName.trim(),
          phone: payload.customerDetails.phone.trim(),
          address: payload.customerDetails.address.trim(),
          zip: payload.deliveryZip ? payload.deliveryZip.trim() : null,
        })
        .eq('id', orderUserId)
    }
  }

  let orderRes = await supabase
    .from('Order')
    .insert(orderInsertData)
    .select('id, status, total, createdAt')
    .single()

  // If column doesn't exist yet, retry without paymentMethod
  if (orderRes.error && orderRes.error.message?.includes('paymentMethod')) {
    delete orderInsertData.paymentMethod
    orderRes = await supabase
      .from('Order')
      .insert(orderInsertData)
      .select('id, status, total, createdAt')
      .single()
  }

  const { data: order, error: orderError } = orderRes

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

  // Invalidate product catalog cache so live stock updates immediately
  cache.clear()

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

  // Auto-progression calculation based on elapsed seconds if active
  if (order.status !== 'cancelled' && order.status !== 'completed') {
    const elapsedSeconds = (Date.now() - new Date(order.createdAt).getTime()) / 1000
    let targetStatus = order.status

    if (elapsedSeconds > 300) {
      targetStatus = 'completed'
    } else if (elapsedSeconds > 180) {
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

  const { data: rawItems } = await supabase
    .from('OrderItem')
    .select('id, productId, quantity, priceAtOrder, wasSubstituted, Product(id, name, unit, imageUrl, category)')
    .eq('orderId', orderId)

  let items: any[] = rawItems ?? []

  // Fallback: If Product relation missing on any item, fetch products explicitly
  if (items.some((item) => !item.Product)) {
    const productIds = items.map((i) => i.productId).filter(Boolean)
    if (productIds.length > 0) {
      const { data: products } = await supabase
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

  let userDetails: { name: string; email: string; address?: string; phone?: string } | null = null
  if (order.userId) {
    const { data: user } = await supabase
      .from('User')
      .select('name, email, phone, address, zip')
      .eq('id', order.userId)
      .single()
    if (user) {
      userDetails = {
        name: user.name ?? '',
        email: user.email,
        address: (user as any).address || user.zip || '',
        phone: (user as any).phone || '',
      }
    }
  }

  return {
    ...order,
    items,
    user: userDetails,
  }
}

export async function getOrdersByUserId(userId: string, alternateIds: string[] = []) {
  const supabase = getAdminClient()

  const allUserIds = Array.from(new Set([userId, ...alternateIds].filter(Boolean)))

  const { data: orders } = await supabase
    .from('Order')
    .select('id, userId, status, fulfillmentType, total, deliveryZip, createdAt')
    .in('userId', allUserIds)
    .order('createdAt', { ascending: false })

  if (!orders || orders.length === 0) return []

  const orderIds = orders.map((o) => o.id)

  const { data: rawItems } = await supabase
    .from('OrderItem')
    .select('id, orderId, productId, quantity, priceAtOrder, wasSubstituted, Product(id, name, unit, imageUrl, category)')
    .in('orderId', orderIds)

  let items: any[] = rawItems ?? []

  if (items.some((item) => !item.Product)) {
    const productIds = items.map((i) => i.productId).filter(Boolean)
    if (productIds.length > 0) {
      const { data: products } = await supabase
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

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) || [],
  }))
}
