'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCartContext } from '@/components/storefront/CartProvider'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = (searchParams.get('type') as 'delivery' | 'pickup') || 'delivery'

  const { items, cartTotal, clearCart } = useCartContext()

  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>(initialType)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    zip: '',
    paymentMethod: 'cod' as 'cod' | 'card',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submittingRef = useRef(false)

  const deliveryFee = fulfillmentType === 'delivery' ? 50 : 0
  const grandTotal = cartTotal + deliveryFee

  useEffect(() => {
    async function checkAuth() {
      const { createClient } = await import('@/lib/auth/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/cart')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (items.length === 0 && !submittingRef.current) {
      router.push('/cart')
    }
  }, [items, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError('Please fill in all required contact information.')
      return
    }

    if (fulfillmentType === 'delivery' && (!formData.address.trim() || !formData.zip.trim())) {
      setError('Delivery address and ZIP code are required for delivery.')
      return
    }

    setLoading(true)
    submittingRef.current = true

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillmentType,
          deliveryZip: formData.zip,
          total: grandTotal,
          items: items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            priceAtOrder: i.price,
          })),
          customerDetails: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Checkout failed')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('freshcart_active_order', data.orderId)
        window.dispatchEvent(new Event('active_order_updated'))
      }
      clearCart()
      router.push(`/orders/${data.orderId}`)
      router.refresh()
    } catch (err: any) {
      submittingRef.current = false
      setError(err?.message || 'An unexpected error occurred during checkout.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/cart" className="hover:text-emerald-700">Cart</Link>
          <span>/</span>
          <span className="font-semibold text-gray-900">Checkout</span>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Customer & Shipping Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Fulfillment Selector */}
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">1. Fulfillment Method</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('delivery')}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    fulfillmentType === 'delivery'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-bold text-sm">🚚 Delivery</div>
                  <div className="text-xs text-gray-500 mt-1">Direct to your home (+₱50)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType('pickup')}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    fulfillmentType === 'pickup'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-bold text-sm">🏪 Store Pickup</div>
                  <div className="text-xs text-gray-500 mt-1">Pick up in store (Free)</div>
                </button>
              </div>
            </div>

            {/* Contact Details */}
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">2. Customer Details</h2>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Juan Dela Cruz"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="juan@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="09171234567"
                  />
                </div>
              </div>

              {fulfillmentType === 'delivery' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Address *</label>
                    <input
                      type="text"
                      required={fulfillmentType === 'delivery'}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="Street address, Village/Barangay, City"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ZIP / Postal Code *</label>
                    <input
                      type="text"
                      required={fulfillmentType === 'delivery'}
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="1000"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Payment Method */}
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">3. Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={() => setFormData({ ...formData, paymentMethod: 'cod' })}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-sm text-gray-900">Cash on Delivery / Pickup</span>
                    <p className="text-xs text-gray-500">Pay when your order arrives or upon pickup</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={() => setFormData({ ...formData, paymentMethod: 'card' })}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-sm text-gray-900">Credit / Debit Card (Test Mode)</span>
                    <p className="text-xs text-gray-500">Stripe card test integration</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary & Submit */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Items</h2>

              <div className="max-h-60 overflow-y-auto space-y-3 mb-6 pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-gray-700">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₱{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Fulfillment</span>
                  <span>{deliveryFee > 0 ? `₱${deliveryFee.toFixed(2)}` : 'Free'}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-100 pt-3">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">₱{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing Order...' : 'Place Order Now'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}