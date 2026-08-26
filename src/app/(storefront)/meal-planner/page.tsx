'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useCartContext } from '@/components/storefront/CartProvider'
import { GeneratedRecipe, CatalogProduct, MatchedIngredient } from '@/lib/ai/generateMealPlan'

interface PresetConfig {
  label: string
  prompt: string
  dietaryTag: string
  budgetLimit?: number
}

const PRESET_OPTIONS: PresetConfig[] = [
  { label: 'Classic Dinners', prompt: 'Comforting authentic Filipino dinner recipes for the whole family', dietaryTag: '' },
  { label: 'Keto & Low Carb', prompt: 'Keto-friendly low-carb Filipino dishes with meats and leafy greens', dietaryTag: 'Keto' },
  { label: 'Budget Saver (< ₱500)', prompt: 'Budget-friendly, high-nutrition Filipino meals under ₱500 total', dietaryTag: 'Budget', budgetLimit: 500 },
  { label: 'Quick 15-Minute Meals', prompt: 'Fast and easy 15-minute weeknight dinners with minimal prep', dietaryTag: 'Quick' },
  { label: 'High Protein', prompt: 'High protein meals with lean meats, fish, and eggs', dietaryTag: 'High Protein' },
  { label: 'Vegetarian', prompt: 'Nutritious plant-based vegetable dishes', dietaryTag: 'Vegetarian' },
]

