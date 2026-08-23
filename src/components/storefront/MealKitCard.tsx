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

  // Pantry check: Map of ingredient index -> boolean (true = included in kit)
  const [selectedMap, setSelectedMap] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {}
    kit.ingredients.forEach((_, idx) => {
      initial[idx] = true
    })
    return initial
  })

  const isInCart = items.some((i) => i.id === kit.id || i.id.startsWith(`${kit.id}-custom`))

  const toggleIngredient = (idx: number) => {
    setSelectedMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  // Calculate dynamic custom price based on selected ingredients
  const selectedIngredients = kit.ingredients.filter((_, idx) => selectedMap[idx])
  const calculatedPrice = selectedIngredients.reduce((sum, ing) => sum + ing.price, 0)
  const isCustomized = selectedIngredients.length < kit.ingredients.length

  const handleAdd = () => {
    const priceToUse = isCustomized ? calculatedPrice : kit.price
    const kitItemId = isCustomized
      ? `${kit.id}-custom-${selectedIngredients.length}`
      : kit.id
    const kitItemName = isCustomized
      ? `${kit.name} (Customized — ${selectedIngredients.length}/${kit.ingredients.length} items)`
      : kit.name

    addItem({
      id: kitItemId,
      name: kitItemName,
      price: priceToUse,
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

          <h3 className="text-base font-bold text-gray-900 leading-snug">{kit.name}</h3>
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">{kit.description}</p>
          <p className="mt-1 text-xs text-gray-400 font-medium">Serves {kit.serves}</p>

          {/* Ingredient Pills Preview */}
          <div className="mt-3 flex flex-wrap gap-1">
            {kit.ingredients.slice(0, 3).map((ing) => (
              <span
                key={ing.name}
                className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600"
              >
                {ing.name}
              </span>
            ))}
            {kit.ingredients.length > 3 && (
              <button
                onClick={() => setViewOpen(true)}
                className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                +{kit.ingredients.length - 3} more
              </button>
            )}
          </div>

          {/* Price & Actions */}
          <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
            <div>
              <span className="text-xs text-gray-400 block font-medium">Full Kit Price</span>
              <span className="text-lg font-extrabold text-gray-900">
                ₱{kit.price.toLocaleString('en-PH')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewOpen(true)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Customize
              </button>
              <Button
                variant={added ? 'secondary' : isInCart ? 'outline' : 'primary'}
                size="sm"
                onClick={handleAdd}
                className="rounded-xl font-bold"
              >
                {added ? '✓ Added' : isInCart ? 'In Cart' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail & Pantry Check Modal ── */}
      {viewOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setViewOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
              {/* Image header */}
              <div className="relative h-48 overflow-hidden rounded-t-3xl bg-gradient-to-br from-emerald-50 to-amber-50">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <button
                  onClick={() => setViewOpen(false)}
                  className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
                <div className="absolute bottom-3 left-5 right-5">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {kit.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-xl font-extrabold text-white drop-shadow">{kit.name}</h2>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-xs text-gray-500 mb-1">{kit.description}</p>
                <p className="text-xs text-gray-400 font-medium mb-4">Serves {kit.serves} people</p>

                {/* Pantry check helper banner */}
                <div className="mb-4 rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-base">🥕</span>
                  <div>
                    <span className="font-bold block">Pantry Check Feature</span>
                    <span>Already have some items at home (like oil, salt, or sauces)? Uncheck them to exclude and save on kit price!</span>
                  </div>
                </div>

                {/* Ingredients table with checkboxes */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    Select Ingredients ({selectedIngredients.length}/{kit.ingredients.length})
                  </h3>
                  <button
                    onClick={() => {
                      const allChecked = selectedIngredients.length === kit.ingredients.length
                      const nextMap: Record<number, boolean> = {}
                      kit.ingredients.forEach((_, idx) => {
                        nextMap[idx] = !allChecked
                      })
                      setSelectedMap(nextMap)
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {selectedIngredients.length === kit.ingredients.length ? 'Uncheck All' : 'Select All'}
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {kit.ingredients.map((ing, idx) => {
                    const isChecked = !!selectedMap[idx]
                    return (
                      <div
                        key={ing.name}
                        onClick={() => toggleIngredient(idx)}
                        className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors cursor-pointer ${
                          isChecked ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/70 text-gray-400 line-through'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                          />
                          <div>
                            <span className={`font-semibold ${isChecked ? 'text-gray-800' : 'text-gray-400'}`}>
                              {ing.name}
                            </span>
                            <span className="ml-2 text-[11px] text-gray-400 font-normal">({ing.quantity})</span>
                          </div>
                        </div>
                        <span className={`font-extrabold ${isChecked ? 'text-gray-900' : 'text-gray-400'}`}>
                          ₱{ing.price.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}

                  {/* Summary Total */}
                  <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                    <div>
                      <span className="font-bold text-gray-900 block text-xs">
                        {isCustomized ? 'Customized Kit Total' : 'Full Kit Total'}
                      </span>
                      {isCustomized && (
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          Saved ₱{(kit.price - calculatedPrice).toFixed(2)} from pantry items!
                        </span>
                      )}
                    </div>
                    <span className="text-right font-extrabold text-emerald-800 text-base">
                      ₱{calculatedPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setViewOpen(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={selectedIngredients.length === 0}
                    onClick={() => {
                      handleAdd()
                      setViewOpen(false)
                    }}
                    className="flex-1 rounded-xl font-bold py-3 text-xs"
                  >
                    {isCustomized
                      ? `Add Customized Kit (₱${calculatedPrice.toFixed(2)})`
                      : `Add Full Kit (₱${kit.price.toFixed(2)})`}
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