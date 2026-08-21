'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OrderAutoPoller({ status }: { status: string }) {
  const router = useRouter()

  useEffect(() => {
    if (status === 'completed') return

    const interval = setInterval(() => {
      router.refresh()
    }, 4000)

    return () => clearInterval(interval)
  }, [status, router])

  return null
}