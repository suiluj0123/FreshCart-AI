'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import Button from '@/components/ui/Button'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

type ModalMode = 'login' | 'register'

export default function LoginModal({ isOpen, onClose, initialMode = 'login' }: LoginModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const panelRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<ModalMode>(initialMode)

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
    }
  }, [isOpen, initialMode])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setName('')
    setError(null)
    setSuccess(null)
  }

  const switchMode = (next: ModalMode) => {
    resetForm()
    setMode(next)
  }

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  }

  const validatePasswordStrength = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long.'
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase capital letter.'
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number.'
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)) {
      return 'Password must contain at least one special character (e.g. !@#$%^&*).'
    }
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Email address is required.')
      return
    }
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }

    setLoading(true)
    try {
      const { data: authData, error: err } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (err) {
        if (err.message.toLowerCase().includes('invalid login credentials')) {
          setError('Incorrect email or password. Please verify your credentials.')
        } else if (err.message.toLowerCase().includes('email not confirmed')) {
          setError('Please confirm your email address via the link sent to your inbox.')
        } else {
          setError(err.message)
        }
        return
      }

      // Role-based automatic redirection: Admins go straight to /admin
      if (authData?.user) {
        const { data: profile } = await supabase
          .from('User')
          .select('role')
          .or(`authId.eq.${authData.user.id},email.eq.${cleanEmail}`)
          .maybeSingle()

        const userRole = profile?.role || (authData.user.user_metadata?.role as string) || 'customer'

        if (userRole === 'admin') {
          onClose()
          window.location.href = '/admin'
          return
        }
      }

      router.refresh()
      onClose()
    } catch {
      setError('An unexpected error occurred during sign in.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanName = name.trim()
    const cleanEmail = email.trim()

    if (!cleanName) {
      setError('Full Name is required.')
      return
    }
    if (!cleanEmail) {
      setError('Email address is required.')
      return
    }
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }

    const passwordError = validatePasswordStrength(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (!confirmPassword) {
      setError('Please confirm your password.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-type your confirm password.')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { name: cleanName } },
      })

      if (err) {
        setError(err.message)
        return
      }

      setSuccess('Account created successfully!')
      setMode('login')
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred during account creation.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      })
      if (err) {
        setError(err.message)
      }
    } catch {
      setError('Failed to initialize Google Sign In.')
    } finally {
      setGoogleLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Scrim / Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Right Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: '#ffffff' }}
        className="fixed right-0 top-0 bottom-0 z-[9999] flex h-screen w-full max-w-md flex-col bg-white shadow-2xl border-l border-gray-100"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            {/* Logo icon box */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
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
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-7 bg-white" style={{ backgroundColor: '#ffffff' }}>
          {/* Title */}
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'login'
                ? 'Sign in to access your meal plans and orders.'
                : 'Join FreshCart AI for AI-powered grocery shopping.'}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
            {(['login', 'register'] as ModalMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={"flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors " +
                  (mode === m ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700')}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {/* Full Name (Register mode only, NO placeholder) */}
            {mode === 'register' && (
              <div>
                <label htmlFor="modal-name" className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            )}

            {/* Email Address (NO placeholder) */}
            <div>
              <label htmlFor="modal-email" className="block text-sm font-semibold text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="modal-password" className="block text-sm font-semibold text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                {mode === 'login' && (
                  <Link href="/forgot-password" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="modal-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 pr-16 text-sm placeholder-gray-400 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Password requirement hint in register mode */}
              {mode === 'register' && (
                <p className="mt-1.5 text-xs text-gray-500 leading-normal">
                  Must be at least 8 characters with 1 capital letter, 1 number, and 1 special character.
                </p>
              )}
            </div>

            {/* Confirm Password (Register mode only) */}
            {mode === 'register' && (
              <div>
                <label htmlFor="modal-confirm-password" className="block text-sm font-semibold text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="modal-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 pr-16 text-sm placeholder-gray-400 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full rounded-xl mt-2 font-bold shadow-md">
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          {/* ── Divider ── */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs uppercase tracking-wider text-gray-400">or</span>
            </div>
          </div>

          {/* ── Interactive Google Sign-In Button ── */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {/* Google 'G' logo SVG */}
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>{googleLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Continue as Guest &rarr;
          </button>
        </div>
      </div>
    </>
  )
}
