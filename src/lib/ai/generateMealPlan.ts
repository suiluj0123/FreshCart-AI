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
 * Smart fuzzy matching with comprehensive Filipino culinary vocabulary, Tagalog aliases, and common typos
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
    // Poultry & Cuts (Manok)
    'chicken': ['chicken', 'drumstick', 'thigh'],
    'chiken': ['chicken', 'drumstick', 'thigh'],
    'manok': ['chicken', 'drumstick', 'thigh'],
    'pitso': ['chicken'],
    'pakpak': ['chicken'],
    'hita': ['chicken', 'thigh'],

    // Pork & Cuts (Baboy / Karne)
    'pork': ['pork belly', 'liempo', 'kasim', 'pork'],
    'liempo': ['pork belly', 'liempo'],
    'kasim': ['pork', 'kasim'],
    'pigue': ['pork', 'kasim'],
    'baboy': ['pork belly', 'liempo', 'kasim', 'pork'],
    'karne': ['pork belly', 'liempo', 'beef'],
    'giniling': ['pork', 'beef'],

    // Beef & Cuts (Baka)
    'beef': ['beef', 'caldereta', 'brisket', 'shank'],
    'baka': ['beef', 'caldereta', 'brisket', 'shank'],
    'bulalo': ['beef', 'shank'],

    // Seafood (Isda atbp.)
    'isda': ['tilapia', 'bangus', 'fish'],
    'tilapia': ['tilapia', 'fish'],
    'bangus': ['bangus', 'fish'],
    'galunggong': ['fish'],
    'hipon': ['shrimp', 'hipon'],
    'shrimp': ['shrimp', 'hipon'],
    'tuna': ['tuna', 'fish'],
    'sardinas': ['sardines', 'fish'],
    'sardines': ['sardines', 'fish'],

    // Eggs & Dairy (Itlog)
    'egg': ['egg', 'itlog'],
    'eggs': ['egg', 'itlog'],
    'itlog': ['egg', 'itlog'],
    'cheese': ['cheese', 'quickmelt'],
    'gatas': ['milk', 'selecta', 'bear brand'],
    'milk': ['milk', 'selecta', 'bear brand'],
    'butter': ['butter', 'magnolia'],

    // Potatoes & Root Crops (Patatas / Gabi)
    'potato': ['potato', 'patatas', 'cabbage'],
    'potatoes': ['potato', 'patatas', 'cabbage'],
    'patatas': ['potato', 'patatas', 'cabbage'],
    'gabi': ['taro', 'potato'],
    'kamote': ['potato'],

    // Aromatics & Spices (Panggisa)
    'garlic': ['garlic', 'bawang'],
    'bawang': ['garlic', 'bawang'],
    'onion': ['red onions', 'sibuyas', 'onion'],
    'onions': ['red onions', 'sibuyas', 'onion'],
    'sibuyas': ['red onions', 'sibuyas', 'onion'],
    'tomato': ['calamansi', 'sayote', 'eggplant', 'cabbage'],
    'tomatoes': ['calamansi', 'sayote', 'eggplant', 'cabbage'],
    'kamatis': ['calamansi', 'sayote', 'eggplant', 'cabbage'],
    'ginger': ['ginger', 'luya'],
    'luya': ['ginger', 'luya'],
    'sili': ['chili', 'sili', 'labuyo'],
    'labuyo': ['chili', 'sili'],
    'paminta': ['pepper', 'seasoning'],

    // Greens & Native Vegetables (Gulay)
    'kangkong': ['kangkong', 'spinach'],
    'spinach': ['kangkong', 'spinach'],
    'cabbage': ['baguio cabbage', 'cabbage', 'repolyo'],
    'repolyo': ['baguio cabbage', 'cabbage', 'repolyo'],
    'pechay': ['pechay', 'baguio cabbage', 'cabbage', 'kangkong'],
    'talong': ['eggplant', 'talong', 'kangkong'],
    'sitaw': ['yardlong bean', 'kangkong', 'cabbage'],
    'ampalaya': ['bitter melon', 'cabbage', 'kangkong'],
    'sayote': ['sayote', 'chayote', 'cabbage'],
    'kalabasa': ['squash', 'kalabasa', 'potato'],
    'avocado': ['avocados', 'avocado'],
    'calamansi': ['calamansi', 'kalamansi', 'lemon'],
    'kalamansi': ['calamansi', 'kalamansi', 'lemon'],

    // Seasonings & Condiments (Pampalasa & Sawsawan)
    'ginisa': ['aji-no-moto ginisa mix', 'magic sarap', 'ginisa mix', 'seasoning'],
    'magic sarap': ['aji-no-moto ginisa mix', 'magic sarap', 'ginisa mix'],
    'seasoning': ['aji-no-moto ginisa mix', 'magic sarap', 'ginisa mix'],
    'toyo': ['soy sauce', 'toyo', 'seasoning'],
    'suka': ['vinegar', 'suka'],
    'patis': ['fish sauce', 'patis', 'seasoning'],
    'bagoong': ['bagoong', 'seasoning'],
    'sinigang mix': ['sinigang', 'seasoning', 'tomatoes'],
    'sampalok': ['sinigang', 'tomatoes', 'calamansi'],
    'rice': ['rice', 'bigas'],
    'bigas': ['rice', 'bigas'],
    'hotdog': ['hotdog', 'purefoods'],
    'tocino': ['tocino'],
    'longganisa': ['longganisa'],
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
 * Pre-processes user prompt to extract explicit dish names and requested ingredients
 */
