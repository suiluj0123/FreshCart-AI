'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/auth/client'
import { useCartContext } from '@/components/storefront/CartProvider'
import LoginModal from '@/components/storefront/LoginModal'

export default function CartPage() {
  const supabase = createClient()
  const { items, updateQuantity, removeItem, clearCart, cartTotal } = useCartContext()
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery')

  const [user, setUser] = useState<any>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const deliveryFee = fulfillmentType === 'delivery' && items.length > 0 ? 50 : 0
  const grandTotal = cartTotal + deliveryFee

  useEffect(() => {
    async function checkUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      setLoadingAuth(false)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setLoginModalOpen(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  if (loadingAuth) {
    return (
      <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="h-4 w-4 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading cart...
        </div>
      </div>
    )
  }

  // Gate Cart View: User must be signed in to view cart & checkout
  if (!user) {
    return (
      <>
        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

        <div className="min-h-[75vh] bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-3xl mb-4">
              🔐
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Please sign in or create an account to view your shopping cart
              {items.length > 0 ? ` (${items.length} item${items.length === 1 ? '' : 's'} waiting)` : ''} and proceed to checkout.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setLoginModalOpen(true)}
                className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition-colors cursor-pointer"
              >
                Sign In / Create Account
              </button>
              <Link
                href="/products"
                className="w-full inline-flex items-center justify-center rounded-xl bg-gray-100 py-3 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Continue Browsing Products
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Your Cart is Empty</h1>
          <p className="text-sm text-gray-500 mb-6">
            Looks like you haven&apos;t added any groceries or meal kits yet.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Shopping Cart</h1>
            <p className="text-sm text-gray-500 mt-1">
              {items.length} item{items.length === 1 ? '' : 's'} in your cart
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Items list */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl bg-white p-4 border border-gray-100 shadow-sm"
              >
                {/* Item Image */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span>🛍️</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate text-base">{item.name}</h3>
                  <p className="text-xs text-gray-400">₱{item.price.toFixed(2)} / {item.unit}</p>
                  <p className="text-sm font-extrabold text-emerald-700 mt-1">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-bold text-sm"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-bold text-sm"
                  >
                    +
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove item"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

              {/* Delivery vs Pickup Toggle */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Fulfillment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFulfillmentType('delivery')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      fulfillmentType === 'delivery'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    🚀 Delivery (+₱50)
                  </button>
                  <button
                    onClick={() => setFulfillmentType('pickup')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      fulfillmentType === 'pickup'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    🏪 Pickup (Free)
                  </button>
                </div>
              </div>

              {/* Subtotal calculation */}
              <div className="space-y-3 text-sm border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">₱{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Fulfillment</span>
                  <span className="font-semibold">
                    {deliveryFee > 0 ? `₱${deliveryFee.toFixed(2)}` : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-100 pt-3">
                  <span>Total</span>
                  <span className="text-emerald-700">₱{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <Link
                href={`/checkout?type=${fulfillmentType}`}
                className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
              >
                Proceed to Checkout →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}