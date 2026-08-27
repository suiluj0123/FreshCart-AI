'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { useCartContext } from '@/components/storefront/CartProvider'

const CATEGORY_ICONS: Record<string, string> = {
  produce: '🥦',
  dairy: '🥛',
  pantry: '🛒',
  meat: '🥩',
  frozen: '❄️',
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'placed':
      return {
        label: '🛒 Order Received',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      }
    case 'packed':
      return {
        label: '📦 Items Packed',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      }
    case 'out_for_delivery':
      return {
        label: '🚚 Out for Delivery',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      }
    case 'ready_pickup':
      return {
        label: '🏪 Ready for Pickup',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      }
    case 'completed':
      return {
        label: '✅ Completed',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    case 'cancelled':
      return {
        label: '✕ Cancelled',
        className: 'bg-red-50 text-red-700 border-red-200',
      }
    default:
      return {
        label: 'Processing',
        className: 'bg-gray-50 text-gray-700 border-gray-200',
      }
  }
}

export default function OrderHistoryPage() {
  const router = useRouter()
  const supabase = createClient()
  const { addItem } = useCartContext()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all')
  const [reorderSuccess, setReorderSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrders() {
      const { data: { user } } = await supabase.auth.getUser()

      try {
        const res = await fetch('/api/orders/user')
        const data = await res.json()

        let fetchedOrders = data.success && Array.isArray(data.orders) ? data.orders : []

        // Merge locally cached order IDs (both active & past completed orders)
        if (typeof window !== 'undefined') {
          const userKey = user ? `freshcart_order_history_${user.id}` : ''
          const cachedHistoryRaw = userKey ? localStorage.getItem(userKey) : null
          const cachedHistory: string[] = cachedHistoryRaw ? JSON.parse(cachedHistoryRaw) : []

          const completedRaw = localStorage.getItem('freshcart_completed_orders')
          const completedList: string[] = completedRaw ? JSON.parse(completedRaw) : []

          const activeId = localStorage.getItem('freshcart_active_order')

          const allIdsToFetch = Array.from(
            new Set([...cachedHistory, ...completedList, activeId].filter(Boolean))
          ) as string[]

          for (const orderId of allIdsToFetch) {
            if (!fetchedOrders.some((o: any) => o.id === orderId)) {
              try {
                const singleRes = await fetch(`/api/orders/${orderId}`)
                const singleData = await singleRes.json()
                if (singleData.success && singleData.order) {
                  fetchedOrders.push(singleData.order)
                }
              } catch (e) {}
            }
          }
        }

        // Sort by createdAt descending
        fetchedOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setOrders(fetchedOrders)
      } catch (err) {
        console.error('Failed to load order history:', err)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [router, supabase])

  const handleReorder = (order: any) => {
    if (!order.items || order.items.length === 0) return

    let count = 0
    for (const item of order.items) {
      const prod = item.Product
      addItem(
        {
          id: item.productId,
          name: prod?.name ?? 'Grocery Item',
          price: item.priceAtOrder,
          imageUrl: prod?.imageUrl ?? undefined,
          unit: prod?.unit ?? 'item',
        },
        item.quantity
      )
      count += item.quantity
    }

    setReorderSuccess(`✓ Added ${count} items from Order #${order.id.slice(0, 8)} to your cart!`)
    setTimeout(() => {
      setReorderSuccess(null)
    }, 6000)
  }

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'active') return order.status !== 'completed' && order.status !== 'cancelled'
    if (activeTab === 'completed') return order.status === 'completed'
    return true
  })

  const activeCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length
  const completedCount = orders.filter((o) => o.status === 'completed').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="h-5 w-5 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading your complete order history...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Account Orders
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-1">My Order History</h1>
            <p className="text-xs text-gray-500 mt-1">
              View all your active deliveries, store pickups, and past completed receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              ← Back to Profile
            </Link>
            <Link
              href="/cart"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              🛒 View Cart
            </Link>
          </div>
        </div>

        {/* Reorder Notification Toast */}
        {reorderSuccess && (
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-emerald-600 p-4 text-white shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span>{reorderSuccess}</span>
            </div>
            <Link
              href="/cart"
              className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-sm"
            >
              Go to Cart →
            </Link>
          </div>
        )}

        {/* ALWAYS VISIBLE Filter Tabs */}
        <div className="mb-6 flex items-center gap-2 border-b border-gray-200 pb-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-4 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-4 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Active / Ongoing ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-4 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Completed Receipts ({completedCount})
          </button>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-gray-100 shadow-sm max-w-lg mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-3xl mb-4">
              📜
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">
              {activeTab === 'completed'
                ? 'No Completed Orders Yet'
                : activeTab === 'active'
                ? 'No Active Ongoing Orders'
                : 'No Orders Found'}
            </h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              {activeTab === 'completed'
                ? 'Your completed past orders will appear here once delivered or confirmed.'
                : activeTab === 'active'
                ? 'You have no active orders in progress right now.'
                : 'Start shopping and track your orders live right here!'}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Start Shopping Groceries →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const badge = getStatusBadge(order.status)
              const createdDate = new Date(order.createdAt)
              const isCompleted = order.status === 'completed'

              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-lg text-gray-900">
                          Order #{order.id.slice(0, 8)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Placed on {createdDate.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                      <div className="text-right mr-2">
                        <span className="text-[11px] text-gray-400 block uppercase font-medium">
                          {order.fulfillmentType === 'delivery' ? '🚀 Home Delivery' : '🏪 Store Pickup'}
                        </span>
                        <span className="text-base font-extrabold text-gray-900">
                          ₱{Number(order.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Reorder Button */}
                      {order.items && order.items.length > 0 && (
                        <button
                          onClick={() => handleReorder(order)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer shadow-sm"
                        >
                          <span>🔁 Reorder Items</span>
                        </button>
                      )}

                      <Link
                        href={`/orders/${order.id}`}
                        className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-colors cursor-pointer shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {isCompleted ? 'View Receipt →' : 'Track Order 🚚'}
                      </Link>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                      Items Ordered ({order.items ? order.items.length : 0})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {order.items && order.items.map((item: any) => {
                        const prod = item.Product
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5 border border-gray-100 text-xs"
                          >
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white border border-gray-100 flex items-center justify-center text-lg">
                              {prod?.imageUrl ? (
                                <Image src={prod.imageUrl} alt={prod.name ?? ''} fill className="object-cover" />
                              ) : (
                                <span>{CATEGORY_ICONS[prod?.category ?? ''] ?? '🛍️'}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-gray-900 block truncate">{prod?.name ?? 'Item'}</span>
                              <span className="text-gray-400 text-[11px]">
                                {item.quantity} × ₱{Number(item.priceAtOrder).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}