'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export default function NavbarClient({ user, initialUser, initialActiveOrderId }: NavbarClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { cartCount } = useCartContext()

  const resolvedInitial = initialUser ?? user ?? null
  const [currentUser, setCurrentUser] = useState<UserNavData | null>(resolvedInitial)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(initialActiveOrderId ?? null)
  const [activeOrderStatus, setActiveOrderStatus] = useState<string>('placed')
  const [activeOrderType, setActiveOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
          } catch (e) {
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
          .select('name, email')
          .eq('authId', session.user.id)
          .maybeSingle()

        setCurrentUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
          role: session.user.user_metadata?.role ?? 'customer',
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
    await supabase.auth.signOut()
    setCurrentUser(null)
    setMenuOpen(false)
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
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

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1 text-sm font-medium">
              {[
                { href: '/', label: 'Home' },
                { href: '/products', label: 'Shop' },
                { href: '/meal-kits', label: 'Meal Kits' },
                { href: '/meal-planner', label: 'Meal Planner' },
                { href: '/#how-it-works', label: 'How it Works' },
              ].map(({ href, label }) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Dynamic Live Status Tracker Pill */}
            {activeOrderId && (
              <Link
                href={`/orders/${activeOrderId}`}
                className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-all border shadow-sm hover:scale-105 ${pill.bg}`}
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
              className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white ring-2 ring-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-gray-200" />

            {/* Auth */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shadow-sm">
                    {currentUser.name?.charAt(0).toUpperCase() || currentUser.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-gray-700">
                    Hi, <span className="font-semibold">{currentUser.name?.split(' ')[0] || 'there'}</span>!
                  </span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-gray-100 z-20 space-y-1">
                      <div className="px-3 py-2 border-b border-gray-100 mb-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{currentUser.name || 'Customer'}</p>
                        <p className="text-[11px] text-gray-400 truncate">{currentUser.email}</p>
                      </div>

                      <Link
                        href="/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        👤 Customer Profile
                      </Link>

                      <Link
                        href="/account/orders"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        📜 My Order History
                      </Link>

                      {currentUser.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          ⚡ Admin Dashboard
                        </Link>
                      )}

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginModalMode('login')
                    setLoginModalOpen(true)
                  }}
                  className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginModalMode('register')
                    setLoginModalOpen(true)
                  }}
                  className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Home
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Shop Groceries
            </Link>
            <Link
              href="/meal-kits"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Meal Kits
            </Link>
            <Link
              href="/meal-planner"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Meal Planner
            </Link>
            <Link
              href="/account/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Order History
            </Link>
          </div>
        )}
      </div>

      {/* Right-Side Slide-Over Login / Register Drawer Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        initialMode={loginModalMode}
      />
    </header>
  )
}