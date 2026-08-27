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

export async function GET() {
  try {
    const supabase = getAdminClient()

    // 1. Fetch spoilage logs joined with Product details
    const { data: logs, error: logErr } = await supabase
      .from('SpoilageLog')
      .select('id, productId, batchId, quantity, costPrice, totalLossValuation, reason, notes, discardedBy, createdAt, Product:productId (id, name, category, unit, imageUrl)')
      .order('createdAt', { ascending: false })
      .limit(100)

    if (logErr) {
      return NextResponse.json({ error: logErr.message }, { status: 500 })
    }

    const allLogs = logs ?? []

    // 2. Aggregate Spoilage Metrics
    let totalLossValuation = 0
    let totalUnitsDiscarded = 0
    const reasonCounts: Record<string, { count: number; loss: number }> = {}
    const categoryCounts: Record<string, { count: number; loss: number }> = {}

    for (const log of allLogs) {
      const loss = Number(log.totalLossValuation) || 0
      const qty = Number(log.quantity) || 0
      totalLossValuation += loss
      totalUnitsDiscarded += qty

      const r = log.reason || 'other'
      if (!reasonCounts[r]) reasonCounts[r] = { count: 0, loss: 0 }
      reasonCounts[r].count++
      reasonCounts[r].loss += loss

      const prod = (log as any).Product
      const cat = prod?.category || 'uncategorized'
      if (!categoryCounts[cat]) categoryCounts[cat] = { count: 0, loss: 0 }
      categoryCounts[cat].count++
      categoryCounts[cat].loss += loss
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalLossValuation,
        totalUnitsDiscarded,
        totalIncidents: allLogs.length,
        reasonCounts,
        categoryCounts,
      },
      logs: allLogs,
    })
  } catch (err: any) {
    console.error('[API /api/admin/inventory/spoilage] GET Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }

    const body = await request.json()
    const { productId, batchId, quantity, reason, notes } = body

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const numQty = Number(quantity)
    if (isNaN(numQty) || numQty <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 })
    }

    const validReasons = ['expired', 'damaged_packaging', 'bruised_produce', 'cold_chain_failure', 'other']
    const finalReason = validReasons.includes(reason) ? reason : 'other'

    const supabase = getAdminClient()

    // 1. Fetch batch details if batchId provided
    let costPrice = 0
    if (batchId) {
      const { data: batch } = await supabase
        .from('InventoryBatch')
        .select('id, costPrice, quantity')
        .eq('id', batchId)
        .maybeSingle()

      if (batch) {
        costPrice = Number(batch.costPrice) || 0
        const newBatchQty = Math.max(0, Number(batch.quantity) - numQty)

        // Update batch quantity in database
        await supabase
          .from('InventoryBatch')
          .update({ quantity: newBatchQty })
          .eq('id', batchId)
      }
    }

    const totalLossValuation = Math.round(numQty * costPrice * 100) / 100
    const adminName = authCheck.profile?.name || authCheck.user?.email || 'Admin'

    // 2. Insert Spoilage Audit Record
    const { data: newLog, error: insertErr } = await supabase
      .from('SpoilageLog')
      .insert({
        productId,
        batchId: batchId || null,
        quantity: numQty,
        costPrice,
        totalLossValuation,
        reason: finalReason,
        notes: notes ? String(notes).trim() : null,
        discardedBy: adminName,
      })
      .select('id, productId, batchId, quantity, costPrice, totalLossValuation, reason, notes, discardedBy, createdAt')
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // 3. Clear cache
    cache.clear()

    return NextResponse.json({
      success: true,
      message: `Batch recorded to Spoilage Audit Log (Loss: ₱${totalLossValuation.toFixed(2)}).`,
      spoilageLog: newLog,
    })
  } catch (err: any) {
    console.error('[API /api/admin/inventory/spoilage] POST Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
