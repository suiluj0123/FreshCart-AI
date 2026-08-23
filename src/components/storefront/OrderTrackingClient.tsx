'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCartContext } from '@/components/storefront/CartProvider'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  priceAtOrder: number
  Product: {
    id: string
    name: string
    unit: string
    imageUrl: string | null
    category: string
  } | null
}

interface OrderData {
  id: string
  userId: string | null
  status: string
  fulfillmentType: 'delivery' | 'pickup'
  total: number
  deliveryZip: string | null
  createdAt: string
  items: OrderItem[]
  user: { name: string; email: string; address?: string; phone?: string } | null
}

interface OrderTrackingClientProps {
  order: OrderData
}

function getStepIndex(status: string) {
  switch (status) {
    case 'placed':
      return 0
    case 'packed':
      return 1
    case 'out_for_delivery':
    case 'ready_pickup':
      return 2
    case 'completed':
      return 3
    default:
      return 0
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  produce: '🥦',
  dairy: '🥛',
  pantry: '🛒',
  meat: '🥩',
  frozen: '❄️',
}

export default function OrderTrackingClient({ order: initialOrder }: OrderTrackingClientProps) {
  const router = useRouter()
  const { addItem } = useCartContext()

  const [order, setOrder] = useState<OrderData>(initialOrder)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(false)
  const [confirmedTime, setConfirmedTime] = useState<string | null>(null)
  const [reorderMsg, setReorderMsg] = useState<string | null>(null)

  const createdDate = new Date(order.createdAt)
  const isCancelled = order.status === 'cancelled'
  const isDelivery = order.fulfillmentType === 'delivery'
  const currentStep = getStepIndex(order.status)
  const isCompleted = isCustomerConfirmed || order.status === 'completed'

  // 60-second cancellation countdown timer while in 'placed' status
  const [cancelSecondsLeft, setCancelSecondsLeft] = useState(() => {
    if (order.status !== 'placed') return 0
    const elapsed = Math.floor((Date.now() - createdDate.getTime()) / 1000)
    return Math.max(0, 60 - elapsed)
  })

  useEffect(() => {
    if (order.status !== 'placed' || cancelSecondsLeft <= 0) return

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - createdDate.getTime()) / 1000)
      const remaining = Math.max(0, 60 - elapsed)
      setCancelSecondsLeft(remaining)
      if (remaining <= 0) clearInterval(timer)
    }, 1000)

    return () => clearInterval(timer)
  }, [order.status, createdDate, cancelSecondsLeft])

  const canConfirm =
    ['out_for_delivery', 'ready_pickup', 'completed'].includes(order.status) &&
    !isCustomerConfirmed &&
    !isCancelled

  const statusSteps = [
    { key: 'placed', label: 'Order Received', desc: 'We got your order', icon: '🛒' },
    { key: 'packed', label: 'Items Packed', desc: 'Fresh groceries packed', icon: '📦' },
    {
      key: 'out_for_delivery',
      label: isDelivery ? 'Out for Delivery' : 'Ready for Pickup',
      desc: isDelivery ? 'Driver on the way' : 'Ready at store branch',
      icon: isDelivery ? '🚚' : '🏪',
    },
    {
      key: 'completed',
      label: isDelivery ? 'Order Delivered' : 'Order Picked Up',
      desc: isDelivery ? 'Delivered to your address' : 'Picked up in store',
      icon: '✅',
    },
  ]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTime = localStorage.getItem(`freshcart_confirmed_time_${order.id}`)
      if (storedTime) {
        setIsCustomerConfirmed(true)
        setConfirmedTime(storedTime)
      }
    }
  }, [order.id])

  // Real-time polling via API endpoint every 3 seconds
  useEffect(() => {
    if (isCompleted || isCancelled) return

    let isMounted = true

    const fetchLiveStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`)
        const data = await res.json()

        if (isMounted && data.success && data.order) {
          setOrder((prev) => ({
            ...prev,
            status: data.order.status,
            total: data.order.total,
          }))
        }
      } catch (e) {}
    }

    const interval = setInterval(fetchLiveStatus, 3000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [order.id, isCompleted, isCancelled])

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })

  const stepTimes = [
    formatTime(createdDate),
    formatTime(new Date(createdDate.getTime() + 60 * 1000)), // +1 min
    formatTime(new Date(createdDate.getTime() + 120 * 1000)), // +2 mins
    confirmedTime ?? formatTime(new Date(createdDate.getTime() + 300 * 1000)), // +5 mins
  ]

  const handleConfirmReceived = async () => {
    setConfirming(true)

    try {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        const timeString = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
        setOrder((prev) => ({ ...prev, status: 'completed' }))
        setIsCustomerConfirmed(true)
        setConfirmedTime(timeString)

        if (typeof window !== 'undefined') {
          localStorage.setItem(`freshcart_confirmed_time_${order.id}`, timeString)
          try {
            const rawCompleted = localStorage.getItem('freshcart_completed_orders')
            const completedList: string[] = rawCompleted ? JSON.parse(rawCompleted) : []
            if (!completedList.includes(order.id)) {
              completedList.push(order.id)
              localStorage.setItem('freshcart_completed_orders', JSON.stringify(completedList))
            }
          } catch (e) {}
          localStorage.removeItem('freshcart_active_order')
          window.dispatchEvent(new Event('active_order_updated'))
        }

        router.refresh()
      } else {
        alert('Could not confirm order: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Failed to confirm order:', err)
      alert('Network error while confirming order. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order? Deducted inventory will be restored.')) {
      return
    }

    setCancelling(true)

    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setOrder((prev) => ({ ...prev, status: 'cancelled' }))
        if (typeof window !== 'undefined') {
          localStorage.removeItem('freshcart_active_order')
          window.dispatchEvent(new Event('active_order_updated'))
        }
      } else {
        alert('Could not cancel order: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Network error while cancelling order.')
    } finally {
      setCancelling(false)
    }
  }

  const handleReorderAll = () => {
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

    setReorderMsg(`✓ Added ${count} items to your cart!`)
    setTimeout(() => setReorderMsg(null), 4000)
  }

  const handlePrintReceipt = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <>
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          header, nav, footer, .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .print-area {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 py-10 print:py-2">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Top Bar Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Live Order Tracker
                </span>
                <span className="relative flex h-2 w-2">
                  {!isCompleted && !isCancelled && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isCancelled ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                Order #{order.id.slice(0, 8)}
              </h1>

              <p className="text-xs text-gray-500 mt-1">
                Placed on {createdDate.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* 60-Second Cancel Order Button */}
              {order.status === 'placed' && cancelSecondsLeft > 0 && !isCancelled && (
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors shadow-sm cursor-pointer"
                >
                  {cancelling ? 'Cancelling...' : `Cancel Order (${cancelSecondsLeft}s) ✕`}
                </button>
              )}

              {/* Print Receipt Button */}
              {isCompleted && (
                <button
                  onClick={handlePrintReceipt}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <span>🖨️ Print / Save Receipt</span>
                </button>
              )}

              <Link
                href="/account/orders"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                Order History
              </Link>
              <Link
                href="/products"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Shop Again
              </Link>
            </div>
          </div>

          {/* Reorder Notification Toast */}
          {reorderMsg && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-emerald-600 p-4 text-white shadow-lg no-print">
              <span className="text-xs font-bold">{reorderMsg}</span>
              <Link
                href="/cart"
                className="rounded-xl bg-white px-3 py-1 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50"
              >
                Go to Cart →
              </Link>
            </div>
          )}

          {/* Cancelled Banner */}
          {isCancelled && (
            <div className="mb-8 rounded-2xl bg-red-50 p-6 border border-red-200 text-red-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✕</span>
                <h2 className="text-lg font-bold">Order Cancelled</h2>
              </div>
              <p className="text-xs text-red-600">
                This order was cancelled and inventory stock has been restored. You will not be charged.
              </p>
            </div>
          )}

          {/* Live Progress Banner Card */}
          {!isCancelled && (
            <div
              className={`mb-8 rounded-2xl p-6 text-white shadow-md transition-all ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                    {isDelivery ? '🚀 Home Delivery' : '🏪 Store Pickup'}
                  </span>

                  <h2 className="text-2xl font-extrabold mt-2">
                    {isCompleted
                      ? isDelivery ? 'Order Delivered & Completed! 🎉' : 'Order Picked Up & Completed! 🎉'
                      : order.status === 'out_for_delivery'
                      ? 'On the way to your address! 🚚'
                      : order.status === 'ready_pickup'
                      ? 'Ready for Store Pickup! 🏪'
                      : order.status === 'packed'
                      ? 'Fresh groceries are packed! 📦'
                      : 'We got your order! 🛒'}
                  </h2>

                  <p className="text-xs text-emerald-100 mt-1 font-medium">
                    {isCompleted
                      ? `Confirmed received on ${createdDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} at ${stepTimes[3]}.`
                      : isDelivery
                      ? 'Estimated delivery arrival: 25 – 35 mins'
                      : 'Estimated pickup window: Ready in 15 mins'}
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-emerald-500/50 sm:pl-6">
                  <span className="text-xs text-emerald-100 block">Total Amount</span>
                  <span className="text-3xl font-extrabold">
                    ₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Horizontal Progress Pipeline */}
              <div className="mt-8 grid grid-cols-4 gap-2 pt-6 border-t border-emerald-500/40">
                {statusSteps.map((step, idx) => {
                  const isPassed = idx <= currentStep
                  const isCurrent = idx === currentStep
                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-lg transition-all ${
                          isCurrent
                            ? 'bg-white text-emerald-700 font-bold ring-4 ring-white/30 scale-110 shadow-lg'
                            : isPassed
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-800/40 text-emerald-300'
                        }`}
                      >
                        {step.icon}
                      </div>
                      <span className={`mt-2 text-xs ${isPassed ? 'font-bold text-white' : 'text-emerald-200'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] text-emerald-200/80 mt-0.5 font-mono">
                        {stepTimes[idx]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Confirm Button Card */}
          {canConfirm && (
            <div className="mb-8 rounded-2xl bg-emerald-50 p-6 border-2 border-emerald-500 shadow-md text-center space-y-3 no-print">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-xl">
                ✓
              </div>
              <h3 className="text-lg font-extrabold text-emerald-900">
                {isDelivery ? 'Your groceries have arrived!' : 'Your order is ready for pickup!'}
              </h3>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                Please verify that you have received all your ordered items in good condition before confirming.
              </p>
              <button
                onClick={handleConfirmReceived}
                disabled={confirming}
                className="w-full max-w-sm rounded-xl bg-emerald-600 py-3 px-6 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-all cursor-pointer"
              >
                {confirming
                  ? 'Confirming...'
                  : isDelivery
                  ? 'Confirm Order Delivered ✓'
                  : 'Confirm Order Picked Up ✓'}
              </button>
            </div>
          )}

          {/* Main Printable Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print-area">
            {/* Ordered Items List */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-xs">
                    Ordered Items ({order.items.length})
                  </h3>
                  {isCompleted && (
                    <button
                      onClick={handleReorderAll}
                      className="text-xs font-bold text-emerald-700 hover:underline no-print"
                    >
                      🔁 Reorder All Items
                    </button>
                  )}
                </div>

                <div className="divide-y divide-gray-100">
                  {order.items.map((item) => {
                    const prod = item.Product
                    return (
                      <div key={item.id} className="py-3 flex items-center gap-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl">
                          {prod?.imageUrl ? (
                            <Image src={prod.imageUrl} alt={prod.name ?? ''} fill className="object-cover" />
                          ) : (
                            <span>{CATEGORY_ICONS[prod?.category ?? ''] ?? '🛍️'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{prod?.name ?? 'Grocery Item'}</h4>
                          <p className="text-xs text-gray-400">
                            Qty: {item.quantity} × ₱{item.priceAtOrder.toFixed(2)}
                          </p>
                        </div>
                        <span className="font-extrabold text-sm text-gray-900">
                          ₱{(item.quantity * item.priceAtOrder).toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Fulfillment Card Sidebar */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-xs">
                  Fulfillment Details
                </h3>

                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 text-xs space-y-3">
                  <div>
                    <span className="text-gray-400 block font-medium">Method</span>
                    <span className="font-bold text-gray-900 capitalize text-sm">
                      {isDelivery ? '🚀 Home Delivery' : '🏪 Store Pickup'}
                    </span>
                  </div>

                  {isDelivery ? (
                    <div>
                      <span className="text-gray-400 block font-medium">Delivery Address</span>
                      <span className="font-semibold text-gray-900 leading-relaxed block mt-0.5">
                        {order.user?.address || order.deliveryZip || 'Standard Delivery Address'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-gray-400 block font-medium">Store Address</span>
                      <span className="font-semibold text-gray-900">FreshCart AI Main Branch, BGC, Taguig</span>
                    </div>
                  )}

                  {order.user && (
                    <div>
                      <span className="text-gray-400 block font-medium">Customer</span>
                      <span className="font-semibold text-gray-900">{order.user.name || order.user.email}</span>
                      {order.user.phone && <span className="text-gray-500 block text-[11px] mt-0.5">{order.user.phone}</span>}
                    </div>
                  )}
                </div>

                {/* Payment Summary */}
                <div className="pt-2 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">₱{order.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Payment Method</span>
                    <span className="font-medium">Cash on Delivery / Pickup</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-gray-900 border-t border-gray-100 pt-3">
                    <span>Grand Total</span>
                    <span className="text-emerald-700">₱{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}