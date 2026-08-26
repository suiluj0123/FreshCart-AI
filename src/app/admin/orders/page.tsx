'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  priceAtOrder: number
  wasSubstituted: boolean
  Product?: {
    name: string
    category: string
    unit: string
  }
}

interface OrderData {
  id: string
  userId: string | null
  status: 'placed' | 'packed' | 'out_for_delivery' | 'ready_pickup' | 'completed' | 'cancelled'
  fulfillmentType: 'delivery' | 'pickup'
  total: number
  deliveryZip: string | null
  createdAt: string
  items?: OrderItem[]
  User?: {
    name: string | null
    email: string
    address?: string | null
    phone?: string | null
    zip?: string | null
  } | null
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; nextStatus?: string; nextLabel?: string }
> = {
  placed: {
    label: 'Order Placed (Pending)',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    nextStatus: 'packed',
    nextLabel: 'Pack Order',
  },
  packed: {
    label: 'Packed & Ready',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    nextStatus: 'out_for_delivery',
    nextLabel: 'Dispatch for Delivery',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    nextStatus: 'completed',
    nextLabel: 'Mark as Completed / Delivered',
  },
  ready_pickup: {
    label: 'Ready for Pickup',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    nextStatus: 'completed',
    nextLabel: 'Mark as Picked Up / Completed',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null)

  const fetchOrders = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      const res = await fetch('/api/admin/orders')
      const data = await res.json()
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders)
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(true)
    const interval = setInterval(() => fetchOrders(false), 4000)
    return () => clearInterval(interval)
  }, [])

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
        )
        setStatusFeedback(`✓ Order #${orderId.slice(0, 8)} updated to ${newStatus}`)
        setTimeout(() => setStatusFeedback(null), 4000)
      } else {
        alert('Failed to update status: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Network error while updating status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const counts = {
    all: orders.length,
    placed: orders.filter((o) => o.status === 'placed').length,
    packed: orders.filter((o) => o.status === 'packed').length,
    transit: orders.filter(
      (o) => o.status === 'out_for_delivery' || o.status === 'ready_pickup'
    ).length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }

  const filteredOrders = orders.filter((order) => {
    // Status Filter
    if (filterTab === 'placed' && order.status !== 'placed') return false
    if (filterTab === 'packed' && order.status !== 'packed') return false
    if (
      filterTab === 'transit' &&
      order.status !== 'out_for_delivery' &&
      order.status !== 'ready_pickup'
    )
      return false
    if (filterTab === 'completed' && order.status !== 'completed') return false
    if (filterTab === 'cancelled' && order.status !== 'cancelled') return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchId = order.id.toLowerCase().includes(q)
      const matchEmail = order.User?.email?.toLowerCase().includes(q)
      const matchName = order.User?.name?.toLowerCase().includes(q)
      return matchId || matchEmail || matchName
    }

    return true
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Order Managemnt
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage grocery orders, payment status, and customer status updtes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {statusFeedback && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <span>{statusFeedback}</span>
          <button onClick={() => setStatusFeedback(null)} className="text-emerald-600 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Pipeline Status Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'all', label: 'All Orders', count: counts.all, color: 'text-gray-900' },
          { key: 'placed', label: 'Pending Placed', count: counts.placed, color: 'text-blue-600' },
          { key: 'packed', label: 'Packed', count: counts.packed, color: 'text-purple-600' },
          { key: 'transit', label: 'In Transit / Pickup', count: counts.transit, color: 'text-amber-600' },
          { key: 'completed', label: 'Completed', count: counts.completed, color: 'text-emerald-600' },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled, color: 'text-red-600' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filterTab === tab.key
                ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-white/80 border-gray-200/80 hover:bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{tab.label}</p>
            <p className={`text-xl font-black mt-1 ${tab.color}`}>{tab.count}</p>
          </button>
        ))}
      </div>

      {/* Search & Orders List Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by Order ID, customer name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Showing {filteredOrders.length} of {orders.length} orders
          </span>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500 font-medium">
              Loading order pipeline...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              No orders matching current filter or search criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5">Order ID & Date</th>
                  <th className="px-4 py-3.5">Customer & Address</th>
                  <th className="px-4 py-3.5">Fulfillment</th>
                  <th className="px-4 py-3.5">Payment</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Total Amount</th>
                  <th className="px-6 py-3.5 text-right">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || {
                    label: order.status,
                    badge: 'bg-gray-100 text-gray-700',
                  }
                  const createdDate = new Date(order.createdAt).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  const nextAction =
                    order.status === 'placed'
                      ? { target: 'packed', label: 'Pack Order', color: 'bg-purple-600 hover:bg-purple-700' }
                      : order.status === 'packed'
                      ? order.fulfillmentType === 'delivery'
                        ? { target: 'out_for_delivery', label: 'Dispatch Delivery', color: 'bg-amber-600 hover:bg-amber-700' }
                        : { target: 'ready_pickup', label: 'Ready for Pickup', color: 'bg-amber-600 hover:bg-amber-700' }
                      : order.status === 'out_for_delivery' || order.status === 'ready_pickup'
                      ? { target: 'completed', label: 'Mark Completed', color: 'bg-emerald-600 hover:bg-emerald-700' }
                      : null

                  const rawAddress = order.User?.address || order.deliveryZip
                  const formattedAddress =
                    rawAddress && rawAddress.length > 5
                      ? rawAddress
                      : rawAddress
                      ? `Metro Manila (Postal Area: ${rawAddress})`
                      : 'Metro Manila Delivery'

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-gray-900">#{order.id.slice(0, 8)}</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">{createdDate}</p>
                      </td>
                      <td className="px-4 py-4 max-w-sm">
                        <p className="font-semibold text-gray-900">{order.User?.name || 'Customer'}</p>
                        <p className="text-[11px] text-gray-500 truncate">{order.User?.email || 'Guest'}</p>
                        {order.fulfillmentType === 'delivery' ? (
                          <p className="text-[11px] text-emerald-900 bg-emerald-50/90 px-2 py-1 rounded-lg mt-1.5 border border-emerald-200/80 leading-snug">
                            <span className="font-bold text-emerald-950">📍 Exact Address: </span>
                            <span>{formattedAddress}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-900 bg-amber-50/90 px-2 py-1 rounded-lg mt-1.5 border border-amber-200/80">
                            <span className="font-bold">🏪 Pickup: </span> FreshCart Central Hub Express Counter
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 capitalize text-gray-700 font-medium">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          order.fulfillmentType === 'delivery'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {order.fulfillmentType === 'delivery' ? 'Home Delivery' : 'Store Pickup'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                          Cash on Arrival
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-black text-gray-900 text-sm">
                        ₱{Number(order.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {nextAction && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, nextAction.target)}
                              disabled={updatingId === order.id}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${nextAction.color} disabled:opacity-50`}
                            >
                              {updatingId === order.id ? 'Updating...' : nextAction.label}
                            </button>
                          )}

                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'completed')}
                              disabled={updatingId === order.id}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="Force mark completed"
                            >
                              Complete ✓
                            </button>
                          )}

                          <Link
                            href={`/orders/${order.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            title="View tracking view"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}