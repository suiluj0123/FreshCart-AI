'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/auth/client'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
  unit: string
}

function getStorageKey(userId?: string | null): string {
  return userId ? `freshcart_cart_${userId}` : 'freshcart_cart_guest'
}

function loadCart(key: string): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

function saveCart(key: string, items: CartItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(items))
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  // Track active logged-in user to scope cart per user account
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      const currentId = user?.id ?? null
      setUserId(currentId)
      setItems(loadCart(getStorageKey(currentId)))
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentId = session?.user?.id ?? null
      setUserId(currentId)
      setItems(loadCart(getStorageKey(currentId)))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const storageKey = getStorageKey(userId)

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      const next = existing
        ? prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i))
        : [...prev, { ...item, quantity }]
      saveCart(storageKey, next)
      return next
    })
  }, [storageKey])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      saveCart(storageKey, next)
      return next
    })
  }, [storageKey])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id)
        saveCart(storageKey, next)
        return next
      })
    } else {
      setItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, quantity } : i))
        saveCart(storageKey, next)
        return next
      })
    }
  }, [storageKey])

  const clearCart = useCallback(() => {
    setItems([])
    saveCart(storageKey, [])
  }, [storageKey])

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return { items, addItem, removeItem, updateQuantity, clearCart, cartCount, cartTotal }
}