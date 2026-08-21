import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProductById } from '@/lib/db/products'
import ProductDetailClient from '@/components/storefront/ProductDetailClient'

interface ProductDetailPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) return notFound()

  const CATEGORY_ICONS: Record<string, string> = {
    produce: '🥦',
    dairy: '🥛',
    pantry: '🛒',
    meat: '🥩',
    frozen: '❄️',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-emerald-700 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-emerald-700 transition-colors">Shop</Link>
          <span>/</span>
          <span className="capitalize text-gray-400">{product.category}</span>
          <span>/</span>
          <span className="text-gray-900 font-medium line-clamp-1">{product.name}</span>
        </nav>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Image / Icon Panel */}
            <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-12 min-h-64">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="max-h-64 w-full object-contain"
                />
              ) : (
                <span className="text-9xl select-none">
                  {CATEGORY_ICONS[product.category] ?? '🛍️'}
                </span>
              )}
            </div>

            {/* Detail Panel (client for cart interaction) */}
            <ProductDetailClient product={product} />
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Shop
          </Link>
        </div>
      </div>
    </div>
  )
}