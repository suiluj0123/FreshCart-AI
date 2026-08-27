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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const { id: productId } = await params
    const body = await request.json()

    const updateData: Record<string, any> = {}

    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.category !== undefined) updateData.category = body.category.trim()
    if (body.unit !== undefined) updateData.unit = body.unit.trim()
    if (body.basePrice !== undefined) {
      const price = Number(body.basePrice)
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'Selling price must be a valid non-negative number' }, { status: 400 })
      }
      updateData.basePrice = price
    }
    if (body.active !== undefined) updateData.active = Boolean(body.active)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { data: updatedProduct, error: updateErr } = await supabase
      .from('Product')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Invalidate caches
    cache.clear()

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully!',
      product: updatedProduct,
    })
  } catch (err: any) {
    console.error('[API /api/admin/inventory/products/[id]] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
