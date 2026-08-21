'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useCartContext } from '@/components/storefront/CartProvider'
import Button from '@/components/ui/Button'

export interface MealKitIngredient {
  name: string
  quantity: string
  price: number
}

export interface MealKit {
  id: string
  name: string
  description: string
  price: number
  serves: number
  emoji: string
  tags: string[]
  imageUrl?: string
  ingredients: MealKitIngredient[]
}

interface MealKitCardProps {
  kit: MealKit
}

export default function MealKitCard({ kit }: MealKitCardProps) {
  const { addItem, items } = useCartContext()
  const [added, setAdded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)

  const isInCart = items.some((i) => i.id === kit.id)

  const handleAdd = () => {
    addItem({
      id: kit.id,
      name: kit.name,
      price: kit.price,
      imageUrl: kit.imageUrl,
      unit: 'kit',
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <>
      {/* ── Card ── */}
      <div className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-50 to-amber-50">
          {kit.imageUrl && !imgError ? (
            <Image
              src={kit.imageUrl}
              alt={kit.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">
              {kit.emoji}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          {/* Tags */}
          <div className="mb-2 flex flex-wrap gap-1">
            {kit.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="text-base font-bold text-gray-900">{kit.name}</h3>

          {/* Ingredient tags */}
          <div className="mt-2 flex flex-wrap gap-1 flex-1">
            {kit.ingredients.slice(0, 5).map((ing) => (
              <span
                key={ing.name}
                className="inline-block rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {ing.name}
              </span>
            ))}
            {kit.ingredients.length > 5 && (
              <span className="inline-block rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-xs text-gray-400">
                +{kit.ingredients.length - 5} more
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-gray-400">Serves {kit.serves}</div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xl font-extrabold text-gray-900">
              {'P' + kit.price.toLocaleString('en-PH')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewOpen(true)}
                className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                View
              </button>
              <Button
                variant={isInCart ? 'outline' : 'primary'}
                size="sm"
                onClick={handleAdd}
                className="min-w-[96px]"
              >
                {added ? 'Added!' : isInCart ? 'Add Again' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {viewOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setViewOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
              {/* Image header */}
              <div className="relative h-52 overflow-hidden rounded-t-2xl bg-gradient-to-br from-emerald-50 to-amber-50">
                {kit.imageUrl && !imgError ? (
                  <Image
                    src={kit.imageUrl}
                    alt={kit.name}
                    fill
                    className="object-cover"
                    sizes="512px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-7xl">
                    {kit.emoji}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <button
                  onClick={() => setViewOpen(false)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-3 left-4">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {kit.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-xl font-extrabold text-white drop-shadow">{kit.name}</h2>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                <p className="text-sm text-gray-500 mb-1">{kit.description}</p>
                <p className="text-xs text-gray-400 mb-5">Serves {kit.serves}</p>

                {/* Ingredients table */}
                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                  Included Ingredients
                </h3>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="grid grid-cols-3 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="col-span-2">Ingredient</span>
                    <span className="text-right">Price</span>
                  </div>
                  {kit.ingredients.map((ing, idx) => (
                    <div
                      key={ing.name}
                      className={`grid grid-cols-3 px-4 py-3 text-sm ${idx !== kit.ingredients.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                      <div className="col-span-2">
                        <span className="font-medium text-gray-800">{ing.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{ing.quantity}</span>
                      </div>
                      <span className="text-right font-medium text-gray-700">
                        P{ing.price.toLocaleString('en-PH')}
                      </span>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                    <span className="col-span-2 font-bold text-gray-900">Total</span>
                    <span className="text-right font-extrabold text-emerald-700 text-base">
                      P{kit.price.toLocaleString('en-PH')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setViewOpen(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <Button
                    variant={isInCart ? 'outline' : 'primary'}
                    size="lg"
                    onClick={() => { handleAdd(); setViewOpen(false) }}
                    className="flex-1 rounded-xl font-bold"
                  >
                    {isInCart ? 'Add Again' : 'Add to Cart'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
