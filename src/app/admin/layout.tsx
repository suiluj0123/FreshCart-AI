import React from 'react'
import { createClient } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Retrieve authenticated user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  // Fetch admin profile
  const { data: profile } = await supabase
    .from('User')
    .select('name, email, role')
    .or(`authId.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()

  const isAdminRole =
    profile?.role === 'admin' ||
    profile?.role === 'system_admin' ||
    profile?.role === 'systemadmin'

  if (!isAdminRole) {
    redirect('/')
  }

  return (
    <AdminLayoutClient
      userEmail={user.email ?? undefined}
      userName={profile?.name ?? undefined}
      userRole={profile?.role ?? 'admin'}
    >
      {children}
    </AdminLayoutClient>
  )
}