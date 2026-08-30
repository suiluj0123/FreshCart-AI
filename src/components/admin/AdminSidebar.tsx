'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'

interface NavItem {
  label: string
  href: string
  icon: (active: boolean) => React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview & Analytics',
    href: '/admin',
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 10a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2v-8zM10 14a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    ),
  },
  {
    label: 'Inventory & Batches',
    href: '/admin/inventory',
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Order Management',
    href: '/admin/orders',
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    label: 'Clearance Bundles',
    href: '/admin/clearance',
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: 'User Management',
    href: '/admin/users',
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: 'Reports & Sales',
    href: '/admin/reports',
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: 'Audit Trail & Logs',
    href: '/admin/audit',
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    label: 'Settings & Profile',
    href: '/admin/settings',
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function AdminSidebar({
  userEmail,
  userName,
  userRole = 'admin',
}: {
  userEmail?: string
  userName?: string
  userRole?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [showSettingsPopup, setShowSettingsPopup] = useState(false)
  const [currentName, setCurrentName] = useState(userName || '')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(userName || '')
  const [savingName, setSavingName] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const popupRef = useRef<HTMLDivElement>(null)
  const isSystemAdmin = userRole === 'system_admin' || userRole === 'systemadmin'

  // Sync initial name
  useEffect(() => {
    if (userName) {
      setCurrentName(userName)
      setNameInput(userName)
    }
  }, [userName])

  // Close popup when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowSettingsPopup(false)
        setEditingName(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettingsPopup(false)
        setEditingName(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Handle Save Profile Name
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    try {
      setSavingName(true)
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      })

      const json = await res.json()
      if (json.success) {
        setCurrentName(nameInput.trim())
        setEditingName(false)
        setFeedbackMsg('Name updated!')
        setTimeout(() => setFeedbackMsg(null), 3000)
        router.refresh()
      }
    } catch {
      // Error handling
    } finally {
      setSavingName(false)
    }
  }

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      setLoggingOut(true)
      if (userEmail) {
        try {
          await fetch('/api/auth/log-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail,
              userName: currentName || userEmail.split('@')[0],
              role: userRole,
              eventType: 'User Logout',
              status: 'success',
              device: 'Admin Sidebar Footer',
            }),
          })
        } catch {}
      }

      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Sign out error:', err)
      setLoggingOut(false)
    }
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-white text-gray-800 flex flex-col min-h-screen border-r border-gray-200 relative">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm text-white font-black text-lg">
            F
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-gray-900">FreshCart</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                {isSystemAdmin ? 'SysAdmin' : 'Admin'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              {isSystemAdmin ? 'System & Store Ops' : 'Store Operations'}
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3.5 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Management
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon(isActive)}
              <span>{item.label}</span>
            </Link>
          )
        })}

        <div className="pt-6 px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Customer Store
        </div>
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
        >
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Live Storefront</span>
          <span className="ml-auto text-xs text-gray-400">↗</span>
        </Link>
      </nav>

      {/* Admin User Footer with Settings Gear Button Beside */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/70 relative">
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl hover:bg-white transition-colors border border-transparent hover:border-gray-200">
          {/* User Avatar & Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold border border-emerald-200 flex-shrink-0">
              {(currentName || userEmail || 'S')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-gray-900 truncate leading-tight">
                {currentName || (isSystemAdmin ? 'System Administrator' : 'Store Administrator')}
              </p>
              <p className="text-[10px] text-emerald-700 font-semibold truncate flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {isSystemAdmin ? 'System Administrator' : 'Store Administrator'}
              </p>
            </div>
          </div>

          {/* Settings Gear Button (Right beside the info!) */}
          <button
            type="button"
            onClick={() => setShowSettingsPopup(!showSettingsPopup)}
            title="Admin Profile & Settings"
            className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
              showSettingsPopup
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* SETTINGS & PROFILE POPUP DROPDOWN (BESIDE THERE) */}
        {showSettingsPopup && (
          <div
            ref={popupRef}
            className="absolute bottom-16 left-3 right-3 z-50 bg-white rounded-3xl p-4 shadow-2xl border border-gray-200 space-y-3.5 animate-fadeIn"
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Settings & Profile
                </span>
                <p className="text-[11px] text-gray-500 font-mono truncate max-w-[170px]">{userEmail}</p>
              </div>
              <button
                onClick={() => setShowSettingsPopup(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-700 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {feedbackMsg && (
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                ✓ {feedbackMsg}
              </div>
            )}

            {/* Profile Name Edit */}
            <div>
              {editingName ? (
                <form onSubmit={handleSaveName} className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-700">Display Name:</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    placeholder="Enter your name"
                  />
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingName}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold shadow-xs disabled:opacity-50"
                    >
                      {savingName ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Admin Name</span>
                    <p className="text-xs font-bold text-gray-900 truncate">{currentName || 'System Administrator'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setNameInput(currentName)
                      setEditingName(true)
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Links & Actions */}
            <div className="space-y-1.5 pt-1">
              <Link
                href="/admin/settings"
                onClick={() => setShowSettingsPopup(false)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>Full Settings & Preferences</span>
                <span className="text-gray-400">➔</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{loggingOut ? 'Signing out...' : 'Sign Out 🚪'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}