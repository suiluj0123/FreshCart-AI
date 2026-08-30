import React from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('[admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

export default async function AdminDashboardPage() {
  const supabase = getAdminClient()

  // 1. Fetch Orders Metrics
  const { data: rawOrders } = await supabase
    .from('Order')
    .select(`
      id,
      total,
      status,
      fulfillmentType,
      paymentMethod,
      deliveryZip,
      createdAt,
      userId,
      User:userId (
        id,
        name,
        email,
        address,
        phone,
        zip
      )
    `)
  // Auto-progress active orders based on elapsed time if not cancelled
  const allOrders = (rawOrders ?? []).map((order) => {
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
    }

    return {
      ...order,
      status: currentStatus,
    }
  })

  const totalRevenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const activeOrders = allOrders.filter(
    (o) => o.status === 'placed' || o.status === 'packed' || o.status === 'out_for_delivery' || o.status === 'ready_pickup'
  )
  const completedOrders = allOrders.filter((o) => o.status === 'completed')
  const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0

  // Payment Breakdown
  const codOrders = allOrders.filter((o) => (o.paymentMethod || '').toLowerCase().includes('cod') || (o.paymentMethod || '').toLowerCase().includes('cash'))
  const codTotal = codOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const digitalOrders = allOrders.filter((o) => !(o.paymentMethod || '').toLowerCase().includes('cod') && !(o.paymentMethod || '').toLowerCase().includes('cash'))
  const digitalTotal = digitalOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  // 2. Fetch Products and Stock Metrics
  const { data: products } = await supabase
    .from('Product')
    .select('id, name, category, basePrice, active')
    .eq('active', true)

  const allProducts = products ?? []

  // 3. Fetch Inventory Batches (Stock valuation and expiry risk)
  const { data: batches } = await supabase
    .from('InventoryBatch')
    .select('id, productId, quantity, expiryDate, costPrice')

  const allBatches = batches ?? []
  const totalInventoryUnits = allBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)
  const totalValuation = allBatches.reduce(
    (sum, b) => sum + (Number(b.quantity) || 0) * (Number(b.costPrice) || 0),
    0
  )

  // Calculate near expiry items (expiring within 7 days)
  const now = new Date()
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(now.getDate() + 7)

  const nearExpiryBatches = allBatches.filter((b) => {
    if (!b.expiryDate) return false
    const exp = new Date(b.expiryDate)
    return exp <= sevenDaysFromNow && b.quantity > 0
  })

  // Stock per product mapping
  const stockMap: Record<string, number> = {}
  for (const b of allBatches) {
    if (b.quantity > 0) {
      stockMap[b.productId] = (stockMap[b.productId] ?? 0) + (Number(b.quantity) || 0)
    }
  }

  // Combine expired, near-expiry, and low-stock items into an urgent watchlist
  const watchlistItems: {
    id: string
    name: string
    category: string
    stock: number
    type: 'critical_expiry' | 'near_expiry' | 'out_of_stock' | 'low_stock'
    badgeText: string
    badgeColor: string
    daysLeft?: number
  }[] = []

  for (const b of nearExpiryBatches) {
    const prod = allProducts.find((p) => p.id === b.productId)
    if (prod && !watchlistItems.some((w) => w.name === prod.name)) {
      const expDate = new Date(b.expiryDate).getTime()
      const daysLeft = Math.ceil((expDate - now.getTime()) / (1000 * 60 * 60 * 24))
      const stock = stockMap[prod.id] ?? 0

      const isCritical = daysLeft <= 3
      watchlistItems.push({
        id: `${prod.id}_expiry_${b.id}`,
        name: prod.name,
        category: prod.category,
        stock,
        type: isCritical ? 'critical_expiry' : 'near_expiry',
        daysLeft,
        badgeText: daysLeft <= 1 ? 'Expires Tomorrow (Flash Sale)' : `${daysLeft} days left`,
        badgeColor: isCritical ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200',
      })
    }
  }

  for (const prod of allProducts) {
    const stock = stockMap[prod.id] ?? 0
    if (stock === 0 && !watchlistItems.some((w) => w.name === prod.name)) {
      watchlistItems.push({
        id: `${prod.id}_out`,
        name: prod.name,
        category: prod.category,
        stock: 0,
        type: 'out_of_stock',
        badgeText: 'Out of Stock',
        badgeColor: 'bg-gray-900 text-white border-gray-800',
      })
    } else if (stock > 0 && stock <= 5 && !watchlistItems.some((w) => w.name === prod.name)) {
      watchlistItems.push({
        id: `${prod.id}_low`,
        name: prod.name,
        category: prod.category,
        stock,
        type: 'low_stock',
        badgeText: `${stock} units left`,
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      })
    }
  }

  // 4. Fetch Users and Live Auth Activity
  const { data: rawUsers } = await supabase
    .from('User')
    .select('id, name, email, role, createdAt')
    .order('createdAt', { ascending: false })

  const allUsers = rawUsers ?? []

  // Build true live session map based on each user's latest event
  const userLatestEventMap = new Map<string, {
    userName: string
    userEmail: string
    role: string
    isOnline: boolean
    lastEventTime: string
    lastDevice: string
  }>()

  try {
    const { data: allLoginLogs } = await supabase
      .from('UserLoginLog')
      .select('*')
      .order('createdAt', { ascending: true })

    if (allLoginLogs && allLoginLogs.length > 0) {
      for (const log of allLoginLogs) {
        const emailKey = log.userEmail?.toLowerCase()
        if (!emailKey) continue
        const isLogin = log.eventType === 'Successful Login' || log.eventType === 'User Registration' || log.eventType.includes('Session')
        const isLogout = log.eventType === 'User Logout'

        if (isLogin) {
          userLatestEventMap.set(emailKey, {
            userName: log.userName || emailKey.split('@')[0],
            userEmail: log.userEmail,
            role: log.role || 'customer',
            isOnline: true,
            lastEventTime: log.createdAt,
            lastDevice: log.device || 'Web Client',
          })
        } else if (isLogout) {
          userLatestEventMap.set(emailKey, {
            userName: log.userName || emailKey.split('@')[0],
            userEmail: log.userEmail,
            role: log.role || 'customer',
            isOnline: false,
            lastEventTime: log.createdAt,
            lastDevice: log.device || 'Web Client',
          })
        }
      }
    }
  } catch {}

  const deduplicatedUserSessions = Array.from(userLatestEventMap.values())
    .sort((a, b) => new Date(b.lastEventTime).getTime() - new Date(a.lastEventTime).getTime())

  const onlineCount = deduplicatedUserSessions.filter((s) => s.isOnline).length

  // 5. Fetch Recent System Audit Logs
  let recentAuditLogs: any[] = []
  try {
    const { data: audits } = await supabase
      .from('SystemAuditLog')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(5)
    recentAuditLogs = audits ?? []
  } catch {}

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. TOP HEADER & QUICK SHORTCUTS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Store Performance & Operations Hub
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time grocery inventory, live shopper activity, sales velocity, and fulfillment queue
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors"
          >
            <span>+ Receive Stock</span>
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <span>Orders ({activeOrders.length})</span>
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <span>Users ({allUsers.length})</span>
          </Link>
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
          >
            <span>Reports Hub ➔</span>
          </Link>
        </div>
      </div>

      {/* 2. TOP 5 KEY PERFORMANCE METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Gross Sales */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Gross Sales (GMV)</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">
            ₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{completedOrders.length} orders · AOV ₱{averageOrderValue.toFixed(0)}</p>
        </div>

        {/* Active Orders */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Fulfillment Queue</p>
            {activeOrders.length > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>}
          </div>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{activeOrders.length} active</p>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Needs packing / delivery</p>
        </div>

        {/* Active Shoppers Online */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">Shoppers Online</p>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-xl font-black text-purple-700 mt-0.5">{onlineCount} online</p>
          <p className="text-[10px] text-purple-700/80 mt-0.5">{allUsers.length} registered accounts</p>
        </div>

        {/* Inventory Stock & Valuation */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/20 p-4 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800">Warehouse Stock</p>
          <p className="text-xl font-black text-blue-700 mt-0.5">{totalInventoryUnits.toLocaleString()} units</p>
          <p className="text-[10px] text-blue-700/80 mt-0.5">Valuation: ₱{totalValuation.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</p>
        </div>

        {/* Expiration Radar */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/20 p-4 shadow-xs col-span-2 lg:col-span-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Perishables Radar</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">{nearExpiryBatches.length} near-expiry</p>
          <p className="text-[10px] text-amber-700/80 mt-0.5">Flash sale discounts ready</p>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ACTIVE FULFILLMENT PIPELINE & SALES VELOCITY (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* ACTIVE FULFILLMENT QUEUE */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-black text-gray-900">Active Fulfillment Pipeline</h3>
                <p className="text-xs text-gray-500">Live customer orders requiring staff preparation and dispatch</p>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
              >
                Manage All Orders ➔
              </Link>
            </div>

            {/* 1. ACTIVE ORDERS QUEUE (If any) */}
            {activeOrders.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Orders Requiring Action ({activeOrders.length})
                </p>
                {activeOrders.slice(0, 4).map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 hover:bg-white hover:border-emerald-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900">#{order.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'packed' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] font-bold bg-gray-200/70 text-gray-700 px-2 py-0.5 rounded capitalize">
                          {order.fulfillmentType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 font-medium">
                        {(order as any).User?.name || 'Customer'} · {(order as any).User?.phone || 'No phone'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-black text-gray-900">₱{Number(order.total || 0).toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{order.paymentMethod || 'COD'}</p>
                      </div>

                      <Link
                        href={`/admin/orders`}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        Process ➔
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. RECENT COMPLETED ORDERS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                  {activeOrders.length === 0 ? 'Recent Completed Orders' : 'Latest Fulfilled Orders'} ({completedOrders.length})
                </p>
                {activeOrders.length === 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ All Current Orders Fulfilled
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {completedOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-white hover:border-gray-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900">#{order.id.slice(0, 8)}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Completed
                        </span>
                        <span className="text-[10px] font-bold bg-gray-200/70 text-gray-700 px-2 py-0.5 rounded capitalize">
                          {order.fulfillmentType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 font-medium">
                        {(order as any).User?.name || 'Customer'} · {(order as any).User?.phone || 'No phone'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-black text-gray-900">₱{Number(order.total || 0).toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {new Date(order.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {order.paymentMethod || 'COD'}
                        </p>
                      </div>

                      <Link
                        href={`/admin/orders`}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors shadow-xs"
                      >
                        View ➔
                      </Link>
                    </div>
                  </div>
                ))}

                {completedOrders.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-6 text-center">No orders completed yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* SALES RECONCILIATION & PAYMENT VELOCITY */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-black text-gray-900">Sales Velocity & Cash Settlement</h3>
                <p className="text-xs text-gray-500">Collected gross earnings and payment settlement breakdown</p>
              </div>
              <Link
                href="/admin/reports"
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Financial Report ➔
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cash on Delivery (COD)</span>
                <p className="text-xl font-black text-gray-900">₱{codTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-400">{codOrders.length} cash orders collected by riders</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Digital Payments (GCash / Card)</span>
                <p className="text-xl font-black text-blue-700">₱{digitalTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-400">{digitalOrders.length} online verified remittances</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE USERS, EXPIRY WATCHLIST & AUDIT STREAM (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {/* LIVE USERS & AUTH STREAM */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-gray-900">Live Shopper Sessions</h3>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <Link
                href="/admin/users"
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                User Directory ➔
              </Link>
            </div>

            <div className="space-y-2.5">
              {deduplicatedUserSessions.slice(0, 4).map((session) => (
                <div key={session.userEmail} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {(session.userName || session.userEmail || 'U')[0].toUpperCase()}
                      </div>
                      {session.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{session.userName || session.userEmail?.split('@')[0]}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{session.userEmail}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[9px] ${
                      session.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {session.isOnline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                      {session.isOnline ? 'Active' : 'Logged Out'}
                    </span>
                    <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                      {new Date(session.lastEventTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {deduplicatedUserSessions.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4 text-center">No active authentication sessions.</p>
              )}
            </div>
          </div>

          {/* PERISHABLES & URGENT STOCK WATCHLIST */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-black text-gray-900">Perishables & Stock Watchlist</h3>
                <p className="text-xs text-gray-500">Expiring produce and stockout warnings</p>
              </div>
              <Link
                href="/admin/clearance"
                className="text-xs font-bold text-amber-700 hover:underline"
              >
                Clearance Deals ➔
              </Link>
            </div>

            <div className="space-y-2.5">
              {watchlistItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-gray-900 leading-tight">{item.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{item.category} · Stock: {item.stock}</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${item.badgeColor}`}>
                    {item.badgeText}
                  </span>
                </div>
              ))}

              {watchlistItems.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4 text-center">All inventory is fresh and well-stocked!</p>
              )}
            </div>
          </div>

          {/* RECENT OPERATIONAL AUDIT LOGS */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Live Operational Audit Trail</h3>
              <Link href="/admin/audit" className="text-xs font-bold text-emerald-700 hover:underline">
                Full Audit Trail ➔
              </Link>
            </div>

            <div className="space-y-2">
              {recentAuditLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-[11px] truncate max-w-[200px]">{log.action}</span>
                    <span className="text-[9px] font-mono text-gray-400">
                      {new Date(log.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-1">{log.details}</p>
                </div>
              ))}

              {recentAuditLogs.length === 0 && (
                <p className="text-xs text-gray-400 italic py-2 text-center">Operational logs active.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}