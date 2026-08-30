import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

// In-memory fallback for recent logs in case DB table is being created
const memoryAuditLogs: any[] = []

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventType = 'Successful Login', email, status = 'success', userName, role, notes, device: customDevice } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1 (Localhost)'

    const userAgent = req.headers.get('user-agent') || ''
    let parsedDevice = customDevice || 'Desktop Web'
    if (!customDevice) {
      if (/iphone|ipad|ipod/i.test(userAgent)) parsedDevice = 'iPhone (iOS Safari)'
      else if (/android/i.test(userAgent)) parsedDevice = 'Android (Mobile Chrome)'
      else if (/macintosh|mac os x/i.test(userAgent)) parsedDevice = 'Mac (Desktop Safari/Chrome)'
      else if (/windows/i.test(userAgent)) parsedDevice = 'Windows (Desktop Chrome/Edge)'
      else if (/linux/i.test(userAgent)) parsedDevice = 'Linux (Desktop)'
    }

    const supabase = getAdminClient()

    // 1. Fetch user profile if exists
    let resolvedName = userName || 'User'
    let resolvedRole = role || 'customer'
    let resolvedUserId: string | null = null

    try {
      const { data: userProfile } = await supabase
        .from('User')
        .select('id, name, role')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle()

      if (userProfile) {
        resolvedUserId = userProfile.id
        if (userProfile.name) resolvedName = userProfile.name
        if (userProfile.role) resolvedRole = userProfile.role
      }
    } catch {
      // Ignore user lookup error
    }

    const newLog = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
      userId: resolvedUserId,
      userEmail: email.trim().toLowerCase(),
      userName: resolvedName,
      role: resolvedRole,
      eventType,
      status, // 'success' | 'warning' | 'danger'
      ipAddress: clientIp,
      device: parsedDevice,
      metadata: notes ? { notes } : {},
      createdAt: new Date().toISOString(),
    }

    // 2. Try inserting into Supabase UserLoginLog table
    try {
      const { error: insertErr } = await supabase.from('UserLoginLog').insert(newLog)
      if (insertErr) {
        console.warn('[UserLoginLog DB Warning]:', insertErr.message)
      }
    } catch (e: any) {
      console.warn('[UserLoginLog Catch]:', e?.message)
    }

    // Keep recent in-memory log
    memoryAuditLogs.unshift(newLog)
    if (memoryAuditLogs.length > 50) memoryAuditLogs.pop()

    return NextResponse.json({ success: true, log: newLog })
  } catch (err: any) {
    console.error('[API /api/auth/log-event] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    recentLogs: memoryAuditLogs,
  })
}
