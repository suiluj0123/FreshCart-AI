'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import Button from '@/components/ui/Button'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register' | 'forgot'
}

type ModalMode = 'login' | 'register' | 'forgot'

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

  // Rate Limiting & Lockout State (4 attempts -> 10 mins lockout)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)

  // Lockout Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isLocked && lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            setIsLocked(false)
            setRemainingAttempts(4)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isLocked, lockoutRemaining])

  // Check Rate Limit when email changes or modal opens
  const checkRateLimit = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return
    try {
      const res = await fetch(`/api/auth/rate-limit?email=${encodeURIComponent(emailToCheck.trim())}`)
      const json = await res.json()
      if (json.isLocked) {
        setIsLocked(true)
        setLockoutRemaining(json.remainingSeconds || 600)
      } else {
        setIsLocked(false)
        setRemainingAttempts(json.remainingAttempts ?? 4)
      }
    } catch {}
  }

  useEffect(() => {
    if (isOpen && email) {
      checkRateLimit(email)
    }
  }, [isOpen, email])

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

  const formatLockoutTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`
  }

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isLocked) {
      setError(`Account temporarily locked. Please try again in ${formatLockoutTime(lockoutRemaining)} or reset your password.`)
      return
    }

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
        // Record failed attempt in rate limiter API
        let lockedNow = false
        let remTime = 0
        let remAttempts = 3

        try {
          const rateRes = await fetch('/api/auth/rate-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'failed', email: cleanEmail }),
          })
          const rateJson = await rateRes.json()
          lockedNow = rateJson.isLocked
          remTime = rateJson.remainingSeconds || 600
          remAttempts = rateJson.remainingAttempts ?? 0

          if (lockedNow) {
            setIsLocked(true)
            setLockoutRemaining(remTime)
          } else {
            setRemainingAttempts(remAttempts)
          }
        } catch {}

        // Record failed attempt in audit log
        fetch('/api/auth/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            eventType: lockedNow ? 'Account Locked (4 Failed Attempts)' : 'Failed Login Attempt',
            status: lockedNow ? 'danger' : 'warning',
            notes: err.message,
          }),
        }).catch(() => {})

        if (lockedNow) {
          setError(`Account locked due to 4 consecutive failed attempts. Please try again in ${formatLockoutTime(remTime)} or reset your password.`)
        } else if (err.message.toLowerCase().includes('invalid login credentials')) {
          setError(`Incorrect email or password. ${remAttempts} attempt${remAttempts === 1 ? '' : 's'} remaining before 10-minute lockout.`)
        } else if (err.message.toLowerCase().includes('email not confirmed')) {
          setError('Please confirm your email address via the link sent to your inbox.')
        } else {
          setError(err.message)
        }
        return
      }

      // Reset rate limit on success
      fetch('/api/auth/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'success', email: cleanEmail }),
      }).catch(() => {})

      // Determine user role
      let userRole = 'customer'
      if (authData?.user) {
        const { data: profile } = await supabase
          .from('User')
          .select('role')
          .or(`authId.eq.${authData.user.id},email.eq.${cleanEmail}`)
          .maybeSingle()

        userRole = profile?.role || (authData.user.user_metadata?.role as string) || 'customer'
      }

      // Record successful login in audit log
      fetch('/api/auth/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          eventType: 'Successful Login',
          status: 'success',
          role: userRole,
        }),
      }).catch(() => {})

      if (userRole === 'admin' || userRole === 'system_admin') {
        onClose()
        window.location.href = '/admin'
        return
      }

      router.refresh()
      onClose()
    } catch {
      setError('An unexpected error occurred during sign in.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Register
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

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            role: 'customer',
          },
        },
      })

      if (err) {
        setError(err.message)
        return
      }

      if (data.user) {
        try {
          await supabase.from('User').insert({
            id: data.user.id,
            authId: data.user.id,
            email: cleanEmail,
            name: cleanName,
            role: 'customer',
          })
        } catch {}

        fetch('/api/auth/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            userName: cleanName,
            eventType: 'User Registration',
            status: 'success',
            role: 'customer',
          }),
        }).catch(() => {})
      }

      setSuccess('Account created successfully! Check your inbox for confirmation.')
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 1500)
    } catch {
      setError('Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Please enter your registered email address.')
      return
    }
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      })

      if (resetErr) {
        setError(resetErr.message)
        return
      }

      // Log forgot password request
      fetch('/api/auth/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          eventType: 'Password Reset Requested',
          status: 'info',
        }),
      }).catch(() => {})

      setSuccess('Password reset link sent! Please check your email inbox and follow the instructions.')
    } catch {
      setError('Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (err) setError(err.message)
    } catch {
      setError('Google Sign-In failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* ── Scrim / Backdrop ── */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide-Over Right Panel ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: '#ffffff' }}
        className="fixed right-0 top-0 bottom-0 z-[9999] flex h-screen w-full max-w-md flex-col bg-white shadow-2xl border-l border-gray-100 animate-slideLeft"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white">
          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`text-sm font-black transition-colors cursor-pointer ${
                  mode === 'login' ? 'text-gray-900 border-b-2 border-emerald-600 pb-1' : 'text-gray-400 hover:text-gray-700 pb-1'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`text-sm font-black transition-colors cursor-pointer ${
                  mode === 'register' ? 'text-gray-900 border-b-2 border-emerald-600 pb-1' : 'text-gray-400 hover:text-gray-700 pb-1'
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              ← Back to Sign In
            </button>
          )}

          {/* Close Icon */}
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-7 bg-white" style={{ backgroundColor: '#ffffff' }}>
          {/* Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Join FreshCart'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {mode === 'login' && 'Sign in to access your orders, grocery cart, and saved details'}
              {mode === 'register' && 'Fast grocery delivery, fresh produce & member discounts'}
              {mode === 'forgot' && 'Enter your email to receive a secure password reset link'}
            </p>
          </div>

          {/* LOCKOUT WARNING BANNER */}
          {isLocked && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-bold space-y-1 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-red-700 font-black">
                  🔒 Account Locked (4 Failed Attempts)
                </span>
                <span className="font-mono text-[11px] bg-red-200/80 px-2 py-0.5 rounded-md">
                  {formatLockoutTime(lockoutRemaining)}
                </span>
              </div>
              <p className="text-[11px] text-red-700 font-normal">
                For security, login is locked for 10 minutes. You can also use the{' '}
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="underline font-bold text-red-900 hover:text-red-950 cursor-pointer"
                >
                  Forgot Password
                </button>{' '}
                option.
              </p>
            </div>
          )}

          {/* FEEDBACK BANNERS */}
          {error && !isLocked && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-fadeIn">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-fadeIn">
              {success}
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
              >
                {loading ? 'Sending Reset Link...' : 'Send Reset Link ➔'}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* LOGIN / REGISTER FORM */}
          {mode !== 'forgot' && (
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || isLocked}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs disabled:opacity-50"
              >
                {loading ? (mode === 'login' ? 'Signing in...' : 'Creating Account...') : isLocked ? `Locked (${formatLockoutTime(lockoutRemaining)})` : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          )}

          {/* ── Social / Alternative Auth ── */}
          {mode !== 'forgot' && (
            <div className="mt-6 space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-gray-200 w-full" />
                <span className="bg-white px-3 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Or continue with
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Connecting...' : 'Google Account'}</span>
              </button>

              {/* Mode Switcher */}
              <div className="text-center pt-2 text-xs text-gray-500">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
