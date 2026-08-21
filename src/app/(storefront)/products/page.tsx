import React, { Suspense } from 'react'
import { getProducts } from '@/lib/db/products'
import ProductCard from '@/components/storefront/ProductCard'
import ProductFilters from '@/components/storefront/ProductFilters'
import type { ProductFilters as Filters } from '@/types/product'

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string
    search?: string
    sort?: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams

  const filters: Filters = {
    category: params.category,
    search: params.search,
    sort: params.sort === 'price_asc' || params.sort === 'price_desc' ? params.sort : undefined,
  }

  const products = await getProducts(filters)

  const totalCount = products.length
  const outOfStockCount = products.filter((p) => p.totalStock === 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Shop Groceries</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fresh, locally sourced products — delivered to your door.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters (client component wrapped in Suspense for useSearchParams) */}
        <Suspense fallback={<div className="mb-8 h-20 animate-pulse rounded-2xl bg-gray-100" />}>
          <ProductFilters />
        </Suspense>

        {/* Results summary */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {totalCount === 0
              ? 'No products found'
              : `${totalCount} product${totalCount === 1 ? '' : 's'} found${outOfStockCount > 0 ? ` · ${outOfStockCount} out of stock` : ''}`}
          </p>
          {params.search && (
            <p className="text-sm text-emerald-700 font-medium">
              Results for &ldquo;{params.search}&rdquo;
            </p>
          )}
        </div>

        {/* Product grid */}
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
            <span className="mb-4 text-5xl">🔍</span>
            <h3 className="text-base font-bold text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try a different category or search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
