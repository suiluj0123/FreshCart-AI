'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId') || 'FC-ORDER'
  const total = searchParams.get('total') || '0.00'

  return (
    <div className="min-h-[85vh] bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 border border-gray-100 shadow-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl mb-4">
          ✓
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-sm text-gray-500 mb-6">
          Thank you for ordering with FreshCart AI! We are preparing your fresh groceries now.
        </p>

        <div className="rounded-xl bg-gray-50 p-4 text-left text-sm mb-6 space-y-2 border border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500">Order ID:</span>
            <span className="font-mono font-bold text-gray-900">{orderId.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Paid:</span>
            <span className="font-extrabold text-emerald-700">₱{parseFloat(total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              ● Placed
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/products"
            className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  )
}