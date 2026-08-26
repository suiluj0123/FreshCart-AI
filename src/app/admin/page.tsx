import React from 'react'
import { createClient } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Retrieve auth user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  // Fetch their profile details
  const { data: profile } = await supabase
    .from('User')
    .select('*')
    .eq('authId', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-455">Welcome, {profile?.name || user.email}</p>
        </header>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-emerald-600 dark:text-emerald-400">Gating Status: Success</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            If you are reading this page, the Next.js routing middleware has successfully verified that you are logged in and your database profile has `role: admin`.
          </p>

          <div className="border-t border-gray-200 dark:border-gray-750 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">User Profile Debug Info:</h3>
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded text-xs text-gray-850 dark:text-gray-200 overflow-x-auto">
              {JSON.stringify(
                {
                  clerkId: user.id,
                  email: user.email,
                  profileName: profile?.name,
                  role: profile?.role,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
