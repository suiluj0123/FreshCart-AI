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
      <svg className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 10a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2v-8zM10 14a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    ),
  },
  {
    label: 'Inventory & Batches',
    href: '/admin/inventory',
    icon: (active) => (
      <svg className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Order Management',
    href: '/admin/orders',
    icon: (active) => (
      <svg className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    label: 'Clearance Bundles',
    href: '/admin/clearance',
    icon: (active) => (
      <svg className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: 'User Management',
    href: '/admin/users',
    icon: (active) => (
      <svg className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: 'Reports & Sales',
    href: '/admin/reports',
    icon: (active) => (
      <svg className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: 'Audit Trail & Logs',
    href: '/admin/audit',
    icon: (active) => (
      <svg className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    label: 'Settings & Profile',
    href: '/admin/settings',
    icon: (active) => (
      <svg className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

interface AdminSidebarProps {
  userEmail?: string
  userName?: string
  userRole?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

export default function AdminSidebar({
  userEmail,
  userName,
  userRole = 'admin',
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
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

  useEffect(() => {
    if (userName) {
      setCurrentName(userName)
      setNameInput(userName)
    }
  }, [userName])

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

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    try {
      setSavingName(true)
      setFeedbackMsg(null)

      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        setCurrentName(nameInput.trim())
        setEditingName(false)
        setFeedbackMsg('Name updated successfully!')
        setTimeout(() => setFeedbackMsg(null), 3000)
        router.refresh()
      } else {
        setFeedbackMsg(data.error || 'Failed to update name')
      }
    } catch {
      setFeedbackMsg('Error saving profile changes')
    } finally {
      setSavingName(false)
    }
  }

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

  // Sidebar Content JSX (Shared between Desktop & Mobile Drawer)
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-gray-800 border-r border-gray-200">
      {/* Brand Header */}
      <div className={`p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
        <Link
          href="/admin"
          onClick={onCloseMobile}
          className="flex items-center gap-3 min-w-0"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm text-white font-black text-lg shrink-0">
            F
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-gray-900 truncate">FreshCart</span>
                <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                  {isSystemAdmin ? 'SysAdmin' : 'Admin'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium truncate">
                {isSystemAdmin ? 'System & Store Ops' : 'Store Operations'}
              </p>
            </div>
          )}
        </Link>

        {/* Desktop Minimize Toggle Button (Visible on Large Screens) */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>

        {/* Mobile Close Button (Visible on Mobile Drawer) */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Management
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              {item.icon(isActive)}
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              
              {/* Floating Tooltip in Collapsed Mode */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}

        {!isCollapsed && (
          <div className="pt-5 px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Customer Store
          </div>
        )}
        <Link
          href="/"
          onClick={onCloseMobile}
          title={isCollapsed ? 'Live Storefront' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-emerald-700 transition-colors group relative ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {!isCollapsed && (
            <>
              <span className="truncate">Live Storefront</span>
              <span className="ml-auto text-xs text-gray-400">↗</span>
            </>
          )}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
              Live Storefront ↗
            </div>
          )}
        </Link>
      </nav>

      {/* Admin User Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/70 relative shrink-0">
        <div className={`flex items-center justify-between gap-2 p-1.5 rounded-2xl hover:bg-white transition-colors border border-transparent hover:border-gray-200 ${isCollapsed ? 'justify-center p-1' : ''}`}>
          {/* User Avatar & Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black border border-emerald-200 shrink-0">
              {(currentName || userEmail || 'S')[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-gray-900 truncate leading-tight">
                  {currentName || (isSystemAdmin ? 'System Administrator' : 'Store Administrator')}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold truncate flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  {isSystemAdmin ? 'SysAdmin' : 'Store Admin'}
                </p>
              </div>
            )}
          </div>

          {/* Settings Gear Button */}
          <button
            type="button"
            onClick={() => setShowSettingsPopup((v) => !v)}
            title="Admin Profile & Settings"
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-emerald-700 transition-all cursor-pointer shrink-0 border border-transparent hover:border-gray-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Settings Popup Modal */}
        {showSettingsPopup && (
          <div
            ref={popupRef}
            className="absolute bottom-full left-2 right-2 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 space-y-3"
            style={{ width: isCollapsed ? '260px' : 'auto' }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-900">Admin Profile</span>
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  {userRole}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSettingsPopup(false)
                  setEditingName(false)
                }}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            {feedbackMsg && (
              <div className="p-2 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {feedbackMsg}
              </div>
            )}

            {!editingName ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Display Name</span>
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-xs font-bold text-gray-900 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-100">
                  {currentName || 'System Administrator'}
                </p>
                <p className="text-[10px] text-gray-400">{userEmail}</p>
              </div>
            ) : (
              <form onSubmit={handleSaveName} className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                  Edit Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  required
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingName}
                    className="flex-1 bg-emerald-600 text-white text-[11px] font-bold py-1.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="px-2 py-1.5 text-[11px] text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="border-t border-gray-100 pt-2 space-y-1">
              <Link
                href="/admin/settings"
                onClick={() => {
                  setShowSettingsPopup(false)
                  if (onCloseMobile) onCloseMobile()
                }}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <span>⚙️ Account Settings</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loggingOut}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                <span>🚪 {loggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar (Fixed side navigation) */}
      <aside
        className={`hidden lg:flex flex-col min-h-screen shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed top-0 bottom-0 left-0 z-10 w-[85vw] max-w-xs bg-white shadow-2xl flex flex-col h-[100dvh] overflow-hidden transform transition-transform duration-300 ease-in-out">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}