const SWAP_REASONS = [
  'Want chicken or poultry instead',
  'Want a soup or broth dish',
  'Make it more budget-friendly',
  'Want something spicy',
  'Want seafood or fish',
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
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [addedToast, setAddedToast] = useState<string | null>(null)

  const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({})

  const [swappingRecipe, setSwappingRecipe] = useState<GeneratedRecipe | null>(null)
  const [swapLoading, setSwapLoading] = useState(false)
  const [customSwapReason, setCustomSwapReason] = useState('')

  const [replacingIngredient, setReplacingIngredient] = useState<{
    recipeId: string
    ingredientIndex: number
    currentIngredient: MatchedIngredient
  } | null>(null)
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, boolean>>({})
  const [activeInstructionRecipe, setActiveInstructionRecipe] = useState<GeneratedRecipe | null>(null)

  const handleApplyPreset = (preset: PresetConfig) => {
    setPrompt(preset.prompt)
    setDietaryTag(preset.dietaryTag)
    if (preset.budgetLimit) {
      setBudgetLimit(preset.budgetLimit)
    }
    handleGenerate(preset.prompt, preset.dietaryTag, preset.budgetLimit)
  }

  const handleGenerate = async (
    customPrompt?: string,
    overrideDiet?: string,
    overrideBudget?: number | ''
  ) => {
    const rawPrompt = customPrompt !== undefined ? customPrompt : prompt
    const dietToUse = overrideDiet !== undefined ? overrideDiet : dietaryTag
    const budgetToUse = overrideBudget !== undefined ? overrideBudget : budgetLimit

    // Build intelligent prompt combining text and selected options
    let promptToUse = rawPrompt.trim()
    if (!promptToUse) {
      const parts = [
        dietToUse ? `${dietToUse} Filipino meals` : 'Authentic Filipino homestyle meals',
        `for ${servings} persons`,
        budgetToUse ? `under ₱${budgetToUse}` : '',
      ].filter(Boolean)
      promptToUse = parts.join(' ')
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
          dietaryTag: dietToUse || undefined,
          servings,
          budgetLimit: budgetToUse || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate meal plan')
      }

      setRecipes(data.recipes || [])
      if (Array.isArray(data.catalog)) {
        setCatalog(data.catalog)
      }

      const initialMap: Record<string, boolean> = {}
      data.recipes.forEach((rec: GeneratedRecipe) => {
        rec.matchedIngredients.forEach((_, idx) => {
          initialMap[rec.id + '-' + idx] = true
        })
      })
      setSelectedIngredients(initialMap)
    } catch (err: any) {
      setError(err?.message || 'Error generating meal plan. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectReplacement = (newProduct: CatalogProduct) => {
    if (!replacingIngredient) return
    const { recipeId, ingredientIndex, currentIngredient } = replacingIngredient

    setRecipes((prev) =>
      prev.map((rec) => {
        if (rec.id !== recipeId) return rec
        const updatedIngredients = [...rec.matchedIngredients]
        const oldIng = updatedIngredients[ingredientIndex]
        updatedIngredients[ingredientIndex] = {
          ...oldIng,
          productId: newProduct.id,
          productName: newProduct.name,
          unit: newProduct.unit,
          price: newProduct.basePrice,
          imageUrl: newProduct.imageUrl,
          ingredientLabel: newProduct.name,
        }

        const newEstimatedCost = updatedIngredients.reduce(
          (sum, ing) => sum + ing.price * ing.quantityNeeded,
          0
        )

        return {
          ...rec,
          matchedIngredients: updatedIngredients,
          estimatedCost: newEstimatedCost,
        }
      })
    )

    setAddedToast(`Replaced "${currentIngredient.productName}" with "${newProduct.name}"`)
    setTimeout(() => setAddedToast(null), 4000)
    setReplacingIngredient(null)
    setIngredientSearch('')
  }

  const handleRemoveIngredient = (recipeId: string, ingredientIndex: number) => {
    setRecipes((prev) =>
      prev.map((rec) => {
        if (rec.id !== recipeId) return rec
        const removedIng = rec.matchedIngredients[ingredientIndex]
        const updatedIngredients = rec.matchedIngredients.filter((_, idx) => idx !== ingredientIndex)
        const newEstimatedCost = updatedIngredients.reduce(
          (sum, ing) => sum + ing.price * ing.quantityNeeded,
          0
        )
        if (removedIng) {
          setAddedToast(`Removed "${removedIng.productName}" from recipe`)
          setTimeout(() => setAddedToast(null), 3500)
        }
        return {
          ...rec,
          matchedIngredients: updatedIngredients,
          estimatedCost: newEstimatedCost,
        }
      })
    )
  }

  const filteredCatalogProducts = useMemo(() => {
    return catalog.filter((p) => {
      const matchSearch =
        !ingredientSearch.trim() ||
        p.name.toLowerCase().includes(ingredientSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(ingredientSearch.toLowerCase())

      const matchCat =
        selectedCategory === 'All' ||
        p.category.toLowerCase().includes(selectedCategory.toLowerCase())

      return matchSearch && matchCat
    })
  }, [catalog, ingredientSearch, selectedCategory])

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
          prompt: prompt || dietaryTag || 'Filipino meal plan',
        }),
      })

      if (rating === 'up') {
        setAddedToast('Saved preference: ' + recipe.title)
      } else {
        setAddedToast('Feedback saved. You can click "Replace Dish" to get an alternative.')
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
            next[rep.id + '-' + idx] = true
          })
          return next
        })

        setAddedToast('Replaced with: ' + rep.title)
        setTimeout(() => setAddedToast(null), 4000)
        setSwappingRecipe(null)
      } else {
        alert(data.error || 'Failed to replace dish.')
      }
    } catch (err) {
      alert('Error replacing dish. Please try again.')
    } finally {
      setSwapLoading(false)
    }
  }

  const toggleIngredient = (recipeId: string, idx: number) => {
    const key = recipeId + '-' + idx
    setSelectedIngredients((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleAddRecipeToCart = (recipe: GeneratedRecipe) => {
    let count = 0
    recipe.matchedIngredients.forEach((ing, idx) => {
      const isChecked = selectedIngredients[recipe.id + '-' + idx] !== false
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

    setAddedToast('✓ Added ' + count + ' ingredients for ' + recipe.title + ' to your cart!')
    setTimeout(() => setAddedToast(null), 5000)
  }

  const handleAddEntirePlanToCart = () => {
    let count = 0
    recipes.forEach((rec) => {
      rec.matchedIngredients.forEach((ing, idx) => {
        const isChecked = selectedIngredients[rec.id + '-' + idx] !== false
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

    setAddedToast('✓ Added all ' + count + ' ingredients from your AI Meal Plan to your cart!')
    setTimeout(() => setAddedToast(null), 6000)
  }

  const totalCartCost = recipes.reduce((recSum, rec) => {
    return (
      recSum +
      rec.matchedIngredients.reduce((ingSum, ing, idx) => {
        const isChecked = selectedIngredients[rec.id + '-' + idx] !== false
        return isChecked ? ingSum + ing.price * ing.quantityNeeded : ingSum
      }, 0)
    )
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80 mb-3">
            Personalized meal planning with direct supermarket grocery matching
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Meal Planner & Recipe Cart
          </h1>
          <p className="text-base text-gray-600 mt-3 leading-relaxed">
            Tell us what you would like to cook or select your preferences below. We recommend recipes, check available store stock, and let you add all ingredients to your cart in one click.
          </p>
        </div>

        {addedToast && (
          <div className="mb-8 flex items-center justify-between rounded-2xl bg-emerald-700 p-4 text-white shadow-xl animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{addedToast}</span>
            </div>
            <Link
              href="/cart"
              className="rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-sm"
            >
              Go to Cart →
            </Link>
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-gray-100 shadow-sm mb-10 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                What dish or ingredients do you have in mind? (Optional)
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                Leave blank to plan based on the options below
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Chicken Adobo with potatoes and eggs, or Sinigang na Baboy..."
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
                    <span>Planning Meals...</span>
                  </>
                ) : (
                  <span>Generate Meal Plan</span>
                )}
              </button>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Popular Quick Options:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_OPTIONS.map((preset) => {
                const isSelected = dietaryTag === preset.dietaryTag && (preset.budgetLimit ? budgetLimit === preset.budgetLimit : true)
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
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
                <option value={6}>6+ Persons (Large Family / Group)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Target Budget</label>
              <select
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border border-gray-200 p-2.5 bg-white font-medium focus:border-emerald-600 focus:outline-none"
              >
                <option value="">Flexible Budget</option>
                <option value={500}>Under ₱500 (Budget Saver)</option>
                <option value={1000}>Under ₱1,000 (Standard Family)</option>
                <option value={1500}>Under ₱1,500 (Multi-Dish)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Diet Focus</label>
              <select
                value={dietaryTag}
                onChange={(e) => setDietaryTag(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 bg-white font-medium focus:border-emerald-600 focus:outline-none"
              >
                <option value="">All Cuisines (Homestyle)</option>
                <option value="Quick">Quick 15-Minute Meals</option>
                <option value="Keto">Keto & Low Carb</option>
                <option value="High Protein">High Protein</option>
                <option value="Budget">Budget Value</option>
                <option value="Vegetarian">Vegetarian</option>
              </select>
            </div>
          </div>

          {/* Active criteria summary badge */}
          <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-200 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <span className="font-bold text-gray-900">Selected Options:</span>
              <span className="bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-800">
                {servings} Persons
              </span>
              <span className="bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-800">
                {budgetLimit ? `Budget: < ₱${budgetLimit}` : 'Flexible Budget'}
              </span>
              <span className="bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-800">
                {dietaryTag ? `Diet: ${dietaryTag}` : 'Homestyle Meals'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleGenerate()}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
            >
              Generate with these options →
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl bg-red-50 p-4 border border-red-200 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {generating && (
          <div className="rounded-3xl bg-white p-12 text-center border border-gray-100 shadow-sm max-w-lg mx-auto space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <svg className="h-7 w-7 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Planning Your Meals...</h3>
            <div className="space-y-1.5 text-xs text-gray-500 font-medium">
              <p>Preparing recipe recommendations...</p>
              <p>Checking available supermarket inventory in stock...</p>
              <p>Calculating portion quantities and pricing...</p>
            </div>
          </div>
        )}

        {!generating && recipes.length > 0 && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white shadow-lg">
              <div>
                <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide">
                  Suggested Meal Plan ({recipes.length} Dishes)
                </span>
                <h2 className="text-2xl font-bold mt-1">Ready for Cart Checkout</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Matched to in-stock grocery items with clear cooking instructions.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-emerald-200 block font-medium">Estimated Total</span>
                  <span className="text-2xl font-extrabold">₱{totalCartCost.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleAddEntirePlanToCart}
                  className="rounded-2xl bg-white px-5 py-3 text-xs font-bold text-emerald-800 shadow-md hover:bg-emerald-50 transition-all cursor-pointer shrink-0"
                >
                  Add All to Cart
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {recipes.map((recipe) => {
                const recipeCost = recipe.matchedIngredients.reduce((sum, ing, idx) => {
                  const isChecked = selectedIngredients[recipe.id + '-' + idx] !== false
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
                              className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <span className="text-xs text-gray-500 font-medium">
                          Prep: {recipe.prepTimeMinutes}m • Cook: {recipe.cookTimeMinutes}m • {recipe.caloriesPerServing} kcal/serving
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900">{recipe.title}</h3>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{recipe.description}</p>

                      {(recipe.chefTip || recipe.suggestedSawsawan) && (
                        <div className="mt-3 rounded-2xl bg-gray-50 p-3.5 border border-gray-200 text-xs space-y-1.5">
                          {recipe.chefTip && (
                            <div className="flex items-start gap-1.5 text-gray-800">
                              <span className="font-bold shrink-0 text-gray-900">Cooking Tip:</span>
                              <span className="leading-snug text-gray-700">{recipe.chefTip}</span>
                            </div>
                          )}
                          {recipe.suggestedSawsawan && (
                            <div className="flex items-center gap-1.5 text-gray-800">
                              <span className="font-bold shrink-0 text-gray-900">Recommended Dip / Sauce:</span>
                              <span className="font-medium bg-white px-2 py-0.5 rounded-md border border-gray-200 text-[11px] text-gray-700">
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
                          <span className="text-[11px] text-gray-400">Click &quot;Replace&quot; to swap or &quot;Remove&quot; to delete</span>
                        </div>

                        <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden text-xs">
                          {recipe.matchedIngredients.map((ing, idx) => {
                            const isChecked = selectedIngredients[recipe.id + '-' + idx] !== false
                            return (
                              <div
                                key={ing.productId + idx}
                                className={`flex items-center justify-between px-3.5 py-2 transition-colors ${
                                  isChecked ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/80 text-gray-400 line-through'
                                }`}
                              >
                                <div
                                  onClick={() => toggleIngredient(recipe.id, idx)}
                                  className="flex items-center gap-2.5 flex-1 cursor-pointer"
                                >
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

                                <div className="flex items-center gap-1.5">
                                  <span className={`font-bold mr-1 ${isChecked ? 'text-gray-900' : 'text-gray-400'}`}>
                                    ₱{(ing.price * ing.quantityNeeded).toFixed(2)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setReplacingIngredient({
                                        recipeId: recipe.id,
                                        ingredientIndex: idx,
                                        currentIngredient: ing,
                                      })
                                      setIngredientSearch('')
                                      setSelectedCategory('All')
                                    }}
                                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200/80 transition-colors cursor-pointer"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveIngredient(recipe.id, idx)
                                    }}
                                    className="text-[11px] font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-lg border border-red-200/80 transition-colors cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-500">Taste preference:</span>
                        <button
                          onClick={() => handleRateRecipe(recipe, 'up')}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                            userRating === 'up' ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          Like
                        </button>
                        <button
                          onClick={() => handleRateRecipe(recipe, 'down')}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                            userRating === 'down' ? 'bg-red-100 text-red-800' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          Dislike
                        </button>
                      </div>

                      <button
                        onClick={() => setSwappingRecipe(recipe)}
                        className="text-[11px] font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Replace Dish
                      </button>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-gray-400 block font-medium">Subtotal</span>
                        <span className="text-lg font-bold text-emerald-700">₱{recipeCost.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveInstructionRecipe(recipe)}
                          className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          Cooking Steps
                        </button>
                        <button
                          onClick={() => handleAddRecipeToCart(recipe)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          Add to Cart
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
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Recipe Options
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mt-1">
                      Replace &quot;{swappingRecipe.title}&quot;
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
                    Why would you like to replace this dish?
                  </span>
                  <div className="space-y-1.5">
                    {SWAP_REASONS.map((reason) => (
                      <button
                        key={reason}
                        disabled={swapLoading}
                        onClick={() => handleExecuteSwap(reason)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-medium text-gray-700 hover:text-emerald-900 transition-colors cursor-pointer disabled:opacity-50"
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
                    placeholder="Or type a custom request (e.g. want beef stew)..."
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-medium focus:border-emerald-600 focus:outline-none mb-2"
                  />
                  {customSwapReason && (
                    <button
                      disabled={swapLoading}
                      onClick={() => handleExecuteSwap(customSwapReason)}
                      className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
                    >
                      {swapLoading ? 'Generating alternative...' : 'Replace with Custom Request'}
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
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Step-by-Step Cooking Instructions
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 mt-1">
                      {activeInstructionRecipe.title}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Prep: {activeInstructionRecipe.prepTimeMinutes} mins • Cook: {activeInstructionRecipe.cookTimeMinutes} mins • Serves {activeInstructionRecipe.servings}
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
                  <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-200 text-xs text-gray-800 leading-relaxed">
                    <span className="font-bold text-gray-900 block mb-0.5">Cooking Tip:</span>
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
                    Add Ingredients to Cart
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {replacingIngredient && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setReplacingIngredient(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Ingredient Swap
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                      Replace &quot;{replacingIngredient.currentIngredient.productName}&quot;
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Current item: ₱{replacingIngredient.currentIngredient.price.toFixed(2)} / {replacingIngredient.currentIngredient.unit}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplacingIngredient(null)}
                    className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Search & Category filter */}
                <div className="space-y-3">
                  <input
                    type="text"
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    placeholder="Search items in store (e.g. Pork Liempo, Sayote, Pechay)..."
                    className="w-full rounded-2xl border border-gray-200 p-3 text-xs font-medium focus:border-emerald-600 focus:outline-none"
                  />

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {['All', 'Meat', 'Poultry', 'Fish', 'Vegetables', 'Dairy', 'Spices'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtered items list */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 rounded-2xl border border-gray-100 max-h-72">
                  {filteredCatalogProducts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No matching grocery items found. Try another search term.
                    </div>
                  ) : (
                    filteredCatalogProducts.map((prod) => {
                      const currentPrice =
                        replacingIngredient.currentIngredient.price *
                        replacingIngredient.currentIngredient.quantityNeeded
                      const newPrice =
                        prod.basePrice *
                        replacingIngredient.currentIngredient.quantityNeeded
                      const diff = newPrice - currentPrice

                      return (
                        <div
                          key={prod.id}
                          className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="h-10 w-10 rounded-xl object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                                🥬
                              </div>
                            )}
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">{prod.name}</h4>
                              <p className="text-[11px] text-gray-500">
                                ₱{prod.basePrice.toFixed(2)} / {prod.unit}
                                <span className="ml-2 font-medium text-gray-400">({prod.category})</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-bold text-gray-900 block">
                                ₱{newPrice.toFixed(2)}
                              </span>
                              <span
                                className={`text-[10px] font-semibold ${
                                  diff > 0
                                    ? 'text-amber-700'
                                    : diff < 0
                                    ? 'text-emerald-700'
                                    : 'text-gray-400'
                                }`}
                              >
                                {diff > 0
                                  ? `+₱${diff.toFixed(2)}`
                                  : diff < 0
                                  ? `-₱${Math.abs(diff).toFixed(2)}`
                                  : 'Same price'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectReplacement(prod)}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                            >
                              Choose
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}