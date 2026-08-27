import type { ProductWithStock } from '@/types/product'

export interface SubstituteRecommendation {
  product: ProductWithStock
  matchScore: number
  matchReason: string
}

/**
 * Intelligent Grocery Substitution Engine.
 * When a staple product is out of stock, finds top in-stock alternatives
 * in the same department/category with similar attributes, unit, and price range.
 */
export function findSmartSubstitutes(
  targetProduct: { id: string; name: string; category: string; basePrice: number; unit: string },
  catalogProducts: ProductWithStock[],
  limit = 3
): SubstituteRecommendation[] {
  // Only consider active, in-stock products excluding the target product itself
  const candidates = catalogProducts.filter(
    (p) => p.id !== targetProduct.id && p.active && p.totalStock > 0
  )

  if (candidates.length === 0) return []

  const targetWords = targetProduct.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2)

  const recommendations: SubstituteRecommendation[] = []

  for (const candidate of candidates) {
    let score = 0
    let reasons: string[] = []

    // 1. Same department / category (Base: +40 pts)
    const isSameCategory =
      candidate.category.toLowerCase() === targetProduct.category.toLowerCase()
    if (isSameCategory) {
      score += 40
      reasons.push('Same aisle')
    } else {
      score += 5
    }

    // 2. Keyword & name similarity (Up to +40 pts)
    const candidateName = candidate.name.toLowerCase()
    let wordMatches = 0
    for (const word of targetWords) {
      if (candidateName.includes(word)) {
        wordMatches++
      }
    }

    if (wordMatches > 0) {
      const matchBonus = Math.min(40, wordMatches * 15)
      score += matchBonus
      reasons.push('Similar ingredients/type')
    }

    // 3. Same unit of measure (+10 pts)
    if (candidate.unit.toLowerCase() === targetProduct.unit.toLowerCase()) {
      score += 10
    }

    // 4. Price proximity (+10 pts if within 30% price range)
    const priceDiffRatio = Math.abs(candidate.basePrice - targetProduct.basePrice) / (targetProduct.basePrice || 1)
    if (priceDiffRatio <= 0.3) {
      score += 10
      reasons.push('Similar price point')
    }

    // 5. Stock health bonus (+5 pts if healthy stock)
    if (candidate.totalStock >= 10) {
      score += 5
    }

    if (score >= 30) {
      recommendations.push({
        product: candidate,
        matchScore: score,
        matchReason: reasons.join(' • ') || 'Popular in-stock alternative',
      })
    }
  }

  // Sort descending by match score, then by stock level
  recommendations.sort((a, b) => b.matchScore - a.matchScore || b.product.totalStock - a.product.totalStock)

  return recommendations.slice(0, limit)
}
