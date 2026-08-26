import React from 'react'
import { createClient } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <AdminSidebar
        userEmail={user.email ?? undefined}
        userName={profile?.name ?? undefined}
        userRole={profile?.role ?? 'admin'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-gray-900">FreshCart Ops</span>
            <span>/</span>
            <span className="text-emerald-700 font-medium">Administration Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-full border border-emerald-200 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Operations Live & Connected
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}