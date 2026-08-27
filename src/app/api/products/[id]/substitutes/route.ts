import { NextResponse } from 'next/server'
import { getProducts, getProductById } from '@/lib/db/products'
import { findSmartSubstitutes } from '@/lib/substitution/engine'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const targetProduct = await getProductById(productId)

    if (!targetProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const allProducts = await getProducts({ category: 'all' })
    const substitutes = findSmartSubstitutes(targetProduct, allProducts, 3)

    return NextResponse.json({
      success: true,
      targetProductId: productId,
      substitutes: substitutes.map((s) => ({
        ...s.product,
        matchReason: s.matchReason,
        matchScore: s.matchScore,
      })),
    })
  } catch (err: any) {
    console.error('[API /api/products/[id]/substitutes] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
