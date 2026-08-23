import React from 'react'
import Link from 'next/link'
import MealKitCard from '@/components/storefront/MealKitCard'
import { MEAL_KITS_DATA } from '@/lib/data/mealKits'

export const metadata = {
  title: 'Meal Kits — FreshCart AI',
  description: 'Pre-measured local ingredients and authentic Filipino recipes delivered fresh to your door.',
}

export default function MealKitsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 mb-3">
            🍲 Fresh Pre-Measured Ingredients
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Curated Meal Kits
          </h1>
          <p className="text-base text-gray-600 mt-3 leading-relaxed">
            Skip the prep work and grocery hassle. Get exact ingredient portions and step-by-step cooking recipes delivered right to your kitchen.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/products"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              🛒 Browse All Groceries
            </Link>
          </div>
        </div>

        {/* Kits Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MEAL_KITS_DATA.map((kit) => (
            <MealKitCard key={kit.id} kit={kit} />
          ))}
        </div>

        {/* Custom AI Meal Planner Banner */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-800 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider mb-4">
              🤖 AI Custom Recipe Generator
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Want a custom dish or dietary meal plan?
            </h2>
            <p className="text-emerald-100 text-sm mt-3 leading-relaxed">
              Describe what you want to eat (e.g. &quot;Keto-friendly 3 dinner meals for 2 people under ₱1,500&quot;), and our AI will build custom recipes and auto-fill your cart from real in-stock inventory!
            </p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-emerald-800 shadow-md hover:bg-emerald-50 transition-all"
              >
                Try AI Meal Planning →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}