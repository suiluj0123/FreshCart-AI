export type MarkdownTier = 'none' | 'early_clearance' | 'special_clearance' | 'flash_clearance'

export interface MarkdownResult {
  originalPrice: number
  effectivePrice: number
  discountPct: number
  markdownTier: MarkdownTier
  markdownBadge: string | null
  isClearance: boolean
  daysUntilExpiry: number | null
}

/**
 * Deterministic Retail Grocery Markdown Engine.
 * Calculates clearance pricing based on FEFO batch expiration dates.
 *
 * Tier Rules:
 * - > 7 days: 0% discount (Standard fresh price)
 * - 5 to 7 days: 15% discount (Early Clearance)
 * - 3 to 4 days: 30% discount (Special Clearance)
 * - <= 2 days: 50% discount (Flash Must-Go Clearance)
 */
export function calculateMarkdown(
  basePrice: number,
  earliestExpiryDateStr?: string | Date | null
): MarkdownResult {
  const price = Number(basePrice) || 0

  if (!earliestExpiryDateStr) {
    return {
      originalPrice: price,
      effectivePrice: price,
      discountPct: 0,
      markdownTier: 'none',
      markdownBadge: null,
      isClearance: false,
      daysUntilExpiry: null,
    }
  }

  const now = new Date().getTime()
  const exp = new Date(earliestExpiryDateStr).getTime()
  const daysUntilExpiry = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))

  // If already expired or > 7 days left, no active promotional markdown
  if (daysUntilExpiry <= 0 || daysUntilExpiry > 7) {
    return {
      originalPrice: price,
      effectivePrice: price,
      discountPct: 0,
      markdownTier: 'none',
      markdownBadge: null,
      isClearance: false,
      daysUntilExpiry: daysUntilExpiry <= 0 ? 0 : daysUntilExpiry,
    }
  }

  let discountPct = 0
  let markdownTier: MarkdownTier = 'none'
  let markdownBadge: string | null = null

  if (daysUntilExpiry <= 2) {
    discountPct = 50
    markdownTier = 'flash_clearance'
    markdownBadge = '🔥 50% OFF FLASH'
  } else if (daysUntilExpiry <= 4) {
    discountPct = 30
    markdownTier = 'special_clearance'
    markdownBadge = '⚡ 30% OFF'
  } else if (daysUntilExpiry <= 7) {
    discountPct = 15
    markdownTier = 'early_clearance'
    markdownBadge = '15% OFF'
  }

  const effectivePrice = Math.round(price * (1 - discountPct / 100) * 100) / 100

  return {
    originalPrice: price,
    effectivePrice,
    discountPct,
    markdownTier,
    markdownBadge,
    isClearance: discountPct > 0,
    daysUntilExpiry,
  }
}
