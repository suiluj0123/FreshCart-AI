'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/auth/client'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const redirectTo = searchParams.get('redirectTo') || '/'

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(redirectTo)
      }
    }
    checkSession()
  }, [router, redirectTo, supabase.auth])

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

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
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName, 
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else {
        setSuccess(true)

        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 1500)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            href={`/login${searchParams.toString() ? '?' + searchParams.toString() : ''}`}
            className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
          <form className="space-y-5" onSubmit={handleRegister}>
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800">
                <div className="flex">
                  <div className="text-sm font-medium text-red-800 dark:text-red-300">{error}</div>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/30 p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="flex">
                  <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    Registration successful! Check your email to confirm your account...
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-650 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-emerald-550 focus:border-emerald-550 dark:bg-gray-700 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-650 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-emerald-550 focus:border-emerald-550 dark:bg-gray-700 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-650 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-550 focus:border-emerald-550 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be at least 8 characters with 1 capital letter, 1 number, and 1 special character.
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-650 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-550 focus:border-emerald-550 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-600 dark:text-gray-400">Loading form...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
