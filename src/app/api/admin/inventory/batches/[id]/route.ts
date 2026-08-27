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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const { id: batchId } = await params
    const supabase = getAdminClient()

    // Write-off / delete batch
    const { error: delErr } = await supabase
      .from('InventoryBatch')
      .delete()
      .eq('id', batchId)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    // Invalidate product cache
    cache.clear()

    return NextResponse.json({
      success: true,
      message: 'Batch written off / removed from inventory.',
    })
  } catch (err: any) {
    console.error('[API /api/admin/inventory/batches/[id]] DELETE Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
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

    const { id: batchId } = await params
    const body = await request.json()

    const updateData: Record<string, any> = {}
    if (body.quantity !== undefined) {
      const q = Number(body.quantity)
      if (isNaN(q) || q < 0) {
        return NextResponse.json({ error: 'Quantity must be a valid non-negative number' }, { status: 400 })
      }
      updateData.quantity = q
    }
    if (body.costPrice !== undefined) {
      const c = Number(body.costPrice)
      if (isNaN(c) || c < 0) {
        return NextResponse.json({ error: 'Cost price must be a valid non-negative number' }, { status: 400 })
      }
      updateData.costPrice = c
    }
    if (body.expiryDate !== undefined) {
      updateData.expiryDate = new Date(body.expiryDate).toISOString()
    }

    const supabase = getAdminClient()

    const { data: updatedBatch, error: updateErr } = await supabase
      .from('InventoryBatch')
      .update(updateData)
      .eq('id', batchId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    cache.clear()

    return NextResponse.json({
      success: true,
      message: 'Batch updated successfully!',
      batch: updatedBatch,
    })
  } catch (err: any) {
    console.error('[API /api/admin/inventory/batches/[id]] PATCH Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
