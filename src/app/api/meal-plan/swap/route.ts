import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateMealPlan, CatalogProduct } from '@/lib/ai/generateMealPlan'

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
    const body = await request.json()
    const { currentRecipeTitle, swapReason, servings = 4 } = body

    const admin = getAdminClient()

    // 1. Fetch live active store catalog
    const { data: rawProducts } = await admin
      .from('Product')
      .select('id, name, category, unit, basePrice, imageUrl')
      .eq('active', true)

    const catalog: CatalogProduct[] = (rawProducts ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      basePrice: p.basePrice,
      imageUrl: p.imageUrl,
    }))

    const swapPrompt = `Generate a delicious alternative Filipino dish to replace "${currentRecipeTitle}". Requirement: ${swapReason || 'A different popular Filipino homestyle dish'}.`

    const newRecipes = await generateMealPlan(
      {
        prompt: swapPrompt,
        servings: Number(servings) || 4,
      },
      catalog
    )

    const replacementRecipe = newRecipes[0] || null

    if (!replacementRecipe) {
      return NextResponse.json({ error: 'Could not generate alternative dish' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      replacementRecipe,
    })
  } catch (err: any) {
    console.error('[API /api/meal-plan/swap] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}