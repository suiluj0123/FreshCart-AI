'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  const isSystemAdmin = userRole === 'system_admin' || userRole === 'systemadmin'

  return (
    <aside className="w-64 flex-shrink-0 bg-white text-gray-800 flex flex-col min-h-screen border-r border-gray-200">
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

      {/* Admin User Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-1.5 py-1">
          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold border border-emerald-200">
            {(userName || userEmail || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{userName || userEmail || 'Administrator'}</p>
            <p className="text-[11px] text-emerald-700 font-semibold truncate flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {isSystemAdmin ? 'System Administrator' : 'Store Administrator'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}