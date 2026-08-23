import { createClient } from '@/lib/auth/server'
import NavbarClient from '@/components/storefront/NavbarClient'

export default async function Navbar() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let userProfile: { id: string; name: string; email: string } | null = null
  let activeOrderId: string | null = null

  if (authUser) {
    const { data: profile } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('authId', authUser.id)
      .single()

    userProfile = profile
      ? { id: authUser.id, name: profile.name ?? '', email: profile.email }
      : { id: authUser.id, name: authUser.email?.split('@')[0] ?? '', email: authUser.email ?? '' }

    if (profile) {
      const { data: latestOrder } = await supabase
        .from('Order')
        .select('id, status')
        .eq('userId', profile.id)
        .neq('status', 'completed')
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestOrder) {
        activeOrderId = latestOrder.id
      }
    }
  }

  return <NavbarClient user={userProfile} initialActiveOrderId={activeOrderId} />
}
