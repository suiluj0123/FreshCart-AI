'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/auth/client'

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'customer' | 'admin'>('customer')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    zip: '',
  })

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/')
        return
      }

      setEmail(authUser.email || '')

      let savedName = ''
      let savedPhone = ''
      let savedAddress = ''
      let savedZip = ''

      if (typeof window !== 'undefined') {
        try {
          const cachedRaw = localStorage.getItem(`freshcart_customer_profile_${authUser.id}`)
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw)
            savedName = cached.fullName || cached.name || ''
            savedPhone = cached.phone || ''
            savedAddress = cached.address || ''
            savedZip = cached.zip || ''
          }
        } catch (e) {}
      }

      const { data: userProfile } = await supabase
        .from('User')
        .select('*')
        .eq('authId', authUser.id)
        .maybeSingle()

      if (userProfile) {
        setRole(userProfile.role || 'customer')
        savedName = userProfile.name || savedName || authUser.user_metadata?.name || ''
        savedPhone = userProfile.phone || savedPhone || ''
        savedAddress = userProfile.address || savedAddress || ''
        savedZip = userProfile.zip || savedZip || ''
      }

      setForm({
        name: savedName || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
        phone: savedPhone,
        address: savedAddress,
        zip: savedZip,
      })

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Not logged in')

      const profileObj = {
        fullName: form.name.trim(),
        name: form.name.trim(),
        email,
        phone: form.phone.trim(),
        address: form.address.trim(),
        zip: form.zip.trim(),
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(`freshcart_customer_profile_${authUser.id}`, JSON.stringify(profileObj))
      }

      try {
        const { error: updateErr } = await supabase
          .from('User')
          .update({
            name: form.name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            zip: form.zip.trim(),
          })
          .eq('authId', authUser.id)

        if (updateErr) {
          await supabase
            .from('User')
            .update({
              name: form.name.trim(),
              zip: form.zip.trim(),
            })
            .eq('authId', authUser.id)
        }
      } catch (dbErr) {
        console.warn('[Account] Supabase update warning:', dbErr)
      }

      setMessage('Profile details saved successfully! Your future checkouts will be auto-filled.')
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    if (email) {
      fetch('/api/auth/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          eventType: 'User Logout',
          status: 'success',
          userName: form.name,
          role,
        }),
      }).catch(() => {})
    }
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="h-5 w-5 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading profile details...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Bar Back Option */}
        <div className="flex items-center justify-between">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            ? Back to Shop
          </Link>

          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            ?? View Order History
          </Link>
        </div>

        {/* Top Card Header */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Account Settings
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                Customer Profile
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 capitalize border border-emerald-200">
                Role: {role}
              </span>
            </div>
          </div>

          {message && (
            <div className="mb-6 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs font-semibold text-emerald-800">
              ? {message}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 text-xs font-semibold text-red-700">
              ?? {error}
            </div>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-gray-400 mt-1">Email is tied to your login account.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Maria Santos"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Mobile Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 0917 123 4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Default Delivery Address
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Unit 402, Sunshine Towers, Bonifacio Global City, Taguig"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Postal Code (ZIP)
              </label>
              <input
                type="text"
                placeholder="e.g. 1634"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? 'Saving Details...' : 'Save Profile Details'}
            </button>
          </form>
        </div>

        {/* Account Quick Links & Sign Out */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
