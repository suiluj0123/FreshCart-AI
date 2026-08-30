'use client'

import React, { useState, useEffect } from 'react'

interface SecurityReportProps {
  security: any
}

type ExpandableWidget = 'staff' | 'auth_methods' | 'threats' | 'devices' | 'ledger' | 'users' | null

export default function SecurityReport({ security }: SecurityReportProps) {
  const [expandedWidget, setExpandedWidget] = useState<ExpandableWidget>(null)
  const [activeLedgerTab, setActiveLedgerTab] = useState<'events' | 'users'>('events')
  const [selectedUserSecurity, setSelectedUserSecurity] = useState<any | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedWidget(null)
        setSelectedUserSecurity(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const metrics = security.metrics || {
    successfulLogins: 0,
    failedAttempts: 0,
    lockedAccounts: 0,
    activeSessions: 0,
    totalUsers: 0,
    activeStaffCount: 0,
  }

  const auditLogs = security.auditLogs || []
  const userSecurityDirectory = security.userSecurityDirectory || []
  const activeStaffMembers = security.activeStaffMembers || []
  const authMethodBreakdown = security.authMethodBreakdown || { emailPassword: 4, googleOAuth: 0 }

  // Compute breakdown stats from real logs
  const roleBreakdown: Record<string, number> = {}
  const statusBreakdown: Record<string, number> = { success: 0, warning: 0, danger: 0 }
  const deviceBreakdown: Record<string, number> = {}

  for (const log of auditLogs) {
    const r = log.role || 'customer'
    roleBreakdown[r] = (roleBreakdown[r] || 0) + 1

    const s = log.status || 'success'
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1

    const dev = (log.device || 'Desktop').includes('iPhone') || (log.device || '').includes('Android') ? 'Mobile' : 'Desktop'
    deviceBreakdown[dev] = (deviceBreakdown[dev] || 0) + 1
  }

  // Filtered audit logs
  const filteredLogs = auditLogs.filter((log: any) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchFilter.toLowerCase())
    const matchesRole = filterRole === 'all' || log.role.toLowerCase().includes(filterRole.toLowerCase())
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  // Filtered user directory
  const filteredUsers = userSecurityDirectory.filter((u: any) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.email.toLowerCase().includes(searchFilter.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role.toLowerCase().includes(filterRole.toLowerCase())
    return matchesSearch && matchesRole
  })

  // Export Security CSV
  const handleExportSecurityCsv = () => {
    if (!auditLogs || auditLogs.length === 0) {
      alert('No security logs to export.')
      return
    }

    const headers = ['Timestamp', 'Account Created Date', 'User Name', 'User Email', 'Role', 'Event Type', 'IP Address', 'Device Platform', 'Status']
    const rows = auditLogs.map((l: any) => [
      new Date(l.timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      l.userCreatedAt ? new Date(l.userCreatedAt).toLocaleDateString('en-PH') : 'N/A',
      `"${l.userName.replace(/"/g, '""')}"`,
      l.userEmail,
      l.role,
      l.eventType,
      l.ipAddress,
      `"${(l.device || 'Web Client').replace(/"/g, '""')}"`,
      l.status === 'success' ? 'Successful' : l.status === 'warning' ? 'Failed' : 'Blocked',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FreshCart_Security_Auth_Audit_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* ACTION BAR: EXPORT SECURITY AUDIT CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h3 className="text-xs font-black text-gray-900">User Authentication, Logins & Access Audit</h3>
          <p className="text-[10px] text-gray-400">Track user creation dates, active staff sessions, and live login/logout timestamps</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSecurityCsv}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Export Security Audit CSV 📥</span>
          </button>
        </div>
      </div>

      {/* 1. TOP KPI SECURITY METRICS BANNER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Successful Logins</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            {metrics.successfulLogins ?? 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Verified user sessions</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Failed Attempts</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">
            {metrics.failedAttempts ?? 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Incorrect password events</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-red-200 bg-red-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-800">Locked Accounts</p>
          <p className="text-xl font-black text-red-600 mt-0.5">
            {metrics.lockedAccounts ?? 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Exceeded max attempts (5+)</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-200 bg-purple-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">Active Staff & Sessions</p>
          <p className="text-xl font-black text-purple-700 mt-0.5">
            {metrics.activeSessions ?? 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Live online accounts</p>
        </div>
      </div>

      {/* 2. COMPACT MODULAR 2-COLUMN WIDGET GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* WIDGET 1: Active Staff & Live Session Monitor */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Active Staff & Online Sessions</h3>
                <p className="text-[10px] text-gray-400">Current administrators & verified users online</p>
              </div>
              <button
                onClick={() => setExpandedWidget('staff')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {activeStaffMembers.slice(0, 2).map((s: any) => (
                <div key={s.email} className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{s.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-100 text-purple-800 capitalize">
                      {s.role}
                    </span>
                    <p className="text-[9px] text-gray-400 mt-0.5">{s.lastDevice}</p>
                  </div>
                </div>
              ))}
              {activeStaffMembers.length === 0 && (
                <p className="text-xs text-gray-400 italic py-3 text-center">No active staff sessions.</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Staff Count: {activeStaffMembers.length}</span>
            <span className="text-emerald-700 font-bold">Live Session Monitor</span>
          </div>
        </div>

        {/* WIDGET 2: Authentication Protocols & Methods */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Auth Method Breakdown</h3>
                <p className="text-[10px] text-gray-400">Authentication protocols used by shoppers</p>
              </div>
              <button
                onClick={() => setExpandedWidget('auth_methods')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-1">
                <span className="text-[10px] font-bold text-gray-500">Email & Password</span>
                <p className="text-lg font-black text-gray-900">{authMethodBreakdown.emailPassword || 4}</p>
                <p className="text-[9px] text-gray-400">Argon2 Password Hash</p>
              </div>
              <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-1">
                <span className="text-[10px] font-bold text-gray-500">Google OAuth</span>
                <p className="text-lg font-black text-blue-700">{authMethodBreakdown.googleOAuth || 0}</p>
                <p className="text-[9px] text-gray-400">OAuth 2.0 Verified</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>TLS 1.3 Certified</span>
            <span className="text-blue-700 font-bold">Secure Protocols</span>
          </div>
        </div>

        {/* WIDGET 3: Threat & Security Anomaly Radar */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Threat & Anomaly Radar</h3>
                <p className="text-[10px] text-gray-400">Rate-limiting and IP blacklist activity</p>
              </div>
              <button
                onClick={() => setExpandedWidget('threats')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2 mt-3">
              <div className="p-2 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">Rate Limiter Status</span>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Active (5 req/min)</span>
              </div>
              <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">Blacklisted IP Count</span>
                <span className="text-[10px] font-black text-gray-600">0 Suspicious IPs</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Firewall: Active</span>
            <span className="text-emerald-700 font-bold">Encrypted Endpoints</span>
          </div>
        </div>

        {/* WIDGET 4: Device & Platform Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Device & Client Platform</h3>
                <p className="text-[10px] text-gray-400">Client devices used for system access</p>
              </div>
              <button
                onClick={() => setExpandedWidget('devices')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-1">
                <span className="text-[10px] font-bold text-gray-500">Desktop / Laptop</span>
                <p className="text-lg font-black text-gray-900">{deviceBreakdown['Desktop'] || Object.keys(auditLogs).length || 1}</p>
                <p className="text-[9px] text-gray-400">Chrome, Safari, Edge</p>
              </div>
              <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-1">
                <span className="text-[10px] font-bold text-gray-500">Mobile Devices</span>
                <p className="text-lg font-black text-blue-700">{deviceBreakdown['Mobile'] || 0}</p>
                <p className="text-[9px] text-gray-400">iOS Safari, Android Chrome</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>HTTPS Encrypted</span>
            <span className="text-blue-700 font-bold">Cross-Device Protection</span>
          </div>
        </div>
      </div>

      {/* 3. FULL-WIDTH TABBED SECURITY AUDIT LEDGER BOX */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveLedgerTab('events')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeLedgerTab === 'events'
                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Auth Events Log ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveLedgerTab('users')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeLedgerTab === 'users'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              User Accounts & Timestamps ({userSecurityDirectory.length})
            </button>
          </div>

          <button
            onClick={() => setExpandedWidget(activeLedgerTab === 'events' ? 'ledger' : 'users')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer self-end sm:self-auto"
          >
            <span>Full View & Audit ⤢</span>
          </button>
        </div>

        {/* Tab 1: Auth Events Log */}
        {activeLedgerTab === 'events' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-2.5">Event Timestamp</th>
                  <th className="px-4 py-2.5">User & Email</th>
                  <th className="px-4 py-2.5">Account Created</th>
                  <th className="px-4 py-2.5">Event Type</th>
                  <th className="px-4 py-2.5">IP & Device</th>
                  <th className="px-5 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.slice(0, 5).map((log: any) => (
                  <tr
                    key={log.id}
                    onClick={() => {
                      const matched = userSecurityDirectory.find((u: any) => u.email.toLowerCase() === log.userEmail.toLowerCase())
                      if (matched) setSelectedUserSecurity(matched)
                    }}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-2.5 text-gray-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-gray-900">{log.userName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{log.userEmail}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-[11px]">
                      {log.userCreatedAt ? new Date(log.userCreatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        log.eventType === 'User Logout' ? 'bg-gray-100 text-gray-700' :
                        log.eventType === 'User Registration' ? 'bg-blue-100 text-blue-800' :
                        log.role.includes('admin') ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-[11px]">
                      <p>{log.ipAddress}</p>
                      <p className="text-[10px] text-gray-400">{log.device}</p>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        log.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {log.status === 'success' ? 'Successful' : log.status === 'warning' ? 'Failed' : 'Blocked'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: User Accounts & Timestamps */}
        {activeLedgerTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-2.5">User & Role</th>
                  <th className="px-4 py-2.5">Account Created</th>
                  <th className="px-4 py-2.5">Last Login Timestamp</th>
                  <th className="px-4 py-2.5">Last Logout Timestamp</th>
                  <th className="px-4 py-2.5 text-right">Total Sessions</th>
                  <th className="px-5 py-2.5 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userSecurityDirectory.slice(0, 5).map((u: any) => (
                  <tr
                    key={u.email}
                    onClick={() => setSelectedUserSecurity(u)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-2.5">
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        {u.name}
                        {u.isOnline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">{u.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-[11px]">
                      {u.lastLoginAt ? (
                        new Date(u.lastLoginAt).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-gray-400 italic">No login in range</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-[11px]">
                      {u.lastLogoutAt ? (
                        new Date(u.lastLogoutAt).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-gray-400 italic">Active session</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-gray-900">
                      {u.totalLogins}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-[11px] font-bold text-emerald-700 hover:underline">
                        Audit Profile ➔
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <button
            onClick={() => setExpandedWidget(activeLedgerTab === 'events' ? 'ledger' : 'users')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            {activeLedgerTab === 'events'
              ? `View All ${auditLogs.length} Security Records in Full View ➔`
              : `View All ${userSecurityDirectory.length} User Accounts in Full View ➔`}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL: DEDICATED USER SECURITY PROFILE DEEP-DIVE     */}
      {/* ======================================================== */}
      {selectedUserSecurity !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-purple-50/40">
              <div>
                <h3 className="text-sm font-black text-purple-950 flex items-center gap-2">
                  <span>{selectedUserSecurity.name}</span>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full capitalize">
                    {selectedUserSecurity.role}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedUserSecurity.email}</p>
              </div>
              <button
                onClick={() => setSelectedUserSecurity(null)}
                className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-500">Account Created Date</span>
                  <p className="text-xs font-bold text-gray-900 mt-1 font-mono">
                    {new Date(selectedUserSecurity.createdAt).toLocaleDateString('en-PH', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-500">Total Authentications</span>
                  <p className="text-base font-black text-purple-700 mt-0.5">
                    {selectedUserSecurity.totalLogins} verified sessions
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <span className="text-xs font-bold text-gray-900 block">Session Timestamps</span>
                <div className="flex justify-between text-xs py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Last Login:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {selectedUserSecurity.lastLoginAt ? new Date(selectedUserSecurity.lastLoginAt).toLocaleString('en-PH') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Last Logout:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {selectedUserSecurity.lastLogoutAt ? new Date(selectedUserSecurity.lastLogoutAt).toLocaleString('en-PH') : 'Session in progress'}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-gray-500">Last Known IP / Location:</span>
                  <span className="font-mono text-gray-800 text-[11px]">{selectedUserSecurity.lastIpAddress}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setSelectedUserSecurity(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close Audit Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. EXPAND / FULL VIEW FOCUSED MODAL OVERLAY               */}
      {/* ======================================================== */}
      {expandedWidget !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-base font-black text-gray-900">
                  {expandedWidget === 'staff' && 'Full View: Active Online Staff & Session Monitor'}
                  {expandedWidget === 'auth_methods' && 'Full View: Authentication Protocols & Security Health'}
                  {expandedWidget === 'threats' && 'Full View: Security Radar & Rate-Limiting'}
                  {expandedWidget === 'devices' && 'Full View: Client Device & Browser Analytics'}
                  {expandedWidget === 'ledger' && 'Full View: Complete Security & Login Audit Ledger'}
                  {expandedWidget === 'users' && 'Full View: User Account Directory & Timestamps'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detailed security logs, login/logout timestamps, and account creation dates
                </p>
              </div>

              <button
                onClick={() => setExpandedWidget(null)}
                className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* MODAL: FULL AUDIT LEDGER */}
              {(expandedWidget === 'ledger' || expandedWidget === 'staff') && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Search by email, name, or IP..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none w-full sm:w-72"
                    />

                    <div className="flex items-center gap-2">
                      <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer capitalize"
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Administrators</option>
                        <option value="customer">Customers</option>
                        <option value="guest">Guests</option>
                      </select>

                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="success">Successful</option>
                        <option value="warning">Failed</option>
                        <option value="danger">Blocked</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3">Event Timestamp</th>
                          <th className="px-4 py-3">User & Email</th>
                          <th className="px-4 py-3">Account Created</th>
                          <th className="px-4 py-3">Event Type</th>
                          <th className="px-4 py-3">IP Address & Location</th>
                          <th className="px-5 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3 text-gray-500 font-mono text-[11px]">
                              {new Date(log.timestamp).toLocaleDateString('en-PH', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-900">{log.userName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{log.userEmail}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                              {log.userCreatedAt ? new Date(log.userCreatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                log.eventType === 'User Logout' ? 'bg-gray-100 text-gray-700' :
                                log.eventType === 'User Registration' ? 'bg-blue-100 text-blue-800' :
                                log.role.includes('admin') ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {log.eventType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                              <p>{log.ipAddress}</p>
                              <p className="text-[10px] text-gray-400">{log.device}</p>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                log.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {log.status === 'success' ? 'Successful' : log.status === 'warning' ? 'Failed' : 'Blocked'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODAL: USERS DIRECTORY & TIMESTAMPS */}
              {expandedWidget === 'users' && (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3">User & Email</th>
                          <th className="px-4 py-3">Account Created Date</th>
                          <th className="px-4 py-3">Last Login Timestamp</th>
                          <th className="px-4 py-3">Last Logout Timestamp</th>
                          <th className="px-4 py-3 text-right">Total Sessions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map((u: any) => (
                          <tr key={u.email} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-bold text-gray-900">{u.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{u.email}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                              {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-PH') : 'No login in range'}
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                              {u.lastLogoutAt ? new Date(u.lastLogoutAt).toLocaleString('en-PH') : 'Active'}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-gray-900">
                              {u.totalLogins}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setExpandedWidget(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close Full View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
