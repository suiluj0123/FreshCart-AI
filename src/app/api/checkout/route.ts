﻿import { NextResponse } from 'next/server'
import { createOrderInDb } from '@/lib/db/orders'
import type { CreateOrderPayload } from '@/types/cart'
import { createClient } from '@/lib/auth/server'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderPayload

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    if (!body.customerDetails?.email || !body.customerDetails?.fullName) {
      return NextResponse.json(
        { error: 'Customer name and email are required' },
        { status: 400 }
      )
    }

    // Attach logged in user profile if present
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser && !body.userId) {
      const { data: profile } = await supabase
        .from('User')
        .select('id')
        .eq('authId', authUser.id)
        .maybeSingle()

      if (profile) {
        body.userId = profile.id
      }
    }

    const result = await createOrderInDb(body)

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      total: result.total,
      createdAt: result.createdAt,
    })
  } catch (error: any) {
    console.error('[API /api/checkout] Error:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Failed to process checkout' },
      { status: 500 }
    )
  }
}
