export interface MatchedIngredient {
  productId: string
  productName: string
  unit: string
  price: number
  quantityNeeded: number
  ingredientLabel: string
  imageUrl?: string | null
}

export interface GeneratedRecipe {
  id: string
  title: string
  description: string
  prepTimeMinutes: number
  cookTimeMinutes: number
  servings: number
  caloriesPerServing: number
  dietTags: string[]
  instructions: string[]
  matchedIngredients: MatchedIngredient[]
  estimatedCost: number
  chefTip?: string
  suggestedSawsawan?: string
}

export interface MealPlanRequest {
  prompt: string
  dietaryTag?: string
  servings: number
  budgetLimit?: number
  dislikedIngredients?: string[]
}

export interface CatalogProduct {
  id: string
  name: string
  category: string
  unit: string
  basePrice: number
  imageUrl: string | null
}

/**
 * Smart fuzzy matching that understands Filipino culinary ingredient synonyms, aliases, and typos
 */
export function matchProduct(ingredientQuery: string, catalog: CatalogProduct[]): CatalogProduct | null {
  const q = ingredientQuery.toLowerCase().trim()

  // 1. Direct exact or startsWith match
  const exact = catalog.find((p) => {
    const pName = p.name.toLowerCase()
    return pName === q || q.startsWith(pName) || pName.startsWith(q)
  })
  if (exact) return exact

  // 2. Filipino & English Culinary Synonym and Typo Mapping
  const synonymMap: Record<string, string[]> = {
    'chicken': ['chicken', 'drumstick', 'thigh'],
    'chiken': ['chicken', 'drumstick', 'thigh'],
    'manok': ['chicken', 'drumstick', 'thigh'],
    'pork': ['pork belly', 'liempo', 'kasim', 'pork'],
    'liempo': ['pork belly', 'liempo'],
    'baboy': ['pork belly', 'liempo', 'kasim', 'pork'],
    'beef': ['beef', 'caldereta', 'brisket', 'shank'],
    'baka': ['beef', 'caldereta', 'brisket', 'shank'],
    'egg': ['egg', 'itlog'],
    'eggs': ['egg', 'itlog'],
    'itlog': ['egg', 'itlog'],
    'potato': ['potato', 'patatas', 'cabbage'],
    'potatoes': ['potato', 'patatas', 'cabbage'],
    'patatas': ['potato', 'patatas', 'cabbage'],
    'garlic': ['garlic', 'bawang'],
    'bawang': ['garlic', 'bawang'],
    'onion': ['red onions', 'sibuyas', 'onion'],
    'onions': ['red onions', 'sibuyas', 'onion'],
    'sibuyas': ['red onions', 'sibuyas', 'onion'],
    'tomato': ['tomatoes', 'kamatis'],
    'tomatoes': ['tomatoes', 'kamatis'],
    'kamatis': ['tomatoes', 'kamatis'],
    'ginger': ['ginger', 'luya'],
    'luya': ['ginger', 'luya'],
    'kangkong': ['kangkong', 'spinach'],
    'spinach': ['kangkong', 'spinach'],
    'cabbage': ['baguio cabbage', 'cabbage', 'repolyo'],
    'repolyo': ['baguio cabbage', 'cabbage', 'repolyo'],
    'avocado': ['avocados', 'avocado'],
    'calamansi': ['calamansi', 'kalamansi', 'lemon'],
    'ginisa': ['aji-no-moto ginisa mix', 'magic sarap', 'ginisa mix', 'seasoning'],
    'magic sarap': ['aji-no-moto ginisa mix', 'magic sarap', 'ginisa mix'],
    'seasoning': ['aji-no-moto ginisa mix', 'magic sarap', 'ginisa mix'],
    'rice': ['rice', 'bigas'],
  }

  for (const [key, aliases] of Object.entries(synonymMap)) {
    if (q.includes(key)) {
      for (const alias of aliases) {
        const found = catalog.find((p) => p.name.toLowerCase().includes(alias))
        if (found) return found
      }
    }
  }

  // 3. Keyword Token Overlap Scoring
  const keywords = q.split(/[\s,()/-]+/).filter((w) => w.length > 2)
  let bestMatch: CatalogProduct | null = null
  let highestScore = 0

  for (const product of catalog) {
    const prodName = product.name.toLowerCase()
    let score = 0

    for (const kw of keywords) {
      if (prodName.includes(kw)) {
        score += 3
      }
    }

    if (score > highestScore) {
      highestScore = score
      bestMatch = product
    }
  }

  return highestScore > 0 ? bestMatch : null
}