function extractUserIntent(prompt: string) {
  const p = prompt.toLowerCase()
  const detectedIngredients: string[] = []

  const potentialIngredients = [
    { key: 'chicken', aliases: ['chicken', 'chiken', 'manok'] },
    { key: 'pork', aliases: ['pork', 'liempo', 'baboy', 'kasim'] },
    { key: 'beef', aliases: ['beef', 'baka', 'bulalo'] },
    { key: 'egg', aliases: ['egg', 'eggs', 'itlog'] },
    { key: 'potato', aliases: ['potato', 'potatoes', 'patatas'] },
    { key: 'kangkong', aliases: ['kangkong', 'spinach'] },
    { key: 'cabbage', aliases: ['cabbage', 'repolyo'] },
    { key: 'tomato', aliases: ['tomato', 'tomatoes', 'kamatis'] },
    { key: 'onion', aliases: ['onion', 'onions', 'sibuyas'] },
    { key: 'garlic', aliases: ['garlic', 'bawang'] },
    { key: 'ginger', aliases: ['ginger', 'luya'] },
    { key: 'talong', aliases: ['talong', 'eggplant'] },
    { key: 'sitaw', aliases: ['sitaw', 'beans'] },
    { key: 'sayote', aliases: ['sayote', 'chayote'] },
    { key: 'ampalaya', aliases: ['ampalaya', 'bitter melon'] },
    { key: 'tilapia', aliases: ['tilapia', 'isda', 'fish'] },
    { key: 'bangus', aliases: ['bangus', 'milkfish'] },
    { key: 'tuna', aliases: ['tuna'] },
    { key: 'sardines', aliases: ['sardines', 'sardinas'] },
    { key: 'hotdog', aliases: ['hotdog', 'tender juicy'] },
    { key: 'tocino', aliases: ['tocino'] },
    { key: 'longganisa', aliases: ['longganisa'] },
    { key: 'rice', aliases: ['rice', 'bigas'] },
    { key: 'calamansi', aliases: ['calamansi', 'kalamansi'] },
  ]

  for (const item of potentialIngredients) {
    if (item.aliases.some((alias) => p.includes(alias))) {
      detectedIngredients.push(item.key)
    }
  }

  return {
    detectedIngredients,
  }
}

/**
 * Fast 10-15 Minute Quick Filipino Meals with authentic Tagalog naming
 */
function generateQuickMeals(servings: number, catalog: CatalogProduct[], budgetLimit?: number): GeneratedRecipe[] {
  const portionMultiplier = servings <= 2 ? 1 : Math.ceil(servings / 4)

  const quickChickenStirFry: GeneratedRecipe = {
    id: 'quick-chicken-kangkong-stirfry',
    title: 'Ginisang Manok at Kangkong sa Bawang (12-Min Quick Stir-Fry)',
    description: 'Nipis-hiwang manok na ginisa sa maramihang bawang at sariwang kangkong — mabilis lutuin at malinamnam na ulam pang-hapunan.',
    prepTimeMinutes: 4,
    cookTimeMinutes: 8,
    servings,
    caloriesPerServing: 310,
    dietTags: ['Quick 15-Minute', 'High Protein', 'Gisado'],
    chefTip: 'Hiwain nang maninipis ang karne ng manok laban sa hibla para maluto at maging malambot sa loob ng 4 na minuto sa mainit na kawali.',
    suggestedSawsawan: 'Toyo-Mansi na may pinigang Calamansi at Siling Labuyo',
    instructions: [
      'Hiwain ang manok sa maninipis na piraso at timplahan ng kaunting asin at paminta.',
      'Initin ang mantika sa kawali. Igisa muna ang tinadtad na bawang hanggang maging mabango at golden brown (1 minuto).',
      'Ilagay ang sibuyas at hiwang manok; igisa sa malakas na apoy nang 4 na minuto hanggang pumuti at maluto.',
      'Ihalo ang tangkay at dahon ng kangkong kasama ang kaunting toyo o ginisa mix. Haluin nang 2 minuto at hanguin agad para manatiling malutong ang gulay.',
      'Ihain nang mainit kasama ang bagong saing na kanin.',
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
      ingredientLabel: 'Native Garlic (Bawang)',
      imageUrl: garlicMatch.imageUrl,
    })
  }
  quickChickenStirFry.matchedIngredients = ings1
  quickChickenStirFry.estimatedCost = cost1

  // Second quick dish: Ginisang Kamatis at Itlog
  const quickEggTomato: GeneratedRecipe = {
    id: 'quick-ginisang-itlog-kamatis',
    title: 'Ginisang Kamatis at Itlog sa Pulang Sibuyas (10-Min Ulam)',
    description: 'Malambot at malinamnam na scrambled eggs na ginisa sa hinog na kamatis at pulang sibuyas — paboritong lutong-bahay na ulam.',
    prepTimeMinutes: 3,
    cookTimeMinutes: 7,
    servings,
    caloriesPerServing: 240,
    dietTags: ['Quick 15-Minute', 'Budget Saver', 'Lutong Bahay'],
    chefTip: 'Lutuin muna nang husto ang kamatis hanggang sa lumambot at lumabas ang natural nitong katas bago ibuhos ang binating itlog.',
    suggestedSawsawan: 'Patis na may Calamansi at Sileng Labuyo',
    instructions: [
      'Batiin ang 4-6 pirasong itlog sa mangkok na may kaunting paminta at pampalasa.',
      'Initin ang mantika sa kawali. Igisa ang pulang sibuyas at hiwang kamatis nang 3 minuto hanggang maging malambot at makatas.',
      'Ibuhos ang binating itlog. Hayaang mamuo nang bahagya sa loob ng 30 segundo, saka dahan-dahang haluin nang 2 minuto.',
      'Patayin ang apoy habang malambot at creamy pa ang itlog. Ihain agad kasama ang mainit na kanin.',
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
      ingredientLabel: 'Farm Fresh Eggs (Itlog)',
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
      ingredientLabel: 'Fresh Native Tomatoes (Kamatis)',
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
      ingredientLabel: 'Red Onions (Sibuyas)',
      imageUrl: onionMatch.imageUrl,
    })
  }
  quickEggTomato.matchedIngredients = ings2
  quickEggTomato.estimatedCost = cost2

  if (budgetLimit && cost1 + cost2 > budgetLimit) {
    return [quickChickenStirFry]
  }

  return [quickChickenStirFry, quickEggTomato]
}

/**
 * Authentic Filipino Fallback Recipes with Deep Culinary Phrasing
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

  const portionMultiplier = servings <= 2 ? 1 : Math.ceil(servings / 4)

  // 1. SINIGANG BLUEPRINT
  if (pLower.includes('sinigang')) {
    const isPork = !pLower.includes('bangus') && !pLower.includes('isda') && !pLower.includes('manok') && !pLower.includes('chicken')
    const mainProteinQuery = isPork ? 'pork' : (pLower.includes('bangus') ? 'bangus' : 'chicken')

    const rawIngredients = [
      { label: isPork ? 'Pork Liempo (Belly Cut, 1kg)' : 'Fresh Bangus / Chicken', query: mainProteinQuery, baseQty: 1, isMain: true },
      { label: 'Fresh Kangkong (Local Spinach)', query: 'kangkong', baseQty: 1 },
      { label: 'Red Onions (Sibuyas Tagalog)', query: 'onion', baseQty: 1 },
      { label: 'Calamansi (pack of 250g)', query: 'calamansi', baseQty: 1 },
      { label: 'Sitaw (Yardlong beans)', query: 'sitaw', baseQty: 1 },
      { label: 'Eggplant (Talong)', query: 'talong', baseQty: 1 },
      { label: 'Native Garlic (Bawang)', query: 'garlic', baseQty: 1 },
    ]

    const matchedIngredients: MatchedIngredient[] = []
    let totalCost = 0

    for (const raw of rawIngredients) {
      const matched = matchProduct(raw.query, catalog)
      if (matched && !matchedIngredients.some((m) => m.productId === matched.id)) {
        const qty = raw.isMain ? portionMultiplier : 1
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

    return [
      {
        id: 'sinigang-na-baboy-complete',
        title: isPork ? 'Sinigang na Baboy sa Kamatis at Kangkong' : 'Sinigang na Bangus sa Kamatis at Kangkong',
        description: 'Tradisyunal na asim-kilig na sinigang na may malambot na karne, sariwang kamatis, kangkong, at sitaw — paboritong sabaw ng pamilyang Pilipino.',
        prepTimeMinutes: 10,
        cookTimeMinutes: 30,
        servings,
        caloriesPerServing: 410,
        dietTags: ['Lutong Bahay', 'Pinoy Sabaw', 'High Protein'],
        chefTip: 'Pigain o durugin ang pinakuluang hinog na kamatis sa sabaw para maging natural ang asim at magandang mamula-mula ang sabaw.',
        suggestedSawsawan: 'Patis na may pinigang Calamansi at Siling Labuyo',
        instructions: [
          'Pakuluan ang karne ng baboy sa 5-6 tasang tubig kasama ang hiniwang kamatis at sibuyas nang 20 minuto hanggang lumambot.',
          'Durugin nang bahagya ang mga kamatis sa sandok para kumalat ang natural na asim at kulay sa sabaw.',
          'Idagdag ang calamansi o pampaasim, bawang, at patis ayon sa nais na lasa.',
          'Ihalo ang sitaw at iba pang gulay; pakuluin nang 3 minuto.',
          'Huling ilagay ang sariwang kangkong, patayin agad ang apoy, at takpan nang 2 minuto para manatiling berde at malutong.',
          'Ihain nang mainit kasama ang patis-mansi sawsawan at kanin.',
        ],
        matchedIngredients,
        estimatedCost: totalCost > 0 ? totalCost : 420,
      },
    ]
  }

  // 2. TINOLA BLUEPRINT
  if (pLower.includes('tinola')) {
    const rawIngredients = [
      { label: 'Fresh Chicken Cuts (Manok)', query: 'chicken', baseQty: 1, isMain: true },
      { label: 'Fresh Sayote (Chayote)', query: 'sayote', baseQty: 1 },
      { label: 'Fresh Ginger (Luya)', query: 'ginger', baseQty: 1 },
      { label: 'Native Garlic (Bawang)', query: 'garlic', baseQty: 1 },
      { label: 'Red Onions (Sibuyas Tagalog)', query: 'onion', baseQty: 1 },
      { label: 'Fresh Kangkong / Greens', query: 'kangkong', baseQty: 1 },
    ]

    const matchedIngredients: MatchedIngredient[] = []
    let totalCost = 0

    for (const raw of rawIngredients) {
      const matched = matchProduct(raw.query, catalog)
      if (matched) {
        const qty = raw.isMain ? portionMultiplier : 1
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

    return [
      {
        id: 'tinolang-manok-complete',
        title: 'Tinolang Manok sa Sariwang Luya at Sayote',
        description: 'Masustansya at nagpapainit ng tiyang sabaw ng manok na may tamang anghang ng sariwang luya, malambot na sayote, at berdeng dahon.',
        prepTimeMinutes: 10,
        cookTimeMinutes: 25,
        servings,
        caloriesPerServing: 340,
        dietTags: ['Lutong Bahay', 'Healthy Sabaw', 'High Protein'],
        chefTip: 'Igisa muna nang husto ang luya at manok sa mantika bago sabawan ng tubig para mawala ang lansa at lumabas ang natural na katas ng karne.',
        suggestedSawsawan: 'Patis na may Calamansi at Siling Labuyo',
        instructions: [
          'Initin ang mantika sa kaserola. Igisa ang bawang, sibuyas, at maraming hiniwang luya hanggang maging mabango.',
          'Ilagay ang mga hiwa ng manok at igisa nang 5-7 minuto hanggang mamuti at medyo mag-brown ang balat.',
          'Ibuhos ang 4-5 tasang tubig, timplahan ng patis at paminta, at pakuluin nang 15 minuto hanggang lumambot ang manok.',
          'Ihalo ang hiniwang sayote at lutuin nang 5 minuto hanggang lumambot.',
          'Ilagay ang dahon ng kangkong o dahon ng sili, patayin ang apoy, at ihain nang mainit.',
        ],
        matchedIngredients,
        estimatedCost: totalCost > 0 ? totalCost : 310,
      },
    ]
  }

  // 3. GINISANG MONGGO BLUEPRINT
  if (pLower.includes('monggo') || pLower.includes('mung bean')) {
    const rawIngredients = [
      { label: 'Pork Liempo / Kasim', query: 'pork', baseQty: 1, isMain: true },
      { label: 'Fresh Native Tomatoes (Kamatis)', query: 'tomato', baseQty: 1 },
      { label: 'Fresh Kangkong / Greens', query: 'kangkong', baseQty: 1 },
      { label: 'Native Garlic (Bawang)', query: 'garlic', baseQty: 1 },
      { label: 'Red Onions (Sibuyas Tagalog)', query: 'onion', baseQty: 1 },
    ]

    const matchedIngredients: MatchedIngredient[] = []
    let totalCost = 0

    for (const raw of rawIngredients) {
      const matched = matchProduct(raw.query, catalog)
      if (matched) {
        const qty = raw.isMain ? portionMultiplier : 1
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

    return [
      {
        id: 'ginisang-monggo-complete',
        title: 'Ginisang Monggo na may Liempo at Kangkong',
        description: 'Malinamnam at masustansyang paboritong ulam — monggo na pinalambot at ginisa sa bawang, sibuyas, kamatis, at sariwang gulay.',
        prepTimeMinutes: 10,
        cookTimeMinutes: 25,
        servings,
        caloriesPerServing: 380,
        dietTags: ['Lutong Bahay', 'Budget Saver', 'High Fiber'],
        chefTip: 'Igisa nang husto ang bawang hanggang maging golden brown bago ilagay ang kamatis para maging mas malalim at mabango ang lasa ng gisa.',
        suggestedSawsawan: 'Patis na may Calamansi at Siling Labuyo',
        instructions: [
          'Pakuluan ang monggo hanggang lumambot at maging creamy.',
          'Sa hiwalay na kawali, igisa ang bawang hanggang mag-golden brown, saka ihalo ang sibuyas at hinog na kamatis.',
          'Ilagay ang hiwa-hiwang karne at lutuin nang 5 minuto hanggang maging malambot.',
          'Ibuhos ang pinalambot na monggo kasama ang sabaw nito, timplahan ng patis at paminta, at hayaang kumulo nang 8 minuto.',
          'Ihalo ang sariwang kangkong, lutuin nang 1 minuto, at patayin ang apoy.',
          'Ihain nang mainit kasama ang kanin.',
        ],
        matchedIngredients,
        estimatedCost: totalCost > 0 ? totalCost : 280,
      },
    ]
  }

  // 4. DEFAULT ADOBO WITH FULL INGREDIENTS
  const isPorkAdobo = pLower.includes('pork') || pLower.includes('liempo') || pLower.includes('baboy')
  const rawIngredients = [
    { label: isPorkAdobo ? 'Pork Liempo (Belly Cut)' : 'Fresh Chicken Cuts (Manok)', query: isPorkAdobo ? 'pork' : 'chicken', baseQty: 1, isMain: true },
    { label: 'Farm Fresh Eggs (Itlog)', query: 'egg', baseQty: 1 },
    { label: 'Baguio Potatoes (Patatas)', query: 'potato', baseQty: 1 },
    { label: 'Native Garlic (Bawang)', query: 'garlic', baseQty: 1 },
    { label: 'Red Onions (Sibuyas Tagalog)', query: 'onion', baseQty: 1 },
    { label: 'Datu Puti Soy Sauce & Vinegar', query: 'toyo', baseQty: 1 },
  ]

  const matchedIngredients: MatchedIngredient[] = []
  let totalCost = 0

  for (const raw of rawIngredients) {
    const matched = matchProduct(raw.query, catalog)
    if (matched) {
      const qty = raw.isMain ? portionMultiplier : 1
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

  return [
    {
      id: 'chicken-adobo-potato-eggs-complete',
      title: isPorkAdobo ? 'Adobong Liempo na may Patatas at Nilagang Itlog' : 'Adobong Manok na may Patatas at Nilagang Itlog',
      description: 'Malinamnam at tradisyunal na adobo na pinalambot sa toyo, suka, at maraming bawang, sinamahan ng pinritong patatas at masarap na nilagang itlog.',
      prepTimeMinutes: 10,
      cookTimeMinutes: 25,
      servings,
      caloriesPerServing: 450,
      dietTags: ['Lutong Bahay', 'High Protein', 'Pinoy Favorite'],
      chefTip: 'Huwag haluin agad ang suka pagkabuhos sa kawali — hayaang kumulo nang walang takip sa loob ng 3 minuto para hindi maging maasim ang timpla.',
      suggestedSawsawan: 'Toyo at Suka na may dinurog na bawang at siling labuyo',
      instructions: [
        'Pakuluan ang mga itlog nang 9 na minuto; palamigin sa tubig, balatan, at itabi.',
        'Sa kawali, iprito nang bahagya ang mga hiwang patatas hanggang maging golden brown; itabi.',
        'Igisa ang karne kasama ang dinurog na bawang at sibuyas hanggang maging tostado at mabango.',
        'Ibuhos ang toyo, suka, dahon ng laurel, at buong paminta. Pakuluin nang walang takip sa loob ng 4 na minuto.',
        'Magdagdag ng 1 tasang tubig, takpan, at hayaang kumulo sa mahinang apoy nang 15 minuto hanggang lumambot ang karne.',
        'Ihalo ang pinritong patatas at nilagang itlog. Lutuin pa nang 5 minuto hanggang kumapit ang sarsa at maging makintab ang adobo.',
        'Ihain nang mainit kasama ang bagong saing na kanin.',
      ],
      matchedIngredients,
      estimatedCost: totalCost > 0 ? totalCost : 380,
    },
  ]
}

/**
 * Main AI Meal Plan Generator with Enhanced Chain-of-Thought & Intent Grounding
 */
