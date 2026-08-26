'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCartContext } from '@/components/storefront/CartProvider'
import { ProductWithStock, getProductCategoryLabel } from '@/types/product'

interface ProductCardProps {
  product: ProductWithStock
}

const CATEGORY_ICONS: Record<string, string> = {
  produce: '🥦',
  dairy: '🥛',
  pantry: '🛒',
  meat: '🥩',
  frozen: '❄️',
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Out of Stock
      </span>
    )
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Low Stock
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      In Stock
    </span>
  )
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, items } = useCartContext()
  const [added, setAdded] = useState(false)

  const isInCart = items.some((i) => i.id === product.id)
  const outOfStock = product.totalStock === 0
  const categoryLabel = getProductCategoryLabel(product)

  const handleAdd = () => {
    if (outOfStock) return
    addItem({
      id: product.id,
      name: product.name,
      price: product.basePrice,
      imageUrl: product.imageUrl ?? undefined,
      unit: product.unit,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className={`group flex flex-col rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden ${outOfStock ? 'border-gray-100 opacity-75' : 'border-gray-100'}`}>
      {/* Image / Icon area */}
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="text-6xl select-none transition-transform duration-300 group-hover:scale-110">
              {CATEGORY_ICONS[product.category] ?? '🛍️'}
            </span>
          )}
          {/* Category badge overlay */}
          <span className="absolute left-3 top-3 rounded-full bg-white/95 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-bold text-gray-700 shadow-sm border border-gray-100/80">
            {categoryLabel}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/products/${product.id}`} className="flex-1">
          <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 hover:text-emerald-700 transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2">
          <StockBadge stock={product.totalStock} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <span className="text-lg font-extrabold text-gray-900">
              ₱{product.basePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
            <span className="ml-1 text-xs text-gray-400">/{product.unit}</span>
          </div>

          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              outOfStock
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : added
                ? 'bg-emerald-100 text-emerald-700'
                : isInCart
                ? 'border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            {outOfStock ? 'Unavailable' : added ? '✓ Added' : isInCart ? 'Add Again' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
