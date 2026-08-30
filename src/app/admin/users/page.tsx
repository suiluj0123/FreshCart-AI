'use client'

import React, { useState, useEffect } from 'react'

export type RoleFilter = 'all' | 'customer' | 'staff'
export type StatusFilter = 'all' | 'active' | 'inactive' | 'locked'

interface UserSummary {
  totalUsers: number
  activeOnline: number
  inactiveOffline: number
  lockedCount: number
  customersCount: number
  staffCount: number
  createdToday: number
  newThisMonth: number
  activeBuyers: number
}

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [summary, setSummary] = useState<UserSummary>({
    totalUsers: 0,
    activeOnline: 0,
    inactiveOffline: 0,
    lockedCount: 0,
    customersCount: 0,
    staffCount: 0,
    createdToday: 0,
    newThisMonth: 0,
    activeBuyers: 0,
  })

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)

  // Modals state
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: 'customer',
    address: '',
    zip: '',
  })
  const [savingUser, setSavingUser] = useState(false)

  const [deletingUser, setDeletingUser] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ESC key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingUser(null)
        setDeletingUser(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/admin/users?role=${roleFilter}&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`
      )
      const json = await res.json()
      if (json.success) {
        setUsers(json.users || [])
        setSummary(
          json.summary || {
            totalUsers: 0,
            activeOnline: 0,
            inactiveOffline: 0,
            lockedCount: 0,
            customersCount: 0,
            staffCount: 0,
            createdToday: 0,
            newThisMonth: 0,
            activeBuyers: 0,
          }
        )
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err)
      setError('Could not load user accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, statusFilter, searchQuery])

  // Unlock Rate-Limited User Action
  const handleUnlockUser = async (user: any) => {
    try {
      setUnlockingId(user.id)
      setError(null)
      const res = await fetch(`/api/admin/users/${user.id}/unlock`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to unlock user account')
      }

      setMessage(`Account for ${user.name || user.email} has been unlocked successfully!`)
      fetchUsers()
      setTimeout(() => setMessage(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Failed to unlock user.')
    } finally {
      setUnlockingId(null)
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (user: any) => {
    setEditingUser(user)
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      role: user.role || 'customer',
      address: user.address || '',
      zip: user.zip || '',
    })
    setMessage(null)
    setError(null)
  }

  // Save User Edit
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      setSavingUser(true)
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update user')
      }

      setMessage(`User "${editForm.name}" updated successfully!`)
      setEditingUser(null)
      fetchUsers()
      setTimeout(() => setMessage(null), 4000)
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes.')
    } finally {
      setSavingUser(false)
    }
  }

  // Delete User Action
  const handleConfirmDelete = async () => {
    if (!deletingUser) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete user')
      }

      setMessage(`User account "${deletingUser.name || deletingUser.email}" deleted.`)
      setDeletingUser(null)
      fetchUsers()
      setTimeout(() => setMessage(null), 4000)
    } catch (err: any) {
      setError(err?.message || 'Failed to delete user account.')
    } finally {
      setDeleting(false)
    }
  }

  // Format seconds into minutes & seconds
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s < 10 ? '0' : ''}${s}s`
  }

  // Export Users CSV
  const handleExportCSV = () => {
    if (!users || users.length === 0) {
      alert('No user records to export.')
      return
    }

    const headers = [
      'User Name',
      'Email',
      'Role',
      'Security Status',
      'Rate Limit Lockout',
      'Account Created',
      'Total Orders',
      'Lifetime Spend (PHP)',
      'Phone',
      'Address',
    ]
    const rows = users.map((u: any) => [
      `"${(u.name || 'User').replace(/"/g, '""')}"`,
      u.email,
      u.role || 'customer',
      u.isLocked ? 'Locked (Rate Limit)' : u.isOnline ? 'Active (Online)' : 'Inactive (Offline)',
      u.isLocked ? `${u.failedAttempts} failed attempts (${formatSeconds(u.lockoutRemainingSeconds)})` : 'Normal',
      new Date(u.createdAt).toLocaleString('en-PH'),
      u.ordersCount || 0,
      Number(u.totalSpent || 0).toFixed(2),
      `"${u.phone || ''}"`,
      `"${(u.address || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FreshCart_Users_Directory_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            User & Customer Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time accounts directory tracking newly created users, live active/inactive sessions, rate-limited lockouts, and staff access
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            title="Refresh Users"
            className="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>Export Users CSV 📥</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>✓ {message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-700 font-black">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>✕ {error}</span>
          <button onClick={() => setError(null)} className="text-red-700 font-black">✕</button>
        </div>
      )}

      {/* 2. TOP KPI SUMMARY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Total Accounts</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">{summary.totalUsers}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{summary.createdToday} created today</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Active (Online Now)</p>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{summary.activeOnline}</p>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Currently logged in</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-red-200 bg-red-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-800">Locked (Rate Limit)</p>
            {summary.lockedCount > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
          </div>
          <p className="text-xl font-black text-red-700 mt-0.5">{summary.lockedCount}</p>
          <p className="text-[10px] text-red-700/80 mt-0.5">Exceeded 4 attempts (10m)</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-200 bg-purple-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">Staff & Admins</p>
          <p className="text-xl font-black text-purple-700 mt-0.5">{summary.staffCount}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Operations management</p>
        </div>
      </div>

      {/* 3. DUAL FILTER TABS: ROLES & LIVE STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-2">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              roleFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs font-black'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span>All Users</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${roleFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200/70 text-gray-700'}`}>
              {summary.totalUsers}
            </span>
          </button>

          <button
            onClick={() => setRoleFilter('customer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              roleFilter === 'customer'
                ? 'bg-emerald-700 text-white shadow-xs font-black'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span>Customers</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${roleFilter === 'customer' ? 'bg-emerald-800 text-white' : 'bg-gray-200/70 text-gray-700'}`}>
              {summary.customersCount}
            </span>
          </button>

          <button
            onClick={() => setRoleFilter('staff')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              roleFilter === 'staff'
                ? 'bg-purple-700 text-white shadow-xs font-black'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span>Staff & Admins</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${roleFilter === 'staff' ? 'bg-purple-800 text-white' : 'bg-gray-200/70 text-gray-700'}`}>
              {summary.staffCount}
            </span>
          </button>
        </div>

        {/* Status Filter (Active / Inactive / Locked) */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto border border-gray-200 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Statuses
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'active' ? 'bg-white text-emerald-800 shadow-2xs font-black' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Active ({summary.activeOnline})</span>
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'locked' ? 'bg-white text-red-800 shadow-2xs font-black' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span>Locked ({summary.lockedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'inactive' ? 'bg-white text-gray-800 shadow-2xs font-black' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-gray-400"></span>
            <span>Inactive ({summary.inactiveOffline})</span>
          </button>
        </div>
      </div>

      {/* 4. SEARCH SUB-BAR */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search by customer name, email, phone, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none pl-10 shadow-xs"
        />
        <svg
          className="absolute left-3.5 top-3 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 5. USER DIRECTORY TABLE */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-xs text-gray-500 font-bold mt-3">Loading user directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3">User & Contact</th>
                  <th className="px-4 py-3">Security & Status</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3">Account Created</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* User & Contact */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs border flex-shrink-0 ${
                            u.isLocked
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            {u.isLocked ? '🔒' : (u.name || u.email || 'U')[0].toUpperCase()}
                          </div>
                          {u.isOnline && !u.isLocked && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{u.name || 'Anonymous User'}</p>
                          <p className="text-[10px] text-gray-400 font-mono truncate">{u.email}</p>
                          {u.phone && <p className="text-[9px] text-gray-500">{u.phone}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Security & Live Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {u.isLocked ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-900 border border-red-200 animate-pulse">
                            <span>🔒</span> Locked (Rate Limit)
                          </span>
                          <p className="text-[9px] font-mono text-red-700 pl-1">
                            {formatSeconds(u.lockoutRemainingSeconds)} remaining
                          </p>
                        </div>
                      ) : u.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Role Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                          u.role === 'system_admin'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : u.role === 'admin'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : u.role === 'staff'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {u.role === 'system_admin'
                          ? 'SysAdmin'
                          : u.role === 'admin'
                          ? 'Admin'
                          : u.role === 'staff'
                          ? 'Staff'
                          : 'Customer'}
                      </span>
                    </td>

                    {/* Account Created Date */}
                    <td className="px-4 py-3 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                      <p>
                        {new Date(u.createdAt).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(u.createdAt).toLocaleTimeString('en-PH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </td>

                    {/* Orders Count */}
                    <td className="px-4 py-3 text-right font-black text-gray-900 whitespace-nowrap">
                      {u.ordersCount || 0}
                    </td>

                    {/* Total Spent */}
                    <td className="px-4 py-3 text-right font-black text-emerald-700 whitespace-nowrap">
                      ₱{Number(u.totalSpent || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.isLocked && (
                          <button
                            onClick={() => handleUnlockUser(u)}
                            disabled={unlockingId === u.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-black text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            {unlockingId === u.id ? 'Unlocking...' : 'Unlock 🔓'}
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Edit ✏️
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 transition-colors cursor-pointer"
                        >
                          Delete 🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                      No user accounts found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. MODAL: EDIT USER & ROLE MANAGEMENT                    */}
      {/* ======================================================== */}
      {editingUser !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black text-gray-900">Edit User Profile & Access</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Role Assignment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Assigned User Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer"
                >
                  <option value="customer">Customer (Storefront Shopper)</option>
                  <option value="staff">Staff (Order Fulfillment & Stock)</option>
                  <option value="admin">Store Admin (Full Management)</option>
                  <option value="system_admin">System Admin (Super Administrator)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Admins and Staff have access to the back-office operations console.
                </p>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Postal / Zip */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Zip / Postal Code
                </label>
                <input
                  type="text"
                  value={editForm.zip}
                  onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingUser ? 'Saving...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: DELETE USER CONFIRMATION                       */}
      {/* ======================================================== */}
      {deletingUser !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center font-black text-lg">
                🗑️
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900">Delete User Account?</h3>
                <p className="text-xs text-gray-500">This action will remove the user from database records.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1">
              <p className="font-bold text-gray-900">{deletingUser.name || 'Anonymous User'}</p>
              <p className="text-gray-500 font-mono">{deletingUser.email}</p>
              <p className="text-gray-700 mt-1">
                Role: <strong className="capitalize">{deletingUser.role || 'customer'}</strong> · Orders placed: <strong>{deletingUser.ordersCount || 0}</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
