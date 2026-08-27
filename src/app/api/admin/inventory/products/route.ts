import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cache } from '@/lib/cache'
import { requireAdmin } from '@/lib/auth/rbac'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const body = await request.json()
    const { name, category, unit, basePrice, imageUrl, active, initialQuantity, costPrice, expiryDate } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    if (!unit || !unit.trim()) {
      return NextResponse.json({ error: 'Unit (e.g. kg, pack, each) is required' }, { status: 400 })
    }

    const price = Number(basePrice)
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Selling base price must be a valid non-negative number' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // 1. Insert product
    const { data: product, error: insertProdErr } = await supabase
      .from('Product')
      .insert({
        name: name.trim(),
        category: category.trim().toLowerCase(),
        unit: unit.trim().toLowerCase(),
        basePrice: price,
        imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : null,
        active: active !== undefined ? Boolean(active) : true,
      })
      .select()
      .single()

    if (insertProdErr || !product) {
      return NextResponse.json({ error: insertProdErr?.message || 'Failed to create product' }, { status: 500 })
    }

    // 2. If initial stock batch provided, insert batch
    const initialQty = Number(initialQuantity)
    if (!isNaN(initialQty) && initialQty > 0) {
      const cost = Number(costPrice) || 0
      const expDate = expiryDate ? new Date(expiryDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await supabase.from('InventoryBatch').insert({
        productId: product.id,
        quantity: initialQty,
        costPrice: cost,
        expiryDate: expDate,
        receivedAt: new Date().toISOString(),
      })
    }

    // 3. Invalidate cache
    cache.clear()

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" created successfully under ${product.category}!`,
      product,
    })
  } catch (err: any) {
    console.error('[API /api/admin/inventory/products] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
