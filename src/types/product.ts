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

// Category options matching the seed data
export const PRODUCT_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'produce', label: 'Produce' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'meat', label: 'Meat & Seafood' },
  { value: 'frozen', label: 'Frozen' },
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]['value']
