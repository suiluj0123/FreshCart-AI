'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'

export default function AdminSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: 'admin',
    phone: '',
    createdAt: '',
  })

  const [confirmLogout, setConfirmLogout] = useState(false)

  // Fetch Admin Profile
  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/profile')
      const json = await res.json()
      if (json.success && json.profile) {
        setProfile({
          name: json.profile.name || '',
          email: json.profile.email || '',
          role: json.profile.role || 'admin',
          phone: json.profile.phone || '',
          createdAt: json.profile.createdAt || '',
        })
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err)
      setError('Could not load profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update profile')
      }

      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(null), 4000)
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Admin Logout
  const handleAdminSignOut = async () => {
    try {
      setSigningOut(true)

      // 1. Log User Logout to real-time auth audit logger
      if (profile.email) {
        try {
          await fetch('/api/auth/log-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail: profile.email,
              userName: profile.name || profile.email.split('@')[0],
              role: profile.role,
              eventType: 'User Logout',
              status: 'success',
              device: 'Admin Portal Settings',
            }),
          })
        } catch {
          // Non-blocking
        }
      }

      // 2. Sign out via Supabase
      await supabase.auth.signOut()

      // 3. Redirect to storefront
      router.push('/')
      router.refresh()
    } catch (err: any) {
      console.error('Sign out error:', err)
      setError('Failed to sign out. Please try again.')
      setSigningOut(false)
    }
  }

  const isSystemAdmin = profile.role === 'system_admin' || profile.role === 'systemadmin'

  return (
    <div className="max-w-4xl space-y-6">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Settings & System Profile
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your administrator identity, contact details, system session, and security controls
          </p>
        </div>

        <button
          onClick={() => setConfirmLogout(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Sign Out of Admin Portal 🚪</span>
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>✓ {message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-700 font-black">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>✕ {error}</span>
          <button onClick={() => setError(null)} className="text-red-700 font-black">✕</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-gray-200 text-center shadow-xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="text-xs text-gray-500 font-bold mt-3">Loading administrator profile...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: PROFILE EDIT FORM */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-black text-gray-900">Administrator Identity</h3>
                  <p className="text-[11px] text-gray-400">Update your display name and contact information</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {isSystemAdmin ? 'System Admin' : 'Store Admin'}
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="e.g. Louie Louie"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">This name appears on audit logs and report headers.</p>
                </div>

                {/* Email (Read-Only) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      readOnly
                      value={profile.email}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-600 font-mono cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Primary administrative login credential.</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Contact Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="e.g. +63 912 345 6789"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-medium"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* SECURITY & SESSION CARD */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-black text-gray-900">Session & Access Control</h3>
                  <p className="text-[11px] text-gray-400">Manage your active admin portal authentication</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900">End Active Session</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Sign out of the administration console. You will be redirected to the storefront.
                  </p>
                </div>

                <button
                  onClick={() => setConfirmLogout(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STORE INFO & SYSTEM SCOPE */}
          <div className="space-y-6">
            {/* System Profile Summary Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-black border border-emerald-200">
                  {(profile.name || profile.email || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">{profile.name || 'Administrator'}</h3>
                  <p className="text-[10px] text-gray-400 font-mono">{profile.email}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Access Scope:</span>
                  <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Full System Access
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Account Type:</span>
                  <span className="font-bold text-gray-800 capitalize">{profile.role}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Registered:</span>
                  <span className="font-mono text-gray-700 text-[11px]">
                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified Staff'}
                  </span>
                </div>
              </div>
            </div>

            {/* Store Configuration Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Store Environment</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Store Name:</span>
                  <span className="font-bold text-gray-900">FreshCart AI Grocery</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Base Currency:</span>
                  <span className="font-mono font-bold text-gray-900">PHP (₱)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Timezone:</span>
                  <span className="font-mono text-gray-700">Asia/Manila (PHT)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Operations Status:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online & Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION LOGOUT MODAL */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center font-black text-lg">
                !
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900">Sign Out of Admin Portal?</h3>
                <p className="text-xs text-gray-500">You will need to sign in again to access the operations dashboard.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-600">
              Logged in as: <strong className="text-gray-900">{profile.email}</strong> ({profile.name})
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={signingOut}
                onClick={handleAdminSignOut}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
              >
                {signingOut ? 'Signing out...' : 'Confirm Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
