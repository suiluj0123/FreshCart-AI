import { createClient } from '@supabase/supabase-js'
import type { ProductWithStock, ProductDetail, ProductFilters } from '@/types/product'
import { cache } from '@/lib/cache'

/**
 * Creates a fresh service-role Supabase client at call time.
 * Lazy init guarantees env vars are available (avoids module-load-time race in Next.js).
 * Service role bypasses RLS — only use this in server-side lib functions, never in client code.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      '[products] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.'
    )
  }
  // TEMP DEBUG — remove after confirming the right key is used
  console.log('[products:debug] url:', url?.slice(0, 30))
  console.log('[products:debug] key prefix:', key?.slice(0, 20), '| length:', key?.length)
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Fetch all active products with aggregated stock from InventoryBatch.
 * Supports category filter, search, and price sort.
 * Server-only — never call this from a Client Component.
 */
export async function getProducts(filters: ProductFilters = {}): Promise<ProductWithStock[]> {
  const cacheKey = `products_${JSON.stringify(filters)}`

  return cache.getOrSet(cacheKey, 20, async () => {
    const supabase = getAdminClient()

    // Fetch active products
    let query = supabase
      .from('Product')
      .select('id, name, category, unit, imageUrl, basePrice, active')
      .eq('active', true)

    if (filters.category && filters.category !== 'all') {
      const cat = filters.category.toLowerCase()
      if (cat === 'produce') {
        query = query.or('category.ilike.%produce%,category.ilike.%vegetable%,category.ilike.%fruit%')
      } else if (cat === 'meat') {
        query = query.or('category.ilike.%meat%,name.ilike.%pork%,name.ilike.%chicken%,name.ilike.%beef%,name.ilike.%liempo%,name.ilike.%kasim%')
      } else if (cat === 'seafood') {
        query = query.or('category.ilike.%seafood%,category.ilike.%fish%,name.ilike.%bangus%,name.ilike.%tilapia%,name.ilike.%tuna%,name.ilike.%sardines%,name.ilike.%fish%,name.ilike.%shrimp%,name.ilike.%hipon%')
      } else if (cat === 'dairy') {
        query = query.or('category.ilike.%dairy%,category.ilike.%egg%,name.ilike.%milk%,name.ilike.%cheese%,name.ilike.%butter%,name.ilike.%egg%,name.ilike.%cream%,name.ilike.%yakult%')
      } else if (cat === 'rice') {
        query = query.or('name.ilike.%rice%,name.ilike.%sinandomeng%,name.ilike.%dinorado%,name.ilike.%pasta%,name.ilike.%spaghetti%,name.ilike.%bigas%')
      } else if (cat === 'pantry') {
        query = query.or('category.ilike.%pantry%,name.ilike.%vinegar%,name.ilike.%soy sauce%,name.ilike.%toyo%,name.ilike.%suka%,name.ilike.%ginisa%,name.ilike.%magic sarap%,name.ilike.%sardines%,name.ilike.%tuna%')
      } else if (cat === 'frozen') {
        query = query.or('category.ilike.%frozen%,name.ilike.%hotdog%,name.ilike.%tocino%,name.ilike.%longganisa%,name.ilike.%nuggets%,name.ilike.%ice cream%')
      } else if (cat === 'beverages') {
        query = query.or('category.ilike.%beverage%,name.ilike.%coffee%,name.ilike.%kopiko%,name.ilike.%nescafé%,name.ilike.%nescafe%,name.ilike.%tea%,name.ilike.%juice%,name.ilike.%drink%,name.ilike.%yakult%')
      } else if (cat === 'snacks') {
        query = query.or('category.ilike.%snack%,name.ilike.%crackers%,name.ilike.%skyflakes%,name.ilike.%pancit canton%,name.ilike.%noodles%,name.ilike.%chips%,name.ilike.%biscuit%')
      } else {
        query = query.eq('category', filters.category)
      }
    }

    if (filters.search && filters.search.trim() !== '') {
      query = query.ilike('name', `%${filters.search.trim()}%`)
    }

    if (filters.sort === 'price_asc') {
      query = query.order('basePrice', { ascending: true })
    } else if (filters.sort === 'price_desc') {
      query = query.order('basePrice', { ascending: false })
    } else {
      query = query.order('name', { ascending: true })
    }

    const { data: products, error } = await query

    if (error || !products) {
      console.error('[getProducts] error:', error?.message)
      return []
    }

    if (products.length === 0) return []

    // Fetch aggregated stock for all returned products in one query
    const productIds = products.map((p) => p.id)
    const { data: batches } = await supabase
      .from('InventoryBatch')
      .select('productId, quantity')
      .in('productId', productIds)
      .gt('quantity', 0)

    // Sum stock per product
    const stockMap: Record<string, number> = {}
    for (const batch of batches ?? []) {
      stockMap[batch.productId] = (stockMap[batch.productId] ?? 0) + batch.quantity
    }

    return products.map((p) => ({
      ...p,
      imageUrl: p.imageUrl ?? null,
      totalStock: stockMap[p.id] ?? 0,
    }))
  })
}

/**
 * Fetch a single product by ID with all its inventory batches.
 * Server-only — never call this from a Client Component.
 */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  return cache.getOrSet(`product_detail_${id}`, 20, async () => {
    const supabase = getAdminClient()

    const { data: product, error } = await supabase
      .from('Product')
      .select('id, name, category, unit, imageUrl, basePrice, active')
      .eq('id', id)
      .eq('active', true)
      .single()

    if (error || !product) {
      console.error('[getProductById] error:', error?.message)
      return null
    }

    const { data: batches } = await supabase
      .from('InventoryBatch')
      .select('id, productId, quantity, expiryDate, costPrice, receivedAt')
      .eq('productId', id)
      .gt('quantity', 0)
      .order('expiryDate', { ascending: true })

    const totalStock = (batches ?? []).reduce((sum, b) => sum + b.quantity, 0)

    return {
      ...product,
      imageUrl: product.imageUrl ?? null,
      totalStock,
      batches: batches ?? [],
    }
  })
}
