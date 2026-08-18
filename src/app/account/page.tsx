'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  authId: string
  email: string
  name: string | null
  role: 'customer' | 'admin'
  zip: string | null
  createdAt: string
}

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login?redirectTo=/account')
        return
      }

      setUser(authUser)

      const { data: userProfile } = await supabase
        .from('User')
        .select('*')
        .eq('authId', authUser.id)
        .single()

      setProfile(userProfile)
      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-600 dark:text-gray-400">Loading profile data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Account</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your grocery orders and profile</p>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-550">Name</span>
            <span className="block text-base font-medium text-gray-900 dark:text-white">{profile?.name || 'Not provided'}</span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-550">Email</span>
            <span className="block text-base font-medium text-gray-900 dark:text-white">{user?.email}</span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-550">Postal Code (ZIP)</span>
            <span className="block text-base font-medium text-gray-900 dark:text-white">{profile?.zip || 'Not set'}</span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-550">Role</span>
            <span className="block text-base font-medium capitalize text-emerald-600 dark:text-emerald-400">{profile?.role || 'customer'}</span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-250 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
