import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/auth/server'
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
    const { prompt, dietaryTag, servings = 4, budgetLimit } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const admin = getAdminClient()

    // 1. Fetch all active products from catalog
    const { data: rawProducts, error: prodErr } = await admin
      .from('Product')
      .select('id, name, category, unit, basePrice, imageUrl')
      .eq('active', true)

    if (prodErr || !rawProducts || rawProducts.length === 0) {
      console.warn('[MealPlan API] No products found in DB, using empty catalog')
    }

    const catalog: CatalogProduct[] = (rawProducts ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      basePrice: p.basePrice,
      imageUrl: p.imageUrl,
    }))

    // 2. Generate recipes using AI
    const recipes = await generateMealPlan(
      {
        prompt: prompt.trim(),
        dietaryTag: dietaryTag || undefined,
        servings: Number(servings) || 4,
        budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
      },
      catalog
    )

    const totalPlanCost = recipes.reduce((sum, r) => sum + r.estimatedCost, 0)

    // 3. Save to MealPlan database table if user is logged in
    try {
      const supabase = await createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        const { data: profile } = await admin
          .from('User')
          .select('id')
          .eq('authId', authUser.id)
          .maybeSingle()

        if (profile) {
          await admin.from('MealPlan').insert({
            userId: profile.id,
            prompt: prompt.trim(),
            generatedRecipesJson: recipes,
          })
        }
      }
    } catch (dbErr) {
      console.warn('[MealPlan API] Optional save error:', dbErr)
    }

    return NextResponse.json({
      success: true,
      recipes,
      totalPlanCost,
      catalog,
    })
  } catch (err: any) {
    console.error('[API /api/meal-plan/generate] Error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to generate meal plan' }, { status: 500 })
  }
}