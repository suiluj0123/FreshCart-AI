'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminSidebar from '@/components/admin/AdminSidebar'

interface AdminLayoutClientProps {
  userEmail?: string
  userName?: string
  userRole?: string
  children: React.ReactNode
}

export default function AdminLayoutClient({
  userEmail,
  userName,
  userRole = 'admin',
  children,
}: AdminLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Load sidebar collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('freshcart_admin_sidebar_collapsed')
      if (saved === 'true') {
        setIsCollapsed(true)
      }
    } catch {}
  }, [])

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('freshcart_admin_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Responsive & Collapsible Sidebar */}
      <AdminSidebar
        userEmail={userEmail}
        userName={userName}
        userRole={userRole}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile / Tablet Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-700 hover:text-emerald-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Open sidebar menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop Minimize Toggle Button in Header */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="hidden lg:flex p-2 rounded-xl text-gray-500 hover:text-emerald-700 hover:bg-gray-100 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 truncate">
              <span className="font-bold text-gray-900 truncate">FreshCart Ops</span>
              <span>/</span>
              <span className="text-emerald-700 font-semibold truncate hidden sm:inline">Administration Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Storefront Link */}
            <Link
              href="/"
              className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-emerald-700 bg-gray-100 hover:bg-gray-200/70 px-3 py-1.5 rounded-xl transition-colors"
            >
              <span>Storefront</span>
              <span className="text-[10px]">↗</span>
            </Link>

            {/* Live Connected Status Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-50 text-emerald-800 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-full border border-emerald-200 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">Operations Live & Connected</span>
              <span className="sm:hidden">Live</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content with Responsive Padding */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
