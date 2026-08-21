'use client'

import React, { useState } from 'react'

export default function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative bg-emerald-600 text-white text-sm font-medium">
      <div className="mx-auto max-w-7xl px-4 py-2.5 text-center sm:px-6 lg:px-8">
        Free Delivery on orders above ₱1,500 across Metro Manila!{' '}
        <a href="/products" className="underline underline-offset-2 hover:text-emerald-100 transition-colors">
          Shop now
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-emerald-700 transition-colors"
        aria-label="Dismiss announcement"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
