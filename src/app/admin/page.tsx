import React from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('[admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export default async function AdminDashboardPage() {
  const supabase = getAdminClient()

  // 1. Fetch Orders Metrics
  const { data: rawOrders } = await supabase
    .from('Order')
    .select('id, total, status, fulfillmentType, deliveryZip, createdAt, userId')
    .order('createdAt', { ascending: false })

  const ordersToUpdate: { id: string; status: string }[] = []
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

  const totalRevenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const activeOrders = allOrders.filter(
    (o) => o.status === 'placed' || o.status === 'packed' || o.status === 'out_for_delivery' || o.status === 'ready_pickup'
  )
  const completedOrders = allOrders.filter((o) => o.status === 'completed')

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
    stockMap[b.productId] = (stockMap[b.productId] ?? 0) + (Number(b.quantity) || 0)
  }

  const lowStockProducts = allProducts.filter((p) => (stockMap[p.id] ?? 0) <= 5)

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Store Performance & Operations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time grocery inventory, sales velocity, and fulfillment pipeline status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Receive Stock</span>
          </Link>
          <Link
            href="/admin/clearance"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>Clearance Bundles</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Gross Sales (GMV)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              ₱{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500 font-medium">
            From {allOrders.length} customer orders
          </p>
        </div>

        {/* Active Order Pipeline */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Orders</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {activeOrders.length}
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Pending</span>
          </div>
          <p className="mt-2 text-xs text-gray-500 font-medium">
            {completedOrders.length} completed orders
          </p>
        </div>

        {/* Inventory Stock Valuation */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Stock Valuation</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              ₱{totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500 font-medium">
            {totalInventoryUnits} units ({allProducts.length} active SKUs)
          </p>
        </div>

        {/* Expiry Risk Alerts */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Near-Expiry Alert</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
              {nearExpiryBatches.length}
            </span>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              &lt; 7 Days
            </span>
          </div>
          <Link
            href="/admin/clearance"
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <span>Review Clearance Bundles</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Two Column Layout: Recent Orders & Stock Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recent Customer Orders</h2>
              <p className="text-xs text-gray-500">Live order flow ready for packing and dispatch</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              View All Orders →
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {allOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No customer orders placed yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-4 py-3">Fulfillment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allOrders.slice(0, 6).map((order) => {
                    const statusColors: Record<string, string> = {
                      placed: 'bg-blue-50 text-blue-700 border-blue-200',
                      packed: 'bg-amber-50 text-amber-700 border-amber-200',
                      out_for_delivery: 'bg-purple-50 text-purple-700 border-purple-200',
                      ready_pickup: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    }

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-semibold text-gray-800">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3.5 capitalize text-gray-600 font-medium">
                          {order.fulfillmentType} {order.deliveryZip ? `(${order.deliveryZip})` : ''}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              statusColors[order.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-gray-900">
                          ₱{Number(order.total).toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href="/admin/orders"
                            className="font-bold text-emerald-700 hover:text-emerald-900"
                          >
                            Manage →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low Stock & Expiry Watchlist (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Inventory Watchlist</h2>
              <p className="text-xs text-gray-500">Low stock and near-expiry items</p>
            </div>
            <Link
              href="/admin/inventory"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Inventory →
            </Link>
          </div>

          <div className="p-4 divide-y divide-gray-100 flex-1 overflow-y-auto max-h-96">
            {lowStockProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                All inventory levels are healthy!
              </div>
            ) : (
              lowStockProducts.slice(0, 6).map((prod) => {
                const stock = stockMap[prod.id] ?? 0
                return (
                  <div key={prod.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">{prod.name}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{prod.category}</p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        stock === 0
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {stock === 0 ? 'Out of Stock' : `${stock} left`}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-4 bg-gray-50/70 border-t border-gray-100 text-center">
            <Link
              href="/admin/inventory"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
            >
              Manage Batches & Restock →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}