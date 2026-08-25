import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/auth/server'

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
    const { recipeId, recipeTitle, rating, feedbackNote, prompt } = body

    if (!recipeId || !rating) {
      return NextResponse.json({ error: 'recipeId and rating are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    // Log the training feedback entry
    console.log(`[AI Training Feedback] Recipe: "${recipeTitle}" (${recipeId}) | Rating: ${rating} | Note: "${feedbackNote || ''}" | User: ${authUser?.email || 'Anonymous'}`)

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your feedback helps train and improve our Filipino culinary AI model.',
    })
  } catch (err: any) {
    console.error('[API /api/meal-plan/feedback] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}