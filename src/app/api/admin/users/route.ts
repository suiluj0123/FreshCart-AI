import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAllLockedUsers } from '@/lib/auth/rate-limiter'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const roleFilter = searchParams.get('role') || 'all'
    const statusFilter = searchParams.get('status') || 'all' // 'all', 'active', 'inactive', 'locked'
    const search = (searchParams.get('search') || '').toLowerCase().trim()

    const supabase = getAdminClient()

    // 1. Fetch all users from User table
    const { data: rawUsers, error: userErr } = await supabase
      .from('User')
      .select('id, authId, name, email, role, phone, address, zip, createdAt')
      .order('createdAt', { ascending: false })

    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 })
    }

    const users = rawUsers ?? []

    // 2. Fetch all orders to compute customer spend and order count
    const { data: rawOrders } = await supabase
      .from('Order')
      .select('id, userId, total, status, createdAt')

    const orders = rawOrders ?? []

    const orderStatsByUser: Record<string, { count: number; totalSpent: number; lastOrderDate: string | null }> = {}
    for (const ord of orders) {
      const uId = ord.userId
      if (!uId) continue
      if (!orderStatsByUser[uId]) {
        orderStatsByUser[uId] = { count: 0, totalSpent: 0, lastOrderDate: null }
      }
      orderStatsByUser[uId].count++
      if (ord.status !== 'cancelled') {
        orderStatsByUser[uId].totalSpent += Number(ord.total) || 0
      }
      if (!orderStatsByUser[uId].lastOrderDate || new Date(ord.createdAt) > new Date(orderStatsByUser[uId].lastOrderDate!)) {
        orderStatsByUser[uId].lastOrderDate = ord.createdAt
      }
    }

    // 3. Fetch UserLoginLog to compute real-time Active (Online) vs Inactive (Offline) status & Lockouts
    const authActivityByEmail: Record<
      string,
      {
        userName: string
        lastLoginAt: string | null
        lastLogoutAt: string | null
        lastDevice: string
        lastIpAddress: string
        isOnline: boolean
        isLocked: boolean
        lockTime: number | null
        failedAttempts: number
      }
    > = {}

    try {
      const { data: loginLogs } = await supabase
        .from('UserLoginLog')
        .select('*')
        .order('createdAt', { ascending: true })

      if (loginLogs && loginLogs.length > 0) {
        for (const log of loginLogs) {
          const emailKey = log.userEmail?.toLowerCase()?.trim()
          if (!emailKey) continue
          if (!authActivityByEmail[emailKey]) {
            authActivityByEmail[emailKey] = {
              userName: log.userName || emailKey.split('@')[0],
              lastLoginAt: null,
              lastLogoutAt: null,
              lastDevice: log.device || 'Web Client',
              lastIpAddress: log.ipAddress || '120.29.114.82 (Philippines)',
              isOnline: false,
              isLocked: false,
              lockTime: null,
              failedAttempts: 0,
            }
          }

          if (log.eventType === 'Successful Login' || log.eventType === 'User Registration' || log.eventType.includes('Session')) {
            authActivityByEmail[emailKey].lastLoginAt = log.createdAt
            authActivityByEmail[emailKey].lastDevice = log.device
            authActivityByEmail[emailKey].lastIpAddress = log.ipAddress
            authActivityByEmail[emailKey].isOnline = true
            authActivityByEmail[emailKey].isLocked = false
            authActivityByEmail[emailKey].lockTime = null
            authActivityByEmail[emailKey].failedAttempts = 0
          } else if (log.eventType === 'User Logout') {
            authActivityByEmail[emailKey].lastLogoutAt = log.createdAt
            authActivityByEmail[emailKey].isOnline = false
          } else if (log.eventType === 'Account Locked (4 Failed Attempts)' || log.eventType.includes('Account Locked')) {
            authActivityByEmail[emailKey].isLocked = true
            authActivityByEmail[emailKey].lockTime = new Date(log.createdAt).getTime()
            authActivityByEmail[emailKey].isOnline = false
            authActivityByEmail[emailKey].failedAttempts = 4
          } else if (log.eventType === 'Account Unlocked by Administrator' || log.eventType === 'USER_ACCOUNT_UNLOCKED') {
            authActivityByEmail[emailKey].isLocked = false
            authActivityByEmail[emailKey].lockTime = null
            authActivityByEmail[emailKey].failedAttempts = 0
          } else if (log.eventType === 'Failed Login Attempt') {
            authActivityByEmail[emailKey].failedAttempts += 1
          }
        }
      }
    } catch {
      // Fallback
    }

    // 4. Fetch In-Memory Rate Limiting Lockouts
    const memoryLockedUsers = getAllLockedUsers()

    // 5. Build Enriched Users List (from User table)
    const now = Date.now()
    const LOCKOUT_DURATION_MS = 10 * 60 * 1000

    const enrichedUsers = users.map((u) => {
      const emailKey = u.email?.toLowerCase()?.trim()
      const stats = orderStatsByUser[u.id] || (u.authId ? orderStatsByUser[u.authId] : null) || {
        count: 0,
        totalSpent: 0,
        lastOrderDate: null,
      }
      const auth = authActivityByEmail[emailKey] || {
        userName: u.name,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastDevice: 'Web Client',
        lastIpAddress: '120.29.114.82 (Philippines)',
        isOnline: false,
        isLocked: false,
        lockTime: null,
        failedAttempts: 0,
      }

      // Check memory lockout or DB lockout
      const memoryLock = memoryLockedUsers[emailKey]
      let isLocked = false
      let remainingSec = 0
      let failedAttempts = auth.failedAttempts

      if (memoryLock && memoryLock.remainingSeconds > 0) {
        isLocked = true
        remainingSec = memoryLock.remainingSeconds
        failedAttempts = memoryLock.failedAttempts
      } else if (auth.isLocked && auth.lockTime) {
        const elapsed = now - auth.lockTime
        if (elapsed < LOCKOUT_DURATION_MS) {
          isLocked = true
          remainingSec = Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 1000)
        }
      }

      const isOnline = isLocked ? false : auth.isOnline

      return {
        ...u,
        ordersCount: stats.count,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate,
        lastLoginAt: auth.lastLoginAt,
        lastLogoutAt: auth.lastLogoutAt,
        lastDevice: auth.lastDevice,
        lastIpAddress: auth.lastIpAddress,
        isOnline,
        isLocked,
        lockoutRemainingSeconds: remainingSec,
        failedAttempts,
        statusLabel: isLocked ? 'locked' : isOnline ? 'active' : 'inactive',
      }
    })

    // Also include any locked accounts from UserLoginLog that aren't yet in User table
    for (const [emailKey, auth] of Object.entries(authActivityByEmail)) {
      const exists = enrichedUsers.some((u) => u.email?.toLowerCase()?.trim() === emailKey)
      if (!exists && auth.isLocked && auth.lockTime && now - auth.lockTime < LOCKOUT_DURATION_MS) {
        const remainingSec = Math.ceil((LOCKOUT_DURATION_MS - (now - auth.lockTime)) / 1000)
        enrichedUsers.push({
          id: `virtual_${emailKey}`,
          authId: null,
          name: auth.userName || emailKey.split('@')[0],
          email: emailKey,
          role: 'customer',
          phone: null,
          address: null,
          zip: null,
          createdAt: new Date(auth.lockTime).toISOString(),
          ordersCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          lastLoginAt: auth.lastLoginAt,
          lastLogoutAt: auth.lastLogoutAt,
          lastDevice: auth.lastDevice,
          lastIpAddress: auth.lastIpAddress,
          isOnline: false,
          isLocked: true,
          lockoutRemainingSeconds: remainingSec,
          failedAttempts: auth.failedAttempts || 4,
          statusLabel: 'locked',
        })
      }
    }

    // Filter by role, status & search query
    const filteredUsers = enrichedUsers.filter((u) => {
      const matchesRole =
        roleFilter === 'all'
          ? true
          : roleFilter === 'staff'
          ? u.role === 'admin' || u.role === 'system_admin' || u.role === 'staff'
          : u.role === roleFilter

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'locked'
          ? u.isLocked
          : statusFilter === 'active'
          ? u.isOnline
          : !u.isOnline && !u.isLocked

      const matchesSearch =
        search === '' ||
        (u.name && u.name.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.phone && u.phone.toLowerCase().includes(search)) ||
        (u.address && u.address.toLowerCase().includes(search))

      return matchesRole && matchesStatus && matchesSearch
    })

    // Compute Summary KPIs
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const thisMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)

    const summary = {
      totalUsers: enrichedUsers.length,
      activeOnline: enrichedUsers.filter((u) => u.isOnline && !u.isLocked).length,
      inactiveOffline: enrichedUsers.filter((u) => !u.isOnline && !u.isLocked).length,
      lockedCount: enrichedUsers.filter((u) => u.isLocked).length,
      customersCount: enrichedUsers.filter((u) => u.role === 'customer' || !u.role).length,
      staffCount: enrichedUsers.filter((u) => u.role === 'admin' || u.role === 'system_admin' || u.role === 'staff').length,
      createdToday: enrichedUsers.filter((u) => new Date(u.createdAt) >= todayStart).length,
      newThisMonth: enrichedUsers.filter((u) => new Date(u.createdAt) >= thisMonthStart).length,
      activeBuyers: enrichedUsers.filter((u) => u.ordersCount > 0).length,
    }

    return NextResponse.json({
      success: true,
      summary,
      users: filteredUsers,
    })
  } catch (err: any) {
    console.error('[API /api/admin/users GET] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