/**
 * Fast 10-15 Minute Quick Filipino Meals
 */
function generateQuickMeals(servings: number, catalog: CatalogProduct[], budgetLimit?: number): GeneratedRecipe[] {
  const portionMultiplier = servings <= 2 ? 1 : Math.ceil(servings / 4)

  const quickChickenStirFry: GeneratedRecipe = {
    id: 'quick-chicken-garlic-stirfry',
    title: '12-Minute Garlic Butter Chicken & Kangkong Stir-Fry',
    description: 'Crisp water spinach and thinly sliced chicken breast/thighs flash-cooked with golden garlic and savory seasonings in just 12 minutes.',
    prepTimeMinutes: 4,
    cookTimeMinutes: 8,
    servings,
    caloriesPerServing: 310,
    dietTags: ['Quick 15-Minute', 'High Protein', 'Fast Dinner'],
    chefTip: 'Slice chicken thinly across the grain so it browns and cooks through completely in under 5 minutes on high heat.',
    suggestedSawsawan: 'Calamansi + Sili + Patis',
    instructions: [
      'Slice chicken into bite-sized strips and season with a pinch of salt and pepper.',
      'Heat 1 tbsp cooking oil in a hot skillet; sauté minced garlic until golden fragrant (1 minute).',
      'Add chicken strips; stir-fry vigorously on high heat for 4 minutes until cooked through.',
      'Toss in fresh kangkong leaves and a splash of soy sauce or ginisa mix; stir-fry for 2 minutes and remove from heat immediately.',
      'Serve sizzling hot with steamed white rice.',
    ],
    matchedIngredients: [],
    estimatedCost: 0,
  }

  const chickenMatch = matchProduct('chicken', catalog)
  const kangkongMatch = matchProduct('kangkong', catalog)
  const garlicMatch = matchProduct('garlic', catalog)
  const onionMatch = matchProduct('onion', catalog)

  let cost1 = 0
  const ings1: MatchedIngredient[] = []
  if (chickenMatch) {
    cost1 += chickenMatch.basePrice * portionMultiplier
    ings1.push({
      productId: chickenMatch.id,
      productName: chickenMatch.name,
      unit: chickenMatch.unit,
      price: chickenMatch.basePrice,
      quantityNeeded: portionMultiplier,
      ingredientLabel: 'Fresh Chicken Cuts',
      imageUrl: chickenMatch.imageUrl,
    })
  }
  if (kangkongMatch) {
    cost1 += kangkongMatch.basePrice
    ings1.push({
      productId: kangkongMatch.id,
      productName: kangkongMatch.name,
      unit: kangkongMatch.unit,
      price: kangkongMatch.basePrice,
      quantityNeeded: 1,
      ingredientLabel: 'Fresh Kangkong',
      imageUrl: kangkongMatch.imageUrl,
    })
  }
  if (garlicMatch) {
    cost1 += garlicMatch.basePrice
    ings1.push({
      productId: garlicMatch.id,
      productName: garlicMatch.name,
      unit: garlicMatch.unit,
      price: garlicMatch.basePrice,
      quantityNeeded: 1,
      ingredientLabel: 'Native Garlic',
      imageUrl: garlicMatch.imageUrl,
    })
  }
  quickChickenStirFry.matchedIngredients = ings1
  quickChickenStirFry.estimatedCost = cost1

  // Second quick dish: Ginisang Kamatis at Itlog
  const quickEggTomato: GeneratedRecipe = {
    id: 'quick-ginisang-itlog-kamatis',
    title: '10-Minute Savory Ginisang Itlog at Kamatis',
    description: 'Fluffy scrambled eggs sautéed with juicy ripe native tomatoes and sweet red onions—classic budget-friendly 10-minute comfort food.',
    prepTimeMinutes: 3,
    cookTimeMinutes: 7,
    servings,
    caloriesPerServing: 240,
    dietTags: ['Quick 15-Minute', 'Budget Friendly', 'High Protein'],
    chefTip: 'Cook tomatoes until completely collapsed and jammy before pouring in the beaten eggs for rich savory flavor.',
    suggestedSawsawan: 'Patis with Calamansi',
    instructions: [
      'In a bowl, beat 4-6 eggs with a pinch of seasoning mix and pepper.',
      'Heat oil in a pan; sauté chopped red onions and ripe tomatoes for 3 minutes until soft and juicy.',
      'Pour in the beaten eggs; let set for 30 seconds, then gently fold with a spatula for 2 minutes until soft and creamy.',
      'Turn off heat while eggs are still tender; serve immediately with warm rice.',
    ],
    matchedIngredients: [],
    estimatedCost: 0,
  }

  const eggMatch = matchProduct('egg', catalog)
  const tomatoMatch = matchProduct('tomato', catalog)

  let cost2 = 0
  const ings2: MatchedIngredient[] = []
  if (eggMatch) {
    cost2 += eggMatch.basePrice * portionMultiplier
    ings2.push({
      productId: eggMatch.id,
      productName: eggMatch.name,
      unit: eggMatch.unit,
      price: eggMatch.basePrice,
      quantityNeeded: portionMultiplier,
      ingredientLabel: 'Farm Fresh Eggs',
      imageUrl: eggMatch.imageUrl,
    })
  }
  if (tomatoMatch) {
    cost2 += tomatoMatch.basePrice
    ings2.push({
      productId: tomatoMatch.id,
      productName: tomatoMatch.name,
      unit: tomatoMatch.unit,
      price: tomatoMatch.basePrice,
      quantityNeeded: 1,
      ingredientLabel: 'Native Tomatoes',
      imageUrl: tomatoMatch.imageUrl,
    })
  }
  if (onionMatch) {
    cost2 += onionMatch.basePrice
    ings2.push({
      productId: onionMatch.id,
      productName: onionMatch.name,
      unit: onionMatch.unit,
      price: onionMatch.basePrice,
      quantityNeeded: 1,
      ingredientLabel: 'Red Onions',
      imageUrl: onionMatch.imageUrl,
    })
  }
  quickEggTomato.matchedIngredients = ings2
  quickEggTomato.estimatedCost = cost2

  // If budget limit is tight (e.g. <= 500), return single high-value dish or both if within limit
  if (budgetLimit && cost1 + cost2 > budgetLimit) {
    return [quickChickenStirFry]
  }

  return [quickChickenStirFry, quickEggTomato]
}

