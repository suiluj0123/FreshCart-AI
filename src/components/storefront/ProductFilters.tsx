'use client'

import React, { useCallback, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { PRODUCT_CATEGORIES } from '@/types/product'

export default function ProductFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentCategory = searchParams.get('category') ?? 'all'
  const currentSearch = searchParams.get('search') ?? ''
  const currentSort = searchParams.get('sort') ?? ''

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all' && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="mb-8 space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {PRODUCT_CATEGORIES.map((cat) => {
          const active = currentCategory === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => updateParam('category', cat.value)}
              disabled={isPending}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-60`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Search + Sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            defaultValue={currentSearch}
            placeholder="Search products..."
            onChange={(e) => {
              const val = e.target.value
              const params = new URLSearchParams(searchParams.toString())
              if (val.trim()) {
                params.set('search', val.trim())
              } else {
                params.delete('search')
              }
              startTransition(() => {
                router.push(`${pathname}?${params.toString()}`)
              })
            }}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Sort */}
        <div className="shrink-0">
          <select
            value={currentSort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
          >
            <option value="">Sort: Default</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Updating results...
        </div>
      )}
    </div>
  )
}
