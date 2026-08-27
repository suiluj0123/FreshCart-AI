'use client'

import React, { useState, useEffect } from 'react'
import { useCartContext } from '@/components/storefront/CartProvider'
import type { ProductDetail } from '@/types/product'

interface ProductDetailClientProps {
  product: ProductDetail
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600 border border-red-200">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Out of Stock
      </span>
    )
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-700 border border-amber-200 animate-pulse shadow-xs">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        ⚡ Only {Math.floor(stock)} left in stock — order soon!
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 border border-emerald-200">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      In Stock ({Math.floor(stock)} units available)
    </span>
  )
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addItem, items } = useCartContext()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const outOfStock = product.totalStock === 0
  const isInCart = items.some((i) => i.id === product.id)

  const sellingPrice = product.effectivePrice ?? product.basePrice
  const hasMarkdown = Boolean(product.isClearance && product.discountPct && product.discountPct > 0)
  const savings = hasMarkdown ? product.basePrice - sellingPrice : 0

  const handleAdd = () => {
    if (outOfStock) return
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: sellingPrice,
        imageUrl: product.imageUrl ?? undefined,
        unit: product.unit,
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="flex flex-col justify-center p-8 lg:p-10">
      {/* Category & Clearance Badge */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-600">
          {product.category}
        </span>
        {hasMarkdown && product.markdownBadge && (
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-white uppercase tracking-tight shadow-xs animate-pulse">
            {product.markdownBadge}
          </span>
        )}
      </div>

      {/* Name */}
      <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>

      {/* Price with Clearance Savings */}
      <div className="mt-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-3xl font-extrabold ${hasMarkdown ? 'text-red-600' : 'text-gray-900'}`}>
            ₱{sellingPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
          {hasMarkdown && (
            <span className="text-lg text-gray-400 line-through font-bold">
              ₱{product.basePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          )}
          <span className="text-sm text-gray-400">per {product.unit}</span>
        </div>

        {hasMarkdown && (
          <p className="text-xs font-bold text-emerald-700 mt-1">
            ✓ Save ₱{savings.toFixed(2)} ({product.discountPct}% OFF Freshness Clearance)
          </p>
        )}
      </div>

      {/* Stock badge */}
      <div className="mt-4">
        <StockBadge stock={product.totalStock} />
      </div>

      {/* Divider */}
      <div className="my-6 border-t border-gray-100" />

      {/* Quantity selector */}
      {!outOfStock && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Quantity</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-lg font-bold"
            >
              −
            </button>
            <span className="min-w-[2rem] text-center text-lg font-bold text-gray-900">
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(Math.floor(product.totalStock), q + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-lg font-bold"
            >
              +
            </button>
            <span className="text-xs text-gray-400">
              Max: {Math.floor(product.totalStock)} {product.unit}
            </span>
          </div>
        </div>
      )}

      {/* Total */}
      {!outOfStock && qty > 1 && (
        <p className="mb-4 text-sm text-gray-500">
          Total:{' '}
          <span className="font-bold text-gray-900">
            ₱{(product.basePrice * qty).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </p>
      )}

      {/* Add to Cart button */}
      <button
        onClick={handleAdd}
        disabled={outOfStock}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${
          outOfStock
            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : added
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm cursor-pointer'
        }`}
      >
        {outOfStock
          ? 'Currently Sold Out'
          : added
          ? `✓ Added ${qty > 1 ? `(${qty})` : ''} to Cart!`
          : isInCart
          ? `Add ${qty > 1 ? qty : 'More'} to Cart`
          : `Add${qty > 1 ? ` ${qty}` : ''} to Cart`}
      </button>

      {/* Out of Stock Smart Substitutes Widget */}
      {outOfStock && (
        <SubstitutesWidget targetProductId={product.id} />
      )}

      {/* Info */}
      <div className="mt-6 space-y-2 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Fresh, locally sourced products
        </div>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Same-day delivery available
        </div>
      </div>
    </div>
  )
}

function SubstitutesWidget({ targetProductId }: { targetProductId: string }) {
  const { addItem } = useCartContext()
  const [substitutes, setSubstitutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addedId, setAddedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/products/${targetProductId}/substitutes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.substitutes) {
          setSubstitutes(data.substitutes)
        }
      })
      .catch((err) => console.error('Failed to load substitutes:', err))
      .finally(() => setLoading(false))
  }, [targetProductId])

  if (loading) {
    return (
      <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-400">
        Finding available in-stock alternatives...
      </div>
    )
  }

  if (substitutes.length === 0) return null

  return (
    <div className="mt-5 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">🔄</span>
        <div>
          <h4 className="text-xs font-bold text-gray-900">Recommended In-Stock Alternatives</h4>
          <p className="text-[11px] text-gray-500">Don&apos;t miss out — try these fresh in-stock substitutes:</p>
        </div>
      </div>

      <div className="space-y-2">
        {substitutes.map((sub) => {
          const subPrice = sub.effectivePrice ?? sub.basePrice
          const isAdded = addedId === sub.id

          return (
            <div
              key={sub.id}
              className="bg-white rounded-xl p-2.5 border border-emerald-100 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{sub.name}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                  <span className="font-bold text-emerald-800">₱{subPrice.toFixed(2)}/{sub.unit}</span>
                  <span>•</span>
                  <span className="text-gray-400 truncate">{sub.matchReason}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  addItem({
                    id: sub.id,
                    name: sub.name,
                    price: subPrice,
                    imageUrl: sub.imageUrl ?? undefined,
                    unit: sub.unit,
                  })
                  setAddedId(sub.id)
                  setTimeout(() => setAddedId(null), 1500)
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isAdded
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isAdded ? '✓ Added' : '+ Add'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}