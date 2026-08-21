'use client'

import React, { useState } from 'react'
import { useCartContext } from '@/components/storefront/CartProvider'
import type { ProductDetail } from '@/types/product'

interface ProductDetailClientProps {
  product: ProductDetail
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Out of Stock
      </span>
    )
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-600">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Low Stock — only {Math.floor(stock)} left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-600">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      In Stock
    </span>
  )
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addItem, items } = useCartContext()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const outOfStock = product.totalStock === 0
  const isInCart = items.some((i) => i.id === product.id)

  const handleAdd = () => {
    if (outOfStock) return
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.basePrice,
        imageUrl: product.imageUrl ?? undefined,
        unit: product.unit,
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="flex flex-col justify-center p-8 lg:p-10">
      {/* Category */}
      <span className="mb-2 inline-block text-xs font-bold uppercase tracking-wider text-emerald-600">
        {product.category}
      </span>

      {/* Name */}
      <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>

      {/* Price */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-gray-900">
          ₱{product.basePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-sm text-gray-400">per {product.unit}</span>
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
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm'
        }`}
      >
        {outOfStock
          ? 'Out of Stock'
          : added
          ? `✓ Added ${qty > 1 ? `(${qty})` : ''} to Cart!`
          : isInCart
          ? `Add ${qty > 1 ? qty : 'More'} to Cart`
          : `Add${qty > 1 ? ` ${qty}` : ''} to Cart`}
      </button>

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