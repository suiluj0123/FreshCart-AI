'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useCartContext } from '@/components/storefront/CartProvider'
import Button from '@/components/ui/Button'

export interface MealKit {
  id: string
  name: string
  description: string
  price: number
  serves: number
  emoji: string
  tags: string[]
  imageUrl?: string
}

interface MealKitCardProps {
  kit: MealKit
}

export default function MealKitCard({ kit }: MealKitCardProps) {
  const { addItem, items } = useCartContext()
  const [added, setAdded] = useState(false)
  const [imgError, setImgError] = useState(false)

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
    <div className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
      {/* Image area */}
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
        <p className="mt-1 text-sm text-gray-500 flex-1 line-clamp-2">{kit.description}</p>
        <div className="mt-1 text-xs text-gray-400">Serves {kit.serves}</div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gray-900">
            {'P' + kit.price.toLocaleString('en-PH')}
          </span>
          <Button
            variant={isInCart ? 'outline' : 'primary'}
            size="sm"
            onClick={handleAdd}
            className="min-w-[108px]"
          >
            {added ? 'Added!' : isInCart ? 'Add Again' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </div>
  )
}
