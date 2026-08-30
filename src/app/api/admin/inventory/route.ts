import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { calculateMarkdown } from '@/lib/pricing/markdown'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

export async function GET() {
  try {
    const supabase = getAdminClient()

    // 1. Fetch all products
    const { data: products, error: prodErr } = await supabase
      .from('Product')
      .select('id, name, category, unit, imageUrl, basePrice, active')
      .order('name', { ascending: true })

    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 500 })
    }

    const allProducts = products ?? []
    const productIds = allProducts.map((p) => p.id)

    // 2. Fetch all inventory batches sorted by FEFO (expiryDate ASC)
    let batchesByProduct: Record<string, any[]> = {}
    const now = new Date()
    const nowIso = now.toISOString()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    let expiredBatchesToZero: { id: string; quantity: number; costPrice: number }[] = []

    if (productIds.length > 0) {
      const { data: batches, error: batchErr } = await supabase
        .from('InventoryBatch')
        .select('id, productId, quantity, expiryDate, costPrice, receivedAt')
        .in('productId', productIds)
        .order('expiryDate', { ascending: true })

      if (!batchErr && batches) {
        for (const b of batches) {
          const expDate = new Date(b.expiryDate)
          const qty = Number(b.quantity)

          // Auto-detect expired food with remaining quantity
          if (expDate < now && qty > 0) {
            expiredBatchesToZero.push({ id: b.id, quantity: qty, costPrice: Number(b.costPrice) || 0 })
            b.quantity = 0 // Auto-remove from sellable memory stock immediately
            ;(b as any).wasAutoPurged = true
          }

          if (!batchesByProduct[b.productId]) {
            batchesByProduct[b.productId] = []
          }
          batchesByProduct[b.productId].push(b)
        }
      }
    }

    // 3. Persist auto-removal of expired stock in database
    if (expiredBatchesToZero.length > 0) {
      for (const item of expiredBatchesToZero) {
        await supabase
          .from('InventoryBatch')
          .update({ quantity: 0 })
          .eq('id', item.id)
      }
    }

    let totalValuation = 0
    let totalStockUnits = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let nearExpiryBatchesCount = 0
    let nearExpiryProductsCount = 0
    let expiredProductsCount = 0
    let expiredBatchesCount = expiredBatchesToZero.length

    const enrichedProducts = allProducts.map((prod) => {
      const batches = batchesByProduct[prod.id] || []
      const activeBatches = batches.filter((b) => Number(b.quantity) > 0)
      const totalStock = activeBatches.reduce((sum, b) => sum + Number(b.quantity), 0)

      let stockValuation = 0
      let weightedCostSum = 0
      let hasNearExpiry = false
      let nearExpiryUnits = 0
      let earliestNearExpiryDate: string | null = null

      let hasExpiredBatches = false
      let expiredBatchesCountForProduct = 0

      for (const b of batches) {
        const expDate = new Date(b.expiryDate)
        if (expDate < now || (b as any).wasAutoPurged) {
          hasExpiredBatches = true
          expiredBatchesCountForProduct++
        }
      }

      // A product is only considered "Expired" if it currently has NO active stock because its batches expired
      const isExpired = totalStock === 0 && hasExpiredBatches && batches.length > 0

      if (isExpired) {
        expiredProductsCount++
      }

      for (const b of activeBatches) {
        const qty = Number(b.quantity)
        const cost = Number(b.costPrice) || 0
        stockValuation += qty * cost
        weightedCostSum += qty * cost

        const expDate = new Date(b.expiryDate)
        if (expDate >= now && expDate <= sevenDaysFromNow) {
          hasNearExpiry = true
          nearExpiryBatchesCount++
          nearExpiryUnits += qty
          if (!earliestNearExpiryDate || expDate < new Date(earliestNearExpiryDate)) {
            earliestNearExpiryDate = b.expiryDate
          }
        }
      }

      if (hasNearExpiry) {
        nearExpiryProductsCount++
      }

      totalValuation += stockValuation
      totalStockUnits += totalStock

      if (totalStock === 0) {
        outOfStockCount++
      } else if (totalStock <= 10) {
        lowStockCount++
      }

      const avgCostPrice = totalStock > 0 ? weightedCostSum / totalStock : 0
      const marginPct = prod.basePrice > 0 ? Math.round(((prod.basePrice - avgCostPrice) / prod.basePrice) * 100) : 0

      // Stock health badge
      const healthStatus =
        isExpired
          ? 'expired'
          : totalStock === 0
          ? 'out_of_stock'
          : totalStock <= 10
          ? 'low_stock'
          : 'healthy'

      const markdown = calculateMarkdown(prod.basePrice, totalStock > 0 ? earliestNearExpiryDate || activeBatches[0]?.expiryDate : null)

      return {
        ...prod,
        totalStock,
        stockValuation,
        avgCostPrice,
        marginPct,
        healthStatus,
        hasNearExpiry,
        nearExpiryUnits,
        earliestNearExpiryDate,
        isExpired,
        hasExpiredBatches,
        expiredBatchesCount: expiredBatchesCountForProduct,
        effectivePrice: markdown.effectivePrice,
        discountPct: markdown.discountPct,
        markdownTier: markdown.markdownTier,
        markdownBadge: markdown.markdownBadge,
        isClearance: markdown.isClearance,
        daysUntilExpiry: markdown.daysUntilExpiry,
        batches,
      }
    })

    return NextResponse.json({
      success: true,
      metrics: {
        totalSkus: allProducts.length,
        totalStockUnits,
        totalValuation,
        lowStockCount,
        outOfStockCount,
        nearExpiryBatchesCount,
        nearExpiryProductsCount,
        expiredProductsCount,
        expiredBatchesAutoPurged: expiredBatchesCount,
      },
      products: enrichedProducts,
    })
  } catch (err: any) {
    console.error('[API /api/admin/inventory] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
