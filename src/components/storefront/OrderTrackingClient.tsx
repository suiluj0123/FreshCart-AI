'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface OrderItem {
  id: string
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
  user: { name: string; email: string } | null
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
  const [order, setOrder] = useState<OrderData>(initialOrder)
  const [confirming, setConfirming] = useState(false)
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(false)
  const [confirmedTime, setConfirmedTime] = useState<string | null>(null)

  const isDelivery = order.fulfillmentType === 'delivery'
  const currentStep = getStepIndex(order.status)
  // Customer explicitly confirmed receipt
  const isCompleted = isCustomerConfirmed

  // Can confirm if order status in DB is out_for_delivery, ready_pickup, or completed, but customer hasn't clicked confirm yet
  const canConfirm = ['out_for_delivery', 'ready_pickup', 'completed'].includes(order.status) && !isCustomerConfirmed

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
    if (isCompleted) return

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
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    const interval = setInterval(fetchLiveStatus, 3000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [order.id, isCompleted, isCustomerConfirmed])

  const createdDate = new Date(order.createdAt)

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

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Top Navigation */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Live Order Tracking
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isCompleted ? 'Order Completed' : 'Real-Time Sync On'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              Order #{order.id.slice(0, 8)}
            </h1>

            <p className="text-xs text-gray-500 mt-1">
              Placed on {createdDate.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Live Banner Card */}
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

        {/* Customer Confirmation / Order Completed Action Box */}
        <div className="mb-8 rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isCompleted
                  ? isDelivery ? '✓ Order Delivered & Completed' : '✓ Order Picked Up & Completed'
                  : canConfirm
                  ? isDelivery ? 'Has your order been delivered?' : 'Have you picked up your groceries?'
                  : 'Preparing Your Order'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isCompleted
                  ? `Confirmed received by customer on ${createdDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} at ${stepTimes[3]}.`
                  : canConfirm
                  ? `Click below to confirm your order has been ${isDelivery ? 'delivered' : 'picked up'} to complete the order.`
                  : `Groceries are currently being prepared & packed. The confirmation button will appear when the status reaches ${isDelivery ? '"Out for Delivery"' : '"Ready for Pickup"'}.`}
              </p>
            </div>

            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700 border border-emerald-200 shrink-0">
                ✓ Order Completed
              </span>
            ) : canConfirm ? (
              <button
                onClick={handleConfirmReceived}
                disabled={confirming}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                {confirming
                  ? 'Confirming...'
                  : isDelivery
                  ? 'Confirm Order Delivered ✓'
                  : 'Confirm Order Picked Up ✓'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-400 shrink-0">
                ⏳ Awaiting {isDelivery ? 'Delivery' : 'Pickup'} Stage
              </span>
            )}
          </div>
        </div>

        {/* Detailed Timeline & Fulfillment Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Detailed Status Log Timeline */}
          <div className="lg:col-span-7 space-y-6">
            {/* Status Log Card */}
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Detailed Order Timeline</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-100">
                {statusSteps.map((step, idx) => {
                  const isPassed = idx <= currentStep
                  const isCurrent = idx === currentStep
                  return (
                    <div key={step.key} className="relative flex items-start gap-4 pl-8">
                      <div
                        className={`absolute left-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                            : isPassed
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-bold ${isPassed ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </h4>
                          <span className="text-xs font-mono text-gray-400">{stepTimes[idx]}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Items List */}
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Ordered Items ({order.items.length})</h3>
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
            {/* Fulfillment Card */}
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
                    <span className="text-gray-400 block font-medium">Delivery ZIP Code</span>
                    <span className="font-semibold text-gray-900">{order.deliveryZip || 'Standard Delivery Zone'}</span>
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
                  <span>Payment Status</span>
                  <span className="font-bold text-emerald-700">Cash on Delivery / Pickup</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">₱{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}