/**
 * Fallback generator with strict constraints
 */
function generateFallbackRecipes(
  prompt: string,
  dietaryTag: string | undefined,
  servings: number,
  catalog: CatalogProduct[],
  budgetLimit?: number
): GeneratedRecipe[] {
  const pLower = (prompt + ' ' + (dietaryTag || '')).toLowerCase()
  const isQuick = dietaryTag === 'Quick' || pLower.includes('quick') || pLower.includes('15') || pLower.includes('fast')

  if (isQuick) {
    return generateQuickMeals(servings, catalog, budgetLimit)
  }

  // Chicken Adobo with Eggs and Potatoes
  const portionMultiplier = servings <= 2 ? 1 : Math.ceil(servings / 4)
  const rawIngredients = [
    { label: 'Fresh Chicken Cuts (1kg)', query: 'chicken', baseQty: 1 },
    { label: 'Farm Fresh Eggs (dozen)', query: 'egg', baseQty: 1 },
    { label: 'Native Garlic (500g)', query: 'garlic', baseQty: 1 },
    { label: 'Red Onions (1kg)', query: 'onion', baseQty: 1 },
  ]

  const matchedIngredients: MatchedIngredient[] = []
  let totalCost = 0

  for (const raw of rawIngredients) {
    const matched = matchProduct(raw.query, catalog)
    if (matched) {
      const qty = raw.baseQty * portionMultiplier
      totalCost += matched.basePrice * qty
      matchedIngredients.push({
        productId: matched.id,
        productName: matched.name,
        unit: matched.unit,
        price: matched.basePrice,
        quantityNeeded: qty,
        ingredientLabel: raw.label,
        imageUrl: matched.imageUrl,
      })
    }
  }

  const mainAdobo: GeneratedRecipe = {
    id: 'chicken-adobo-potato-eggs',
    title: 'Savory Chicken Adobo with Hard-Boiled Eggs & Garlic',
    description: 'The beloved Pinoy comfort classic: tender chicken simmered in rich soy sauce, vinegar, and garlic, paired with savory hard-boiled eggs steeped in adobo sauce.',
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    servings,
    caloriesPerServing: 450,
    dietTags: ['Pinoy Classic', 'High Protein', 'Comfort Food'],
    chefTip: 'Boil eggs ahead and add to the simmering sauce in the last 5 minutes to soak up rich golden adobo flavor.',
    suggestedSawsawan: 'Toyo + Suka + Sili',
    instructions: [
      'Boil eggs for 9 minutes until hard-boiled, peel, and set aside.',
      'In a pan, brown chicken pieces with crushed garlic in 1 tbsp oil.',
      'Pour in soy sauce, vinegar, and black pepper. Bring to a rapid boil for 4 minutes uncovered.',
      'Add 1 cup water, cover, and simmer for 15 minutes until chicken is tender.',
      'Add peeled eggs; simmer for 5 minutes until eggs absorb the savory sauce.',
      'Serve hot with steamed rice.',
    ],
    matchedIngredients,
    estimatedCost: totalCost,
  }

  return [mainAdobo]
}

