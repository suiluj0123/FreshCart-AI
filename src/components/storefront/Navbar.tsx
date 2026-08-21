import { createClient } from '@/lib/auth/server'
import NavbarClient from '@/components/storefront/NavbarClient'

export default async function Navbar() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let userProfile: { name: string; email: string } | null = null

  if (authUser) {
    const { data: profile } = await supabase
      .from('User')
      .select('name, email')
      .eq('authId', authUser.id)
      .single()

    userProfile = profile
      ? { name: profile.name ?? '', email: profile.email }
      : { name: authUser.email?.split('@')[0] ?? '', email: authUser.email ?? '' }
  }

  return <NavbarClient user={userProfile} />
}
