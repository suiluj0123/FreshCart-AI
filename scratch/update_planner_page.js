const fs = require('fs');

const code = `'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCartContext } from '@/components/storefront/CartProvider'
import { GeneratedRecipe } from '@/lib/ai/generateMealPlan'

const PRESET_PROMPTS = [
  { label: '🇵🇭 Classic Pinoy Dinners', prompt: 'Comforting authentic Filipino dinner recipes for the whole family' },
  { label: '🥗 Keto / Low Carb', prompt: 'Keto-friendly low-carb Filipino meals rich in protein and fresh greens' },
  { label: '💰 Budget Saver (< ₱600)', prompt: 'Budget-friendly, high-nutrition Filipino meals under ₱600 total' },
  { label: '⚡ 15-Min Quick Meals', prompt: 'Fast and easy 15-minute weeknight dinners with minimal prep' },
  { label: '🥩 High-Protein Fitness', prompt: 'High protein muscle-building healthy meals with lean meats and vegetables' },
  { label: '🥕 Fresh Vegetarian', prompt: 'Nutritious all-veggie plant-based Pinoy dishes' },
]

const SWAP_REASONS = [
  'Want chicken or poultry instead',
  'Want a soup / sabaw dish',
  'Make it more budget-friendly',
  'Want something spicy / bicol style',
  'Want seafood / fish dish',
  'Prefer more vegetables',
]

export default function MealPlannerPage() {
  const { addItem } = useCartContext()

  const [prompt, setPrompt] = useState('')
  const [servings, setServings] = useState(4)
  const [budgetLimit, setBudgetLimit] = useState<number | ''>('')
  const [dietaryTag, setDietaryTag] = useState('')

  const [generating, setGenerating] = useState(false)
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [addedToast, setAddedToast] = useState<string | null>(null)

  const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({})

  const [swappingRecipe, setSwappingRecipe] = useState<GeneratedRecipe | null>(null)
  const [swapLoading, setSwapLoading] = useState(false)
  const [customSwapReason, setCustomSwapReason] = useState('')

  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, boolean>>({})
  const [activeInstructionRecipe, setActiveInstructionRecipe] = useState<GeneratedRecipe | null>(null)

  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = customPrompt || prompt
    if (!promptToUse.trim()) {
      setError('Please type what you would like to eat or select a preset prompt above.')
      return
    }

    setGenerating(true)
    setError(null)
    setRecipes([])
    setRatings({})

    try {
      const res = await fetch('/api/meal-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          dietaryTag: dietaryTag || undefined,
          servings,
          budgetLimit: budgetLimit || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate meal plan')
      }

      setRecipes(data.recipes || [])

      const initialMap: Record<string, boolean> = {}
      data.recipes.forEach((rec: GeneratedRecipe) => {
        rec.matchedIngredients.forEach((_, idx) => {
          initialMap[`${rec.id}-${idx}`] = true
        })
      })
      setSelectedIngredients(initialMap)
    } catch (err: any) {
      setError(err?.message || 'Error generating meal plan. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleRateRecipe = async (recipe: GeneratedRecipe, rating: 'up' | 'down') => {
    setRatings((prev) => ({ ...prev, [recipe.id]: rating }))

    try {
      await fetch('/api/meal-plan/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          rating,
          prompt,
        }),
      })

      if (rating === 'up') {
        setAddedToast(`❤️ Thank you! AI will remember you like "${recipe.title}".`)
      } else {
        setAddedToast(`📝 Feedback recorded! Click "Swap Dish" if you want a replacement.`)
      }
      setTimeout(() => setAddedToast(null), 4000)
    } catch (e) {}
  }

  const handleExecuteSwap = async (reason: string) => {
    if (!swappingRecipe) return
    setSwapLoading(true)

    try {
      const res = await fetch('/api/meal-plan/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentRecipeTitle: swappingRecipe.title,
          swapReason: reason,
          servings,
        }),
      })

      const data = await res.json()

      if (data.success && data.replacementRecipe) {
        const rep = data.replacementRecipe
        setRecipes((prev) =>
          prev.map((r) => (r.id === swappingRecipe.id ? rep : r))
        )

        setSelectedIngredients((prev) => {
          const next = { ...prev }
          rep.matchedIngredients.forEach((_: any, idx: number) => {
            next[`${rep.id}-${idx}`] = true
          })
          return next
        })

        setAddedToast(`✨ Swapped to "${rep.title}"!`)
        setTimeout(() => setAddedToast(null), 4000)
        setSwappingRecipe(null)
      } else {
        alert(data.error || 'Failed to swap dish.')
      }
    } catch (err) {
      alert('Error swapping dish. Please try again.')
    } finally {
      setSwapLoading(false)
    }
  }

  const toggleIngredient = (recipeId: string, idx: number) => {
    const key = `${recipeId}-${idx}`
    setSelectedIngredients((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleAddRecipeToCart = (recipe: GeneratedRecipe) => {
    let count = 0
    recipe.matchedIngredients.forEach((ing, idx) => {
      const isChecked = selectedIngredients[`${recipe.id}-${idx}`] !== false
      if (isChecked) {
        addItem(
          {
            id: ing.productId,
            name: ing.productName,
            price: ing.price,
            imageUrl: ing.imageUrl ?? undefined,
            unit: ing.unit,
          },
          ing.quantityNeeded
        )
        count += ing.quantityNeeded
      }
    })

    setAddedToast(`✓ Added ${count} ingredients for "${recipe.title}" to your cart!`)
    setTimeout(() => setAddedToast(null), 5000)
  }

  const handleAddEntirePlanToCart = () => {
    let count = 0
    recipes.forEach((rec) => {
      rec.matchedIngredients.forEach((ing, idx) => {
        const isChecked = selectedIngredients[`${rec.id}-${idx}`] !== false
        if (isChecked) {
          addItem(
            {
              id: ing.productId,
              name: ing.productName,
              price: ing.price,
              imageUrl: ing.imageUrl ?? undefined,
              unit: ing.unit,
            },
            ing.quantityNeeded
          )
          count += ing.quantityNeeded
        }
      })
    })

    setAddedToast(`✓ Added all ${count} ingredients from your AI Meal Plan to your cart!`)
    setTimeout(() => setAddedToast(null), 6000)
  }

  const totalCartCost = recipes.reduce((recSum, rec) => {
    return (
      recSum +
      rec.matchedIngredients.reduce((ingSum, ing, idx) => {
        const isChecked = selectedIngredients[`${rec.id}-${idx}`] !== false
        return isChecked ? ingSum + ing.price * ing.quantityNeeded : ingSum
      }, 0)
    )
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 mb-3">
            🇵🇭 Trained on Authentic Filipino Homestyle Cooking & Local Supermarket Stock
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            AI Meal Planner & Recipe Cart
          </h1>
          <p className="text-base text-gray-600 mt-3 leading-relaxed">
            Tell our AI chef what you want to eat. We craft authentic recipes following traditional Pinoy flavor profiles, auto-match live grocery inventory, and fill your cart in 1 click.
          </p>
        </div>

        {addedToast && (
          <div className="mb-8 flex items-center justify-between rounded-2xl bg-emerald-600 p-4 text-white shadow-xl animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span>{addedToast}</span>
            </div>
            <Link
              href="/cart"
              className="rounded-xl bg-white px-4 py-1.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-sm"
            >
              Go to Cart →
            </Link>
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-gray-100 shadow-sm mb-10 space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              What would your family love to eat this week?
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. 3 comforting Pinoy dinners with pork and vegetables under ₱1,200"
                className="flex-1 rounded-2xl border border-gray-200 px-4 py-3.5 text-sm font-medium text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-sm"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                {generating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Chef AI is Cooking...</span>
                  </>
                ) : (
                  <>
                    <span>Generate AI Plan ✨</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Popular Filipino Favorites:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setPrompt(preset.prompt)
                    handleGenerate(preset.prompt)
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Portion Servings</label>
              <select
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 p-2.5 bg-white font-medium focus:border-emerald-600 focus:outline-none"
              >
                <option value={2}>2 Persons (Couples / Solo)</option>
                <option value={4}>4 Persons (Standard Family)</option>
                <option value={6}>6+ Persons (Big Family / Gathering)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Target Budget Limit</label>
              <select
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border border-gray-200 p-2.5 bg-white font-medium focus:border-emerald-600 focus:outline-none"
              >
                <option value="">Flexible / Best Flavor</option>
                <option value={500}>Under ₱500 (Budget Saver)</option>
                <option value={1000}>Under ₱1,000 (Standard Family)</option>
                <option value={1500}>Under ₱1,500 (Fiesta / Multi-Dish)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Diet Focus</label>
              <select
                value={dietaryTag}
                onChange={(e) => setDietaryTag(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 bg-white font-medium focus:border-emerald-600 focus:outline-none"
              >
                <option value="">All Cuisines</option>
                <option value="Keto">Keto & Low Carb</option>
                <option value="High Protein">High Protein Fitness</option>
                <option value="Budget">Budget Value</option>
                <option value="Quick">Quick 15-Minute Meals</option>
                <option value="Vegetarian">Plant-Based / Veggie</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl bg-red-50 p-4 border border-red-200 text-xs font-semibold text-red-700">
            ⚠️ {error}
          </div>
        )}

        {generating && (
          <div className="rounded-3xl bg-white p-12 text-center border border-gray-100 shadow-sm max-w-lg mx-auto space-y-4">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
              <span className="animate-bounce">🍲</span>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900">Crafting Your AI Meal Plan...</h3>
            <div className="space-y-1 text-xs text-gray-500 font-medium">
              <p>🇵🇭 Sautéing garlic and onions (Gisa order)...</p>
              <p>🔍 Auto-matching fresh meats and local produce in stock...</p>
              <p>🛒 Calculating family portions and total cart pricing...</p>
            </div>
          </div>
        )}

        {!generating && recipes.length > 0 && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-800 p-6 text-white shadow-lg">
              <div>
                <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wide">
                  AI Meal Plan ({recipes.length} Dishes)
                </span>
                <h2 className="text-2xl font-extrabold mt-1">Ready for 1-Click Cart Checkout</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Matched to active grocery inventory with authentic Filipino cooking steps.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-emerald-200 block font-medium">Estimated Total</span>
                  <span className="text-2xl font-extrabold">₱{totalCartCost.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleAddEntirePlanToCart}
                  className="rounded-2xl bg-white px-5 py-3 text-xs font-extrabold text-emerald-800 shadow-md hover:bg-emerald-50 transition-all cursor-pointer shrink-0"
                >
                  Add Entire Plan to Cart 🛒
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {recipes.map((recipe) => {
                const recipeCost = recipe.matchedIngredients.reduce((sum, ing, idx) => {
                  const isChecked = selectedIngredients[`${recipe.id}-${idx}`] !== false
                  return isChecked ? sum + ing.price * ing.quantityNeeded : sum
                }, 0)

                const userRating = ratings[recipe.id]

                return (
                  <div
                    key={recipe.id}
                    className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 flex flex-col justify-between space-y-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex flex-wrap gap-1">
                          {recipe.dietTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <span className="text-xs text-gray-400 font-medium">
                          ⏱️ {recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins • {recipe.caloriesPerServing} kcal/srv
                        </span>
                      </div>

                      <h3 className="text-xl font-extrabold text-gray-900">{recipe.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{recipe.description}</p>

                      {(recipe.chefTip || recipe.suggestedSawsawan) && (
                        <div className="mt-3 rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/70 text-xs space-y-1.5">
                          {recipe.chefTip && (
                            <div className="flex items-start gap-1.5 text-amber-950">
                              <span className="font-bold shrink-0">💡 Chef's Secret:</span>
                              <span className="leading-snug">{recipe.chefTip}</span>
                            </div>
                          )}
                          {recipe.suggestedSawsawan && (
                            <div className="flex items-center gap-1.5 text-amber-900">
                              <span className="font-bold shrink-0">🥣 Pair with:</span>
                              <span className="font-medium bg-white px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                                {recipe.suggestedSawsawan}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                            Required Ingredients ({recipe.matchedIngredients.length})
                          </h4>
                          <span className="text-[11px] text-gray-400">Uncheck pantry items to save</span>
                        </div>

                        <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden text-xs">
                          {recipe.matchedIngredients.map((ing, idx) => {
                            const isChecked = selectedIngredients[`${recipe.id}-${idx}`] !== false
                            return (
                              <div
                                key={ing.productId + idx}
                                onClick={() => toggleIngredient(recipe.id, idx)}
                                className={`flex items-center justify-between px-3.5 py-2 transition-colors cursor-pointer ${
                                  isChecked ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/80 text-gray-400 line-through'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 pointer-events-none"
                                  />
                                  <span className={isChecked ? 'font-semibold text-gray-800' : 'text-gray-400'}>
                                    {ing.productName}
                                  </span>
                                  <span className="text-[11px] text-gray-400">
                                    ({ing.quantityNeeded} {ing.unit})
                                  </span>
                                </div>
                                <span className={`font-bold ${isChecked ? 'text-gray-900' : 'text-gray-400'}`}>
                                  ₱{(ing.price * ing.quantityNeeded).toFixed(2)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-400">AI Taste Match:</span>
                        <button
                          onClick={() => handleRateRecipe(recipe, 'up')}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                            userRating === 'up' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          👍 {userRating === 'up' ? 'Loved!' : 'Good'}
                        </button>
                        <button
                          onClick={() => handleRateRecipe(recipe, 'down')}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                            userRating === 'down' ? 'bg-red-100 text-red-800 font-bold' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          👎 {userRating === 'down' ? 'Not for me' : 'Dislike'}
                        </button>
                      </div>

                      <button
                        onClick={() => setSwappingRecipe(recipe)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                      >
                        🔄 Swap Dish
                      </button>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-gray-400 block font-medium">Recipe Subtotal</span>
                        <span className="text-lg font-extrabold text-emerald-700">₱{recipeCost.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveInstructionRecipe(recipe)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          📖 Cooking Steps
                        </button>
                        <button
                          onClick={() => handleAddRecipeToCart(recipe)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          Add Dish to Cart 🛒
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {swappingRecipe && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSwappingRecipe(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      Swap Dish Alternative
                    </span>
                    <h3 className="text-lg font-extrabold text-gray-900 mt-1">
                      Replace "{swappingRecipe.title}"
                    </h3>
                  </div>
                  <button
                    onClick={() => setSwappingRecipe(null)}
                    className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-2">
                    Why would you like to swap this dish?
                  </span>
                  <div className="space-y-1.5">
                    {SWAP_REASONS.map((reason) => (
                      <button
                        key={reason}
                        disabled={swapLoading}
                        onClick={() => handleExecuteSwap(reason)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold text-gray-700 hover:text-emerald-900 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {reason} →
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <input
                    type="text"
                    value={customSwapReason}
                    onChange={(e) => setCustomSwapReason(e.target.value)}
                    placeholder="Or type custom request (e.g. want beef stew)..."
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-medium focus:border-emerald-600 focus:outline-none mb-2"
                  />
                  {customSwapReason && (
                    <button
                      disabled={swapLoading}
                      onClick={() => handleExecuteSwap(customSwapReason)}
                      className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
                    >
                      {swapLoading ? 'Generating alternative...' : 'Swap with Custom Request ✨'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeInstructionRecipe && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setActiveInstructionRecipe(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Authentic Step-by-Step Cooking Guide
                    </span>
                    <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
                      {activeInstructionRecipe.title}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ⏱️ {activeInstructionRecipe.prepTimeMinutes} mins prep • {activeInstructionRecipe.cookTimeMinutes} mins cook • Serves {activeInstructionRecipe.servings}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveInstructionRecipe(null)}
                    className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {activeInstructionRecipe.chefTip && (
                  <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <span className="font-bold block mb-0.5">💡 Chef's Secret for Maximum Flavor:</span>
                    <span>{activeInstructionRecipe.chefTip}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {activeInstructionRecipe.instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 text-xs leading-relaxed">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 font-medium pt-0.5">{step}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      handleAddRecipeToCart(activeInstructionRecipe)
                      setActiveInstructionRecipe(null)
                    }}
                    className="w-full rounded-2xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
                  >
                    Add Ingredients for this Dish to Cart 🛒
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
`;

fs.writeFileSync('src/app/(storefront)/meal-planner/page.tsx', code, 'utf8');
console.log('Successfully wrote meal planner page');