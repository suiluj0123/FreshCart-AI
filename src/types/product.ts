// Matches the "Product" table in schema.sql exactly
export interface Product {
  id: string
  name: string
  category: string
  unit: string
  imageUrl: string | null
  basePrice: number
  active: boolean
}

// Matches the "InventoryBatch" table in schema.sql exactly
export interface InventoryBatch {
  id: string
  productId: string
  quantity: number
  expiryDate: string
  costPrice: number
  receivedAt: string
}

// Product joined with aggregated stock from all active InventoryBatches
export interface ProductWithStock extends Product {
  totalStock: number
}

// Full product detail including all its inventory batches
export interface ProductDetail extends Product {
  totalStock: number
  batches: InventoryBatch[]
}

// Filter params for the product listing page
export interface ProductFilters {
  category?: string
  search?: string
  sort?: 'price_asc' | 'price_desc'
}

// Category options matching authentic Philippine supermarket aisles
export const PRODUCT_CATEGORIES = [
  { value: 'all', label: 'All Items' },
  { value: 'produce', label: 'Fresh Fruits & Vegetables' },
  { value: 'meat', label: 'Fresh Meat & Poultry' },
  { value: 'seafood', label: 'Fresh Seafood & Fish' },
  { value: 'dairy', label: 'Dairy & Eggs' },
  { value: 'rice', label: 'Rice & Grains' },
  { value: 'pantry', label: 'Pantry & Cooking Essentials' },
  { value: 'frozen', label: 'Frozen & Processed Foods' },
  { value: 'beverages', label: 'Beverages & Coffee' },
  { value: 'snacks', label: 'Snacks & Biscuits' },
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]['value']

/**
 * Resolves the accurate, customer-facing Philippine supermarket category label for a product
 */
export function getProductCategoryLabel(product: { name: string; category: string }): string {
  const name = (product.name || '').toLowerCase()
  const rawCat = (product.category || '').toLowerCase()

  // 1. Seafood & Fish (e.g. Bangus, Tilapia, Tuna Flakes, Sardines)
  if (
    name.includes('bangus') ||
    name.includes('tilapia') ||
    name.includes('tuna') ||
    name.includes('sardines') ||
    name.includes('fish') ||
    name.includes('shrimp') ||
    name.includes('hipon') ||
    name.includes('tahong') ||
    name.includes('seafood') ||
    rawCat === 'seafood'
  ) {
    return 'Seafood & Fish'
  }

  // 2. Meat & Poultry (Pork, Chicken, Beef)
  if (
    name.includes('pork') ||
    name.includes('liempo') ||
    name.includes('kasim') ||
    name.includes('chicken') ||
    name.includes('manok') ||
    name.includes('beef') ||
    name.includes('baka') ||
    name.includes('bulalo') ||
    name.includes('caldereta cut') ||
    name.includes('adobo cut') ||
    rawCat === 'meat'
  ) {
    return 'Meat & Poultry'
  }

  // 3. Frozen & Processed Foods (Hotdogs, Tocino, Longganisa, Nuggets)
  if (
    name.includes('hotdog') ||
    name.includes('tocino') ||
    name.includes('longganisa') ||
    name.includes('nuggets') ||
    name.includes('bacon') ||
    name.includes('ham') ||
    name.includes('ice cream') ||
    rawCat === 'frozen'
  ) {
    return 'Frozen & Processed'
  }

  // 4. Beverages & Coffee (Coffee, Powdered Milk Drink, Tea, Juices)
  if (
    name.includes('coffee') ||
    name.includes('kopiko') ||
    name.includes('nescafé') ||
    name.includes('nescafe') ||
    name.includes('powdered milk') ||
    name.includes('bear brand') ||
    name.includes('tea') ||
    name.includes('juice') ||
    name.includes('drink') ||
    rawCat === 'beverages'
  ) {
    return 'Beverages & Coffee'
  }

  // 5. Snacks & Biscuits (Crackers, Pancit Canton, Chips, Noodles)
  if (
    name.includes('crackers') ||
    name.includes('skyflakes') ||
    name.includes('pancit canton') ||
    name.includes('noodles') ||
    name.includes('biscuit') ||
    name.includes('chips') ||
    name.includes('snack') ||
    rawCat === 'snacks'
  ) {
    return 'Snacks & Biscuits'
  }

  // 6. Rice & Grains (Sinandomeng, Dinorado, Bigas, Pasta, Spaghetti)
  if (
    name.includes('rice') ||
    name.includes('bigas') ||
    name.includes('sinandomeng') ||
    name.includes('dinorado') ||
    name.includes('jasmine') ||
    name.includes('spaghetti') ||
    name.includes('pasta') ||
    rawCat === 'rice'
  ) {
    return 'Rice & Grains'
  }

  // 7. Dairy & Eggs (Fresh Eggs, Butter, Cheese, Fresh Liquid Milk, Yakult)
  if (
    name.includes('egg') ||
    name.includes('itlog') ||
    name.includes('milk') ||
    name.includes('cheese') ||
    name.includes('butter') ||
    name.includes('cream') ||
    name.includes('yakult') ||
    rawCat === 'dairy'
  ) {
    return 'Dairy & Eggs'
  }

  // 8. Fresh Fruits & Vegetables (Produce, Gulay, Prutas, Aromatics)
  if (
    rawCat === 'produce' ||
    name.includes('calamansi') ||
    name.includes('mango') ||
    name.includes('banana') ||
    name.includes('saba') ||
    name.includes('kangkong') ||
    name.includes('garlic') ||
    name.includes('bawang') ||
    name.includes('onion') ||
    name.includes('sibuyas') ||
    name.includes('avocado') ||
    name.includes('cabbage') ||
    name.includes('eggplant') ||
    name.includes('talong') ||
    name.includes('ginger') ||
    name.includes('luya') ||
    name.includes('sitaw') ||
    name.includes('sayote') ||
    name.includes('tomato') ||
    name.includes('kamatis') ||
    name.includes('potato') ||
    name.includes('patatas')
  ) {
    return 'Fruits & Vegetables'
  }

  // 9. Pantry & Cooking Essentials (Soy sauce, Vinegar, Magic Sarap, Seasoning)
  if (
    name.includes('ginisa mix') ||
    name.includes('magic sarap') ||
    name.includes('vinegar') ||
    name.includes('suka') ||
    name.includes('soy sauce') ||
    name.includes('toyo') ||
    name.includes('fish sauce') ||
    name.includes('patis') ||
    name.includes('oil') ||
    name.includes('sinigang mix') ||
    rawCat === 'pantry'
  ) {
    return 'Pantry Essentials'
  }

  return 'Pantry Essentials'
}
