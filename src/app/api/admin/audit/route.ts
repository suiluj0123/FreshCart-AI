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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || 'all'
    const status = searchParams.get('status') || 'all'
    const range = searchParams.get('range') || 'all'
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const search = (searchParams.get('search') || '').toLowerCase().trim()

    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    if (range === 'custom' && fromParam) {
      startDate = new Date(fromParam)
      startDate.setHours(0, 0, 0, 0)
      if (toParam) {
        endDate = new Date(toParam)
        endDate.setHours(23, 59, 59, 999)
      }
    } else if (range === 'today') {
      startDate.setHours(0, 0, 0, 0)
    } else if (range === '7d') {
      startDate.setDate(now.getDate() - 7)
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30)
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (range === 'all') {
      startDate = new Date(2025, 0, 1)
    } else {
      startDate.setDate(now.getDate() - 30)
    }

    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    const supabase = getAdminClient()

    // 1. Fetch SystemAuditLog records
    let systemLogs: any[] = []
    try {
      const { data } = await supabase
        .from('SystemAuditLog')
        .select('*')
        .gte('createdAt', startIso)
        .lte('createdAt', endIso)
        .order('createdAt', { ascending: false })
      systemLogs = data ?? []
    } catch {
      // Fallback
    }

    // 2. Fetch UserLoginLog records (Security Category)
    let loginLogs: any[] = []
    try {
      const { data } = await supabase
        .from('UserLoginLog')
        .select('*')
        .gte('createdAt', startIso)
        .lte('createdAt', endIso)
        .order('createdAt', { ascending: false })
      loginLogs = data ?? []
    } catch {
      // Fallback
    }

    // 3. Fetch SpoilageLog records (Spoilage & Wastage Category)
    let spoilageLogs: any[] = []
    try {
      const { data } = await supabase
        .from('SpoilageLog')
        .select('*, Product(name, category)')
        .gte('createdAt', startIso)
        .lte('createdAt', endIso)
        .order('createdAt', { ascending: false })
      spoilageLogs = data ?? []
    } catch {
      // Fallback
    }

    // 4. Fetch Order records (Orders & Fulfillment Category)
    let orders: any[] = []
    try {
      const { data } = await supabase
        .from('Order')
        .select('id, total, status, fulfillmentType, paymentMethod, createdAt, updatedAt, User(name, email, role)')
        .gte('createdAt', startIso)
        .lte('createdAt', endIso)
        .order('createdAt', { ascending: false })
      orders = data ?? []
    } catch {
      // Fallback
    }

    // 5. Fetch Inventory Batches (Inventory Category)
    let batches: any[] = []
    try {
      const { data } = await supabase
        .from('InventoryBatch')
        .select('id, productId, quantity, costPrice, expiryDate, createdAt, Product(name, category)')
        .gte('createdAt', startIso)
        .lte('createdAt', endIso)
        .order('createdAt', { ascending: false })
      batches = data ?? []
    } catch {
      // Fallback
    }

    // Unified Event Stream Construction
    const unifiedEvents: any[] = []

    // Map System Audit Logs
    for (const log of systemLogs) {
      unifiedEvents.push({
        id: log.id,
        category: log.category || 'system',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorName: log.actorName || 'System',
        actorEmail: log.actorEmail,
        actorRole: log.actorRole || 'admin',
        details: log.details,
        previousState: log.previousState,
        newState: log.newState,
        ipAddress: log.ipAddress || '127.0.0.1',
        device: log.device || 'Web Client',
        status: log.status || 'success',
        createdAt: log.createdAt,
      })
    }

    // Map Security / Login Logs
    for (const l of loginLogs) {
      unifiedEvents.push({
        id: l.id,
        category: 'security',
        action: l.eventType?.toUpperCase().replace(/\s+/g, '_') || 'USER_AUTH_EVENT',
        entityType: 'User',
        entityId: l.userId || l.userEmail,
        actorName: l.userName || (l.userEmail ? l.userEmail.split('@')[0] : 'User'),
        actorEmail: l.userEmail,
        actorRole: l.role || 'customer',
        details: `${l.eventType} (${l.role || 'customer'}) via ${l.device || 'Web Client'}`,
        previousState: null,
        newState: { status: l.status, ip: l.ipAddress, device: l.device },
        ipAddress: l.ipAddress || '120.29.114.82 (Philippines)',
        device: l.device || 'Web Client',
        status: l.status || 'success',
        createdAt: l.createdAt,
      })
    }

    // Map Spoilage Logs
    for (const sp of spoilageLogs) {
      const prodName = (sp as any).Product?.name || 'Perishable Grocery'
      unifiedEvents.push({
        id: sp.id,
        category: 'spoilage',
        action: 'FOOD_DISCARD_RECORDED',
        entityType: 'Product',
        entityId: sp.productId,
        actorName: sp.discardedBy || 'Staff Member',
        actorEmail: 'admin@freshcart.ph',
        actorRole: 'staff',
        details: `Discarded ${sp.quantity} units of "${prodName}" due to ${sp.reason} (Loss: ₱${Number(sp.totalLossValuation || 0).toFixed(2)})`,
        previousState: null,
        newState: { quantity: sp.quantity, reason: sp.reason, lossValuation: sp.totalLossValuation },
        ipAddress: '127.0.0.1 (Warehouse)',
        device: 'Admin Portal',
        status: 'danger',
        createdAt: sp.createdAt,
      })
    }

    // Map Orders
    for (const o of orders) {
      const customerName = (o as any).User?.name || 'Customer'
      const customerEmail = (o as any).User?.email || 'customer@freshcart.ph'
      const isCompleted = o.status === 'completed'
      const isCancelled = o.status === 'cancelled'
      const shortId = o.id.slice(0, 8)

      unifiedEvents.push({
        id: `ord_evt_${o.id}`,
        category: 'orders',
        action: `ORDER_${(o.status || 'CREATED').toUpperCase()}`,
        entityType: 'Order',
        entityId: o.id,
        actorName: customerName,
        actorEmail: customerEmail,
        actorRole: (o as any).User?.role || 'customer',
        details: `Order #${shortId} (${o.fulfillmentType === 'pickup' ? 'In-Store Pickup' : 'Home Delivery'}) for ₱${Number(o.total || 0).toFixed(2)} marked as ${o.status}`,
        previousState: null,
        newState: { total: o.total, status: o.status, fulfillment: o.fulfillmentType, payment: o.paymentMethod },
        ipAddress: '120.29.114.82 (Storefront)',
        device: 'Online Checkout',
        status: isCancelled ? 'danger' : isCompleted ? 'success' : 'info',
        createdAt: o.createdAt,
      })
    }

    // Map Inventory Batches
    for (const b of batches) {
      const prodName = (b as any).Product?.name || 'Grocery Product'
      unifiedEvents.push({
        id: `batch_evt_${b.id}`,
        category: 'inventory',
        action: 'INVENTORY_BATCH_RECEIVED',
        entityType: 'InventoryBatch',
        entityId: b.id,
        actorName: 'Inventory Admin',
        actorEmail: 'admin@freshcart.ph',
        actorRole: 'admin',
        details: `Received batch of ${b.quantity} units for "${prodName}" @ ₱${Number(b.costPrice || 0).toFixed(2)} cost (Expires: ${new Date(b.expiryDate).toLocaleDateString('en-PH')})`,
        previousState: null,
        newState: { quantity: b.quantity, costPrice: b.costPrice, expiryDate: b.expiryDate },
        ipAddress: '127.0.0.1 (Admin Console)',
        device: 'Admin Portal',
        status: 'success',
        createdAt: b.createdAt,
      })
    }

    // Sort all events by createdAt DESC
    unifiedEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Filter events
    const filteredEvents = unifiedEvents.filter((evt) => {
      const matchesCategory = category === 'all' || evt.category === category
      const matchesStatus = status === 'all' || evt.status === status
      const matchesSearch =
        search === '' ||
        evt.details.toLowerCase().includes(search) ||
        evt.action.toLowerCase().includes(search) ||
        evt.actorName.toLowerCase().includes(search) ||
        (evt.actorEmail && evt.actorEmail.toLowerCase().includes(search)) ||
        (evt.entityId && evt.entityId.toLowerCase().includes(search))

      return matchesCategory && matchesStatus && matchesSearch
    })

    // Compute Summary KPIs
    const summary = {
      totalEvents: unifiedEvents.length,
      inventoryEvents: unifiedEvents.filter((e) => e.category === 'inventory').length,
      orderEvents: unifiedEvents.filter((e) => e.category === 'orders').length,
      securityEvents: unifiedEvents.filter((e) => e.category === 'security').length,
      spoilageEvents: unifiedEvents.filter((e) => e.category === 'spoilage').length,
      warningEvents: unifiedEvents.filter((e) => e.status === 'warning' || e.status === 'danger').length,
    }

    return NextResponse.json({
      success: true,
      range,
      startDate: startIso,
      endDate: endIso,
      summary,
      events: filteredEvents,
    })
  } catch (err: any) {
    console.error('[API /api/admin/audit] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const body = await req.json()
    const {
      category = 'system',
      action,
      entityType = 'System',
      entityId,
      details,
      previousState,
      newState,
      status = 'success',
    } = body

    if (!action || !details) {
      return NextResponse.json({ error: 'Action and details are required' }, { status: 400 })
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'

    const supabase = getAdminClient()
    const adminUser = authCheck.profile || authCheck.user

    const newLog = {
      category,
      action,
      entityType,
      entityId: entityId || null,
      actorName: adminUser?.name || 'Admin',
      actorEmail: adminUser?.email || 'admin@freshcart.ph',
      actorRole: adminUser?.role || 'admin',
      details,
      previousState: previousState || {},
      newState: newState || {},
      ipAddress: clientIp,
      device: 'Admin Portal',
      status,
      createdAt: new Date().toISOString(),
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('SystemAuditLog')
      .insert(newLog)
      .select()
      .single()

    if (insertErr) {
      console.warn('[SystemAuditLog Insert Warning]:', insertErr.message)
    }

    return NextResponse.json({ success: true, log: inserted || newLog })
  } catch (err: any) {
    console.error('[API /api/admin/audit POST] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
