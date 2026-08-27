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
    landmark: '',
    zip: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'ewallet',
  })
  const [saveToProfile, setSaveToProfile] = useState(true)
  const [autoFilled, setAutoFilled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submittingRef = useRef(false)

  const deliveryFee = fulfillmentType === 'delivery' ? 50 : 0
  const grandTotal = cartTotal + deliveryFee

  useEffect(() => {
    async function checkAuthAndLoadProfile() {
      const { createClient } = await import('@/lib/auth/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/cart')
        return
      }

      let savedName = ''
      let savedPhone = ''
      let savedAddress = ''
      let savedZip = ''

      // 1. Try local storage cache
      if (typeof window !== 'undefined') {
        try {
          const cachedRaw = localStorage.getItem(`freshcart_customer_profile_${user.id}`)
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw)
            savedName = cached.fullName || ''
            savedPhone = cached.phone || ''
            savedAddress = cached.address || ''
            savedZip = cached.zip || ''
          }
        } catch (e) {}
      }

      // 2. Try Supabase DB
      const { data: profile } = await supabase
        .from('User')
        .select('*')
        .eq('authId', user.id)
        .maybeSingle()

      if (profile) {
        savedName = profile.name || savedName || user.user_metadata?.name || user.email?.split('@')[0] || ''
        savedPhone = profile.phone || savedPhone || ''
        savedAddress = profile.address || savedAddress || ''
        savedZip = profile.zip || savedZip || ''
      }

      setFormData((prev) => ({
        ...prev,
        fullName: savedName || user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: profile?.email || user.email || '',
        phone: savedPhone,
        address: savedAddress,
        zip: savedZip,
      }))

      if (savedName || savedAddress || savedPhone || savedZip) {
        setAutoFilled(true)
      }
    }

    checkAuthAndLoadProfile()
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
      const { createClient } = await import('@/lib/auth/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Save to localStorage cache & Supabase DB if saveToProfile is enabled
      if (user && saveToProfile) {
        const profileObj = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          zip: formData.zip.trim(),
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(`freshcart_customer_profile_${user.id}`, JSON.stringify(profileObj))
        }

        try {
          const { error: err1 } = await supabase
            .from('User')
            .update({
              name: formData.fullName.trim(),
              phone: formData.phone.trim(),
              address: formData.address.trim(),
              zip: formData.zip.trim(),
            })
            .eq('authId', user.id)

          if (err1) {
            await supabase
              .from('User')
              .update({
                name: formData.fullName.trim(),
                zip: formData.zip.trim(),
              })
              .eq('authId', user.id)
          }
        } catch (dbErr) {
          console.warn('[Checkout] Supabase User update fallback:', dbErr)
        }
      }

      const fullDeliveryAddress = fulfillmentType === 'delivery'
        ? [formData.address.trim(), formData.zip.trim(), formData.landmark ? `(Landmark: ${formData.landmark.trim()})` : '']
            .filter(Boolean)
            .join(', ')
        : 'FreshCart Central Hub (Store Pickup)'

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillmentType,
          paymentMethod: formData.paymentMethod,
          deliveryAddress: fullDeliveryAddress,
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
            address: fullDeliveryAddress,
            landmark: formData.landmark,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Checkout failed')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('freshcart_active_order', data.orderId)
        if (user) {
          const historyKey = `freshcart_order_history_${user.id}`
          try {
            const historyRaw = localStorage.getItem(historyKey)
            const historyList: string[] = historyRaw ? JSON.parse(historyRaw) : []
            if (!historyList.includes(data.orderId)) {
              historyList.push(data.orderId)
              localStorage.setItem(historyKey, JSON.stringify(historyList))
            }
          } catch (e) {}
        }
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Checkout</h1>
            <p className="text-sm text-gray-500 mt-1">Review your order details and delivery info</p>
          </div>
          <Link
            href="/cart"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            ← Back to Cart
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {autoFilled && (
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-800">
            <span className="font-semibold">
              ✓ Contact & delivery details auto-filled from your saved profile!
            </span>
            <Link href="/account" className="font-bold underline hover:text-emerald-900">
              Edit Profile
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-7 space-y-6">
            {/* Fulfillment Type */}
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">1. Fulfillment Method</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('delivery')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    fulfillmentType === 'delivery'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-bold text-sm">🚀 Home Delivery</div>
                  <div className="text-xs text-gray-500 mt-1">Delivered to your door (+₱50)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType('pickup')}
                  className={`p-4 rounded-xl border text-left transition-all ${
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">2. Customer Details</h2>
                <Link href="/account" className="text-xs text-emerald-600 hover:underline">
                  Manage Saved Profile
                </Link>
              </div>

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
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Exact Delivery Address (House / Unit No., Street, Building) *</label>
                    <input
                      type="text"
                      required={fulfillmentType === 'delivery'}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="e.g. Unit 402, Acacia Tower, 123 Emerald Ave"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Barangay / District & City *</label>
                      <input
                        type="text"
                        required={fulfillmentType === 'delivery'}
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="e.g. Brgy. San Antonio, Pasig City"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nearest Landmark / Notes (Optional)</label>
                      <input
                        type="text"
                        value={formData.landmark || ''}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="e.g. Beside 7-Eleven, Gate 2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {fulfillmentType === 'pickup' && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>🏪</span> Pickup Location: FreshCart Central Hub
                  </p>
                  <p className="text-emerald-800">Ground Floor, Express Counter, Market Ave, Metro Manila</p>
                  <p className="text-[11px] text-emerald-700 pt-1 font-medium">Ready for pickup in approx. 30-45 minutes after order placement.</p>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Save as default delivery address & contact info in my profile</span>
                </label>
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">3. Payment Option</h2>
              <div className="space-y-3">
                {/* Cash Option */}
                <label className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                  formData.paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-600/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">
                        {fulfillmentType === 'delivery' ? 'Cash on Delivery (COD)' : 'Cash on Counter'}
                      </span>
                      <span className="text-xs text-gray-500">Pay cash upon receiving your fresh groceries</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">CASH</span>
                </label>

                {/* Card Option */}
                <label className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                  formData.paymentMethod === 'card'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-600/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={formData.paymentMethod === 'card'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'card' })}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">Credit / Debit Card</span>
                      <span className="text-xs text-gray-500">Visa, Mastercard, JCB (Secure online test checkout)</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">CARD</span>
                </label>

                {/* E-Wallet Option */}
                <label className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                  formData.paymentMethod === 'ewallet'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-600/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={formData.paymentMethod === 'ewallet'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'ewallet' })}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">E-Wallet (GCash / Maya)</span>
                      <span className="text-xs text-gray-500">Pay via QR Ph, GCash, or Maya e-wallet</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-purple-50 text-purple-700 rounded-lg">E-WALLET</span>
                </label>
              </div>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm sticky top-24 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">
                Order Items ({items.length})
              </h2>

              <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-gray-50 pr-1">
                {items.map((item) => (
                  <div key={item.id} className="pt-3 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-bold text-gray-900 block truncate">{item.name}</span>
                      <span className="text-gray-400">Qty: {item.quantity} × ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <span className="font-extrabold text-gray-900 shrink-0">
                      ₱{(item.quantity * item.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs border-t border-gray-100 pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">₱{cartTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Fulfillment</span>
                  <span className="font-semibold">
                    {deliveryFee > 0 ? `₱${deliveryFee.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-100 pt-3">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? 'Processing Order...' : 'Place Order Now →'}
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
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