export async function generateMealPlan(
  req: MealPlanRequest,
  catalog: CatalogProduct[]
): Promise<GeneratedRecipe[]> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  const pLower = (req.prompt || '').toLowerCase()
  const isQuickMode = req.dietaryTag === 'Quick' || pLower.includes('15') || pLower.includes('quick') || pLower.includes('fast')
  const { detectedIngredients } = extractUserIntent(req.prompt)

  if (geminiKey) {
    try {
      const catalogSummary = catalog
        .map((p) => `- ${p.name} (₱${p.basePrice}/${p.unit}, category: ${p.category})`)
        .join('\n')

      const systemPrompt = `You are Chef Maria, a master culinary chef specializing in authentic Filipino homestyle cooking (Lutong Bahay) for FreshCart in the Philippines.
Your mission is to strictly follow user prompts and option settings, crafting culturally accurate Filipino recipes using real in-stock supermarket inventory.

CRITICAL INGREDIENT INCLUSION RULE:
- Every generated recipe MUST include ALL complete ingredients necessary to cook the full dish (list 4 to 7 items from inventory).
- Include the main protein (chicken, pork, beef, fish), all vegetables (kangkong, sitaw, sayote, tomatoes, cabbage, eggplant), aromatics (garlic/bawang, onions/sibuyas, ginger/luya), and seasonings (toyo, suka, calamansi, patis).
- Do NOT generate a recipe with only 1 or 2 items. Customers need all required ingredients listed so they can easily buy, replace, or remove them.

STRICT THINKING & REASONING GUIDELINES:
1. USER INTENT ADHERENCE (CRITICAL RULE #1):
   - The user asked for: "${req.prompt}".
   - ${detectedIngredients.length > 0 ? `Detected requested ingredients from user prompt: [${detectedIngredients.join(', ')}]. Recipe #1 MUST explicitly include these in its title, requiredIngredients list, and step-by-step instructions.` : 'Follow the homestyle craving directly.'}
   - NEVER replace or deviate from the dish the user specifically asked for (e.g. If user types "Sinigang na Baboy with kamatis and kangkong", Recipe #1 MUST be Sinigang na Baboy containing pork, tomatoes, kangkong, onions, garlic, and calamansi).

2. OPTIONS & CONSTRAINTS ENFORCEMENT:
   - PORTIONS & SERVINGS: ${req.servings} people. For 2 persons, use 1 unit/pack of main meats and produce to avoid runaway costs. For 4-6 people, scale appropriately.
   - BUDGET CEILING: ${req.budgetLimit ? `Strict Maximum Budget: ₱${req.budgetLimit}. The combined total cost of all recipes MUST NOT EXCEED ₱${req.budgetLimit}. Choose inventory items that fit under ₱${req.budgetLimit}.` : 'Flexible budget.'}
   ${
     isQuickMode
       ? '- QUICK 15-MINUTE MEALS: Total time (prep + cook) MUST be <= 15 minutes (cookTimeMinutes <= 10, prepTimeMinutes <= 5). Use quick stir-fries (gisado), flash-cooked chicken/pork strips, or sautéed egg/vegetable dishes. NO slow-simmered stews or 45-minute soups.'
       : ''
   }
   - DIET FOCUS: "${req.dietaryTag || 'Homestyle Filipino'}". If Keto/Low Carb, avoid potatoes and rice. If Vegetarian, use 100% plant-based ingredients.

3. AUTHENTIC TAGALOG WORDINGS & CHEF WISDOM:
   - Gisa Sequence: Bawang first until fragrant -> Sibuyas until translucent -> Kamatis / Luya until soft and juicy.
   - For Adobo: Emphasize not stirring vinegar immediately so raw acidity mellows.
   - For Sinigang: Emphasize crushing tomatoes into the broth for natural sourness.
   - For Sawsawan: Always provide authentic Philippine dipping sauce pairing (e.g. "Toyo-Mansi na may Siling Labuyo", "Patis na may Calamansi").

Store Inventory:
${catalogSummary}

User Request:
- Prompt / Dish: "${req.prompt}"
- Dietary Focus: "${req.dietaryTag || 'Homestyle Filipino'}"
- Portion Servings: ${req.servings} persons
- Target Budget Limit: ${req.budgetLimit ? `₱${req.budgetLimit}` : 'Flexible'}

Respond ONLY with valid JSON in this exact schema without markdown formatting or code fences:
{
  "recipes": [
    {
      "id": "recipe-slug",
      "title": "Authentic Filipino Dish Title in Tagalog/English",
      "description": "Appetizing 1-2 sentence description in natural Filipino/English tone",
      "prepTimeMinutes": ${isQuickMode ? 4 : 10},
      "cookTimeMinutes": ${isQuickMode ? 8 : 25},
      "servings": ${req.servings},
      "caloriesPerServing": 380,
      "dietTags": ["Tag1", "Tag2"],
      "chefTip": "Practical Pinoy cooking wisdom (e.g. Sautéing tips, vinegar simmering rules)",
      "suggestedSawsawan": "Authentic Pinoy dipping sauce pairing",
      "instructions": [
        "Step 1: Detailed instruction...",
        "Step 2: Detailed instruction...",
        "Step 3: Detailed instruction..."
      ],
      "requiredIngredients": [
        {
          "catalogProductName": "Exact product name from Store Inventory list",
          "ingredientLabel": "Display label (e.g. Fresh Chicken Cuts, Farm Fresh Eggs)",
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
            temperature: 0.15,
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

              // Post-processing guarantee: check if any user-explicitly mentioned ingredient was missed in Recipe #1
              if (idx === 0 && detectedIngredients.length > 0) {
                for (const userIng of detectedIngredients) {
                  const alreadyMatched = matchedIngredients.some((m) =>
                    m.productName.toLowerCase().includes(userIng) || m.ingredientLabel.toLowerCase().includes(userIng)
                  )
                  if (!alreadyMatched) {
                    const extraMatch = matchProduct(userIng, catalog)
                    if (extraMatch) {
                      const extraQty = req.servings <= 2 ? 1 : Math.ceil(req.servings / 4)
                      totalCost += extraMatch.basePrice * extraQty
                      matchedIngredients.push({
                        productId: extraMatch.id,
                        productName: extraMatch.name,
                        unit: extraMatch.unit,
                        price: extraMatch.basePrice,
                        quantityNeeded: extraQty,
                        ingredientLabel: extraMatch.name,
                        imageUrl: extraMatch.imageUrl,
                      })
                    }
                  }
                }
              }

              const prepTime = isQuickMode ? Math.min(5, Number(rec.prepTimeMinutes) || 4) : Number(rec.prepTimeMinutes) || 10
              const cookTime = isQuickMode ? Math.min(10, Number(rec.cookTimeMinutes) || 8) : Number(rec.cookTimeMinutes) || 25

              return {
                id: rec.id || `recipe-${idx + 1}`,
                title: rec.title || 'Lutong Bahay Specialty Dish',
                description: rec.description || '',
                prepTimeMinutes: prepTime,
                cookTimeMinutes: cookTime,
                servings: Number(rec.servings) || req.servings,
                caloriesPerServing: Number(rec.caloriesPerServing) || 380,
                dietTags: Array.isArray(rec.dietTags) ? rec.dietTags : [req.dietaryTag || 'Lutong Bahay'],
                instructions: Array.isArray(rec.instructions) ? rec.instructions : ['Lutuin ayon sa tradisyunal na paraan.'],
                matchedIngredients,
                estimatedCost: totalCost > 0 ? totalCost : 220,
                chefTip: rec.chefTip || 'Ihain nang mainit kasama ang bagong saing na kanin.',
                suggestedSawsawan: rec.suggestedSawsawan || 'Toyo-Mansi na may Siling Labuyo',
              }
            })

            // Strict budget ceiling enforcement
            if (req.budgetLimit && req.budgetLimit > 0) {
              const maxBudget = req.budgetLimit * 1.05
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
      console.error('[Gemini API] Error, fallback to homestyle engine:', err)
    }
  }

  return generateFallbackRecipes(req.prompt, req.dietaryTag, req.servings, catalog, req.budgetLimit)
}