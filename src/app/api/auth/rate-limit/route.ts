import { NextRequest, NextResponse } from 'next/server'
import { checkLoginLockout, recordFailedLogin, resetLoginLockout } from '@/lib/auth/rate-limiter'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email') || ''
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'

  const status = checkLoginLockout(email, clientIp)
  return NextResponse.json({ success: true, ...status })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, email } = body
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'

    if (action === 'failed') {
      const status = recordFailedLogin(email, clientIp)
      return NextResponse.json({ success: true, ...status })
    } else if (action === 'success') {
      resetLoginLockout(email, clientIp)
      return NextResponse.json({ success: true, isLocked: false })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