/**
 * Main AI Meal Plan Generator with Strict Constraints
 */
export async function generateMealPlan(
  req: MealPlanRequest,
  catalog: CatalogProduct[]
): Promise<GeneratedRecipe[]> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  const isQuickMode = req.dietaryTag === 'Quick' || req.prompt.toLowerCase().includes('15') || req.prompt.toLowerCase().includes('quick')

  if (geminiKey) {
    try {
      const catalogSummary = catalog
        .map((p) => `- ${p.name} (₱${p.basePrice}/${p.unit}, category: ${p.category})`)
        .join('\n')

      const systemPrompt = `You are Chef Maria, an expert Filipino chef for FreshCart AI in the Philippines.
Generate personalized meal recipes strictly adhering to the customer's constraints.

MANDATORY CONSTRAINTS:
1. BUDGET LIMIT:
   - Target budget: ${req.budgetLimit ? `STRICT MAXIMUM ₱${req.budgetLimit} TOTAL` : 'Flexible'}.
   - The combined total cost of all recipes in the plan MUST NOT EXCEED ₱${req.budgetLimit || 1500}.
   - If budget is low (e.g. ₱500), generate 1 or 2 focused, affordable dishes and do NOT over-allocate ingredients.

2. COOKING TIME & DIET FOCUS:
   - Diet Focus: "${req.dietaryTag || 'General'}"
   ${
     isQuickMode
       ? '- QUICK 15-MINUTE MEAL REQUIREMENT: Every recipe MUST have cookTimeMinutes <= 15 and prepTimeMinutes <= 10 (Total time <= 20 minutes!). Choose quick stir-fries, sautéed eggs/meats, or fast skillet dishes. DO NOT generate slow-simmered stews (no Caldereta, Nilaga, or Bulalo).'
       : ''
   }

3. SERVINGS ALLOCATION:
   - Servings: ${req.servings} people.
   - For 2 people: Allocate 1 unit of meat/staples. Keep ingredient quantities realistic and affordable.

4. USER PROMPT FAITHFULNESS:
   - Exact request: "${req.prompt}".
   - If the user explicitly asks for a dish (e.g. "Chicken Adobo with Potato and Eggs"), Recipe #1 MUST BE EXACTLY THAT DISH.

Store Inventory:
${catalogSummary}

Respond ONLY with valid JSON in this exact schema without markdown:
{
  "recipes": [
    {
      "id": "recipe-slug",
      "title": "Exact Dish Title",
      "description": "Appetizing 1-2 sentence description",
      "prepTimeMinutes": ${isQuickMode ? 5 : 15},
      "cookTimeMinutes": ${isQuickMode ? 10 : 25},
      "servings": ${req.servings},
      "caloriesPerServing": 380,
      "dietTags": ["Tag1", "Tag2"],
      "chefTip": "Pinoy cooking tip",
      "suggestedSawsawan": "e.g. Calamansi + Patis",
      "instructions": ["Step 1...", "Step 2...", "Step 3..."],
      "requiredIngredients": [
        {
          "catalogProductName": "Exact product name from Store Inventory above",
          "ingredientLabel": "Display label",
          "quantity": 1
        }
      ]
    }
  ]
}`

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text

        if (textOutput) {
          const parsed = JSON.parse(textOutput)
          if (parsed && Array.isArray(parsed.recipes) && parsed.recipes.length > 0) {
            let processedRecipes = parsed.recipes.map((rec: any, idx: number) => {
              const matchedIngredients: MatchedIngredient[] = []
              let totalCost = 0

              if (Array.isArray(rec.requiredIngredients)) {
                for (const ing of rec.requiredIngredients) {
                  const matched = matchProduct(ing.catalogProductName || ing.ingredientLabel, catalog)
                  if (matched) {
                    // For small servings (<=2), cap quantity at 1 to keep within budget
                    const rawQty = Number(ing.quantity) || 1
                    const qty = req.servings <= 2 ? Math.min(1, rawQty) : rawQty
                    totalCost += matched.basePrice * qty
                    matchedIngredients.push({
                      productId: matched.id,
                      productName: matched.name,
                      unit: matched.unit,
                      price: matched.basePrice,
                      quantityNeeded: qty,
                      ingredientLabel: ing.ingredientLabel || matched.name,
                      imageUrl: matched.imageUrl,
                    })
                  }
                }
              }

              const prepTime = isQuickMode ? Math.min(8, Number(rec.prepTimeMinutes) || 5) : Number(rec.prepTimeMinutes) || 15
              const cookTime = isQuickMode ? Math.min(15, Number(rec.cookTimeMinutes) || 10) : Number(rec.cookTimeMinutes) || 25

              return {
                id: rec.id || `ai-recipe-${idx + 1}`,
                title: rec.title || 'Filipino Specialty Dish',
                description: rec.description || '',
                prepTimeMinutes: prepTime,
                cookTimeMinutes: cookTime,
                servings: Number(rec.servings) || req.servings,
                caloriesPerServing: Number(rec.caloriesPerServing) || 380,
                dietTags: Array.isArray(rec.dietTags) ? rec.dietTags : [req.dietaryTag || 'Filipino Homestyle'],
                instructions: Array.isArray(rec.instructions) ? rec.instructions : ['Cook according to recipe.'],
                matchedIngredients,
                estimatedCost: totalCost > 0 ? totalCost : 220,
                chefTip: rec.chefTip || 'Serve hot with steamed rice.',
                suggestedSawsawan: rec.suggestedSawsawan || 'Toyo + Calamansi',
              }
            })

            // Strict Budget Enforcement: If total exceeds user's budgetLimit, prune recipes or prune extra sides
            if (req.budgetLimit && req.budgetLimit > 0) {
              const maxBudget = req.budgetLimit * 1.05 // 5% grace
              let runningTotal = 0
              const budgetedRecipes: GeneratedRecipe[] = []

              for (const r of processedRecipes) {
                if (budgetedRecipes.length === 0 || runningTotal + r.estimatedCost <= maxBudget) {
                  budgetedRecipes.push(r)
                  runningTotal += r.estimatedCost
                }
              }

              processedRecipes = budgetedRecipes
            }

            return processedRecipes
          }
        }
      }
    } catch (err) {
      console.error('[Gemini API] Error, fallback with strict constraints:', err)
    }
  }

  return generateFallbackRecipes(req.prompt, req.dietaryTag, req.servings, catalog, req.budgetLimit)
}