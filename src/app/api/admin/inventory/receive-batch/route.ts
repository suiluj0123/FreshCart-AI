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
    const { productId, quantity, costPrice, expiryDate } = body

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const numQty = Number(quantity)
    const numCost = Number(costPrice)

    if (isNaN(numQty) || numQty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 })
    }

    if (isNaN(numCost) || numCost < 0) {
      return NextResponse.json({ error: 'Cost price must be a non-negative number' }, { status: 400 })
    }

    if (!expiryDate) {
      return NextResponse.json({ error: 'Expiration date is required for grocery batch' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // 1. Insert new batch
    const { data: newBatch, error: insertErr } = await supabase
      .from('InventoryBatch')
      .insert({
        productId,
        quantity: numQty,
        costPrice: numCost,
        expiryDate: new Date(expiryDate).toISOString(),
        receivedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // 2. Invalidate application product cache
    cache.clear()

    return NextResponse.json({
      success: true,
      message: 'Stock batch received successfully!',
      batch: newBatch,
    })
  } catch (err: any) {
    console.error('[API /api/admin/inventory/receive-batch] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
