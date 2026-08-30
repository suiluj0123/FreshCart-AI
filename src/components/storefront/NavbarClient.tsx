'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useCartContext } from '@/components/storefront/CartProvider'
import { createClient } from '@/lib/auth/client'
import LoginModal from '@/components/storefront/LoginModal'

interface UserNavData {
  id: string
  email: string
  name?: string
  role?: string
}

interface NavbarClientProps {
  user?: UserNavData | null
  initialUser?: UserNavData | null
  initialActiveOrderId?: string | null
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/meal-kits', label: 'Meal Kits' },
  { href: '/meal-planner', label: 'Meal Planner' },
  { href: '/#how-it-works', label: 'How it Works' },
]

export default function NavbarClient({ user, initialUser, initialActiveOrderId }: NavbarClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { cartCount } = useCartContext()

  const resolvedInitial = initialUser ?? user ?? null
  const [currentUser, setCurrentUser] = useState<UserNavData | null>(resolvedInitial)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(initialActiveOrderId ?? null)
  const [activeOrderStatus, setActiveOrderStatus] = useState<string>('placed')
  const [activeOrderType, setActiveOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register'>('login')

  const userEmail = initialUser?.email ?? null

  useEffect(() => {
    let isMounted = true

    const checkActiveOrder = async () => {
      if (typeof window !== 'undefined') {
        const storedId = localStorage.getItem('freshcart_active_order')
        const targetId = storedId || initialActiveOrderId

        if (targetId) {
          try {
            const res = await fetch(`/api/orders/${targetId}`)
            const data = await res.json()
            const ord = data.success ? data.order : null

            if (isMounted) {
              if (!ord || ord.status === 'completed' || ord.status === 'cancelled') {
                localStorage.removeItem('freshcart_active_order')
                setActiveOrderId(null)
              } else {
                setActiveOrderId(targetId)
                setActiveOrderStatus(ord.status || 'placed')
                setActiveOrderType(ord.fulfillmentType || 'delivery')
              }
            }
          } catch {
            if (isMounted) setActiveOrderId(targetId)
          }
        } else if (isMounted) {
          setActiveOrderId(null)
        }
      }
    }

    checkActiveOrder()
    const pollInterval = setInterval(checkActiveOrder, 5000)

    window.addEventListener('storage', checkActiveOrder)
    window.addEventListener('active_order_updated', checkActiveOrder)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
      window.removeEventListener('storage', checkActiveOrder)
      window.removeEventListener('active_order_updated', checkActiveOrder)
    }
  }, [initialActiveOrderId, userEmail])

  useEffect(() => {
    setCurrentUser(resolvedInitial)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('User')
          .select('name, email, role')
          .or(`authId.eq.${session.user.id},email.eq.${session.user.email}`)
          .maybeSingle()

        setCurrentUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
          role: profile?.role || (session.user.user_metadata?.role as string) || 'customer',
        })
      } else {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialUser, supabase])

  const handleSignOut = async () => {
    if (currentUser?.email) {
      fetch('/api/auth/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          eventType: 'User Logout',
          status: 'success',
          userName: currentUser.name,
          role: currentUser.role,
        }),
      }).catch(() => {})
    }
    await supabase.auth.signOut()
    setCurrentUser(null)
    setMenuOpen(false)
    setMobileDrawerOpen(false)
    router.push('/')
    router.refresh()
  }

  const getPillBadge = () => {
    if (activeOrderStatus === 'out_for_delivery') {
      return {
        text: '🚚 Out for Delivery',
        bg: 'bg-amber-50 text-amber-900 border-amber-300',
        dot: 'bg-amber-500',
        ping: 'bg-amber-400',
      }
    }
    if (activeOrderStatus === 'ready_pickup') {
      return {
        text: '🏪 Ready for Pickup',
        bg: 'bg-amber-50 text-amber-900 border-amber-300',
        dot: 'bg-amber-500',
        ping: 'bg-amber-400',
      }
    }
    if (activeOrderStatus === 'packed') {
      return {
        text: '📦 Items Packed',
        bg: 'bg-purple-50 text-purple-900 border-purple-200',
        dot: 'bg-purple-500',
        ping: 'bg-purple-400',
      }
    }
    return {
      text: '🛒 Order Placed',
      bg: 'bg-blue-50 text-blue-900 border-blue-200',
      dot: 'bg-blue-500',
      ping: 'bg-blue-400',
    }
  }

  const pill = getPillBadge()

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-xs">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          
          {/* LEFT: Hamburger Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            {/* Hamburger / Sidebar Toggle Button (Visible on Mobile & Tablet < lg) */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-xl text-gray-700 hover:text-emerald-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm transition-transform group-hover:scale-105">
                <svg
                  className="h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight">
                <span className="text-gray-900">FreshCart</span>
                <span className="text-emerald-600"> AI</span>
              </span>
            </Link>

            {/* Desktop Navigation Links (Visible on Large Screens >= lg) */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`rounded-xl px-3 py-2 transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-700'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* RIGHT: Actions & User Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dynamic Live Status Tracker Pill */}
            {activeOrderId && (
              <Link
                href={`/orders/${activeOrderId}`}
                className={`relative hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-all border shadow-xs hover:scale-105 ${pill.bg}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pill.ping}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${pill.dot}`}></span>
                </span>
                <span>{pill.text}</span>
              </Link>
            )}

            {/* Cart Link */}
            <Link
              href="/cart"
              className="relative flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden md:inline font-semibold">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white ring-2 ring-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Admin Quick Link (Desktop) */}
            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'system_admin' || currentUser.role === 'systemadmin') && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 hover:bg-gray-800 shadow-xs transition-all"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Admin Console</span>
              </Link>
            )}

            {/* Auth Menu / User Profile */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-xl p-1 sm:px-2.5 sm:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shadow-xs">
                    {currentUser.name?.charAt(0).toUpperCase() || currentUser.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden xl:inline text-gray-700 text-xs">
                    Hi, <span className="font-bold text-gray-900">{currentUser.name?.split(' ')[0] || 'there'}</span>
                  </span>
                  <svg className="h-4 w-4 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-2xl border border-gray-100 z-20 space-y-1">
                      <div className="px-3 py-2 border-b border-gray-100 mb-1 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">{currentUser.name || 'User'}</p>
                          <p className="text-[11px] text-gray-400 truncate">{currentUser.email}</p>
                        </div>
                        {(currentUser.role === 'system_admin' || currentUser.role === 'systemadmin') ? (
                          <span className="ml-2 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                            SysAdmin
                          </span>
                        ) : currentUser.role === 'admin' ? (
                          <span className="ml-2 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            Admin
                          </span>
                        ) : null}
                      </div>

                      {(currentUser.role === 'admin' || currentUser.role === 'system_admin' || currentUser.role === 'systemadmin') && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200/80"
                        >
                          <span>⚡ Admin Dashboard</span>
                          <span className="text-[11px] text-emerald-600">→</span>
                        </Link>
                      )}

                      <Link
                        href="/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
                      >
                        👤 Customer Profile
                      </Link>

                      <Link
                        href="/account/orders"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
                      >
                        📜 My Order History
                      </Link>

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginModalMode('login')
                    setLoginModalOpen(true)
                  }}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginModalMode('register')
                    setLoginModalOpen(true)
                  }}
                  className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE MOBILE & TABLET FULL-HEIGHT SLIDE-OVER SIDEBAR DRAWER ── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Full-Height Drawer Panel */}
          <div className="fixed top-0 bottom-0 left-0 z-10 w-[85vw] max-w-xs bg-white shadow-2xl flex flex-col h-[100dvh] overflow-hidden transform transition-transform duration-300 ease-in-out border-r border-gray-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <Link
                href="/"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-sm shrink-0">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <span className="font-extrabold text-gray-900 text-lg tracking-tight">
                  FreshCart <span className="text-emerald-600">AI</span>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close navigation"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Active Order Banner in Drawer (If Any) */}
            {activeOrderId && (
              <div className="p-3 bg-amber-50 border-b border-amber-100 shrink-0">
                <Link
                  href={`/orders/${activeOrderId}`}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between text-xs font-bold text-amber-900"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                    {pill.text}
                  </span>
                  <span className="text-[11px] text-amber-700 font-bold underline">Track ➔</span>
                </Link>
              </div>
            )}

            {/* Navigation Tabs List (Scrollable Area) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-white">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 py-1 mb-1">
                Storefront Navigation
              </p>

              {NAV_LINKS.map(({ href, label }) => {
                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-emerald-700'
                    }`}
                  >
                    <span>{label}</span>
                    {isActive && <span className="h-2 w-2 rounded-full bg-emerald-600"></span>}
                  </Link>
                )
              })}

              <div className="pt-3 border-t border-gray-100 my-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 py-1 mb-1">
                  Customer Shortcuts
                </p>
                <Link
                  href="/cart"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <span>Shopping Cart</span>
                  {cartCount > 0 && (
                    <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {cartCount} {cartCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </Link>
                <Link
                  href="/account/orders"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <span>Order History</span>
                </Link>
              </div>

              {/* Admin Shortcuts in Drawer (If Admin/Staff) */}
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'system_admin' || currentUser.role === 'systemadmin') && (
                <div className="pt-3">
                  <Link
                    href="/admin"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between rounded-xl bg-gray-900 text-emerald-400 p-3.5 text-xs font-black shadow-sm hover:bg-gray-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Admin Operations Console
                    </span>
                    <span>➔</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer Footer: User Profile or Sign In (Fixed at bottom) */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              {currentUser ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-base shadow-sm shrink-0">
                      {currentUser.name?.charAt(0).toUpperCase() || currentUser.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{currentUser.name || 'User'}</p>
                      <p className="text-[11px] text-gray-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/account"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex-1 text-center py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex-1 text-center py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false)
                      setLoginModalMode('login')
                      setLoginModalOpen(true)
                    }}
                    className="w-full py-2.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false)
                      setLoginModalMode('register')
                      setLoginModalOpen(true)
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Right-Side Slide-Over Login / Register Drawer Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        initialMode={loginModalMode}
      />
    </header>
  )
}