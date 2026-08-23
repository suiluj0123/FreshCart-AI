import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'Not logged in' })
  }

  const admin = getAdminClient()

  const { data: profileByClerkId } = await admin.from('User').select('*').eq('clerkId', authUser.id).maybeSingle()
  const { data: profileByEmail } = await admin.from('User').select('*').eq('email', authUser.email ?? '').maybeSingle()
  const { data: allOrders } = await admin.from('Order').select('id, userId, status, total, createdAt').order('createdAt', { ascending: false }).limit(20)
  const { data: allUsers } = await admin.from('User').select('id, clerkId, email, name').limit(10)

  return NextResponse.json({
    authUserId: authUser.id,
    authUserEmail: authUser.email,
    profileByClerkId,
    profileByEmail,
    allUsers,
    allOrders,
  })
}