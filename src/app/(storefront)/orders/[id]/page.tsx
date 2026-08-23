import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOrderById } from '@/lib/db/orders'
import { createClient } from '@/lib/auth/server'
import OrderTrackingClient from '@/components/storefront/OrderTrackingClient'

interface OrderTrackingPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { id } = await params
  const order = await getOrderById(id)

  if (!order) {
    return (
      <div className="min-h-[75vh] bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 text-3xl mb-4">
            🔍
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-sm text-gray-500 mb-6">
            Order #{id.slice(0, 8)}... could not be found or has been removed.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    )
  }

  // Security Check: If order belongs to a registered user, ensure logged-in user matches
  if (order.userId) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      const { data: profile } = await supabase
        .from('User')
        .select('id, role')
        .eq('authId', authUser.id)
        .single()

      if (profile && profile.id !== order.userId && profile.role !== 'admin') {
        return notFound()
      }
    }
  }

  return <OrderTrackingClient order={order as any} />
}