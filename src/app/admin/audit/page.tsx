'use client'

import React, { useState, useEffect } from 'react'

export type AuditCategory = 'all' | 'inventory' | 'orders' | 'security' | 'spoilage'
export type AuditStatus = 'all' | 'success' | 'warning' | 'danger' | 'info'
export type DateRange = 'today' | '7d' | 'month' | '30d' | 'all' | 'custom'

interface AuditSummary {
  totalEvents: number
  inventoryEvents: number
  orderEvents: number
  securityEvents: number
  spoilageEvents: number
  warningEvents: number
}

export default function AdminAuditPage() {
  const [category, setCategory] = useState<AuditCategory>('all')
  const [status, setStatus] = useState<AuditStatus>('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])
  const [summary, setSummary] = useState<AuditSummary>({
    totalEvents: 0,
    inventoryEvents: 0,
    orderEvents: 0,
    securityEvents: 0,
    spoilageEvents: 0,
    warningEvents: 0,
  })

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEvent(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchAuditLogs = async (
    cat: AuditCategory,
    st: AuditStatus,
    range: DateRange,
    search: string,
    from?: string,
    to?: string
  ) => {
    try {
      setLoading(true)
      let url = `/api/admin/audit?category=${cat}&status=${st}&range=${range}&search=${encodeURIComponent(search)}`
      if (range === 'custom' && from) {
        url += `&from=${from}&to=${to || from}`
      }
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setEvents(json.events || [])
        setSummary(json.summary || {
          totalEvents: 0,
          inventoryEvents: 0,
          orderEvents: 0,
          securityEvents: 0,
          spoilageEvents: 0,
          warningEvents: 0,
        })
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs(category, status, dateRange, searchQuery, customFrom, customTo)
  }, [category, status, dateRange, searchQuery])

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault()
    setDateRange('custom')
    fetchAuditLogs(category, status, 'custom', searchQuery, customFrom, customTo)
    setShowCustomPicker(false)
  }

  // Export Audit Logs to CSV
  const handleExportCSV = () => {
    if (!events || events.length === 0) {
      alert('No audit logs to export.')
      return
    }

    const headers = ['Timestamp', 'Category', 'Action Type', 'Entity Type', 'Entity ID', 'Actor Name', 'Actor Email', 'Actor Role', 'Description', 'Status', 'IP Address']
    const rows = events.map((e: any) => [
      new Date(e.createdAt).toLocaleString('en-PH'),
      e.category.toUpperCase(),
      e.action,
      e.entityType || 'N/A',
      `"${e.entityId || ''}"`,
      `"${(e.actorName || 'System').replace(/"/g, '""')}"`,
      e.actorEmail || 'N/A',
      e.actorRole || 'admin',
      `"${(e.details || '').replace(/"/g, '""')}"`,
      e.status.toUpperCase(),
      e.ipAddress || '127.0.0.1',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FreshCart_System_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const categoryTabDefs: Array<{ key: AuditCategory; label: string; count: number }> = [
    { key: 'all', label: 'All Operations', count: summary.totalEvents },
    { key: 'inventory', label: 'Inventory & Stock', count: summary.inventoryEvents },
    { key: 'orders', label: 'Orders & Fulfillment', count: summary.orderEvents },
    { key: 'security', label: 'Security & Logins', count: summary.securityEvents },
    { key: 'spoilage', label: 'Spoilage & Waste', count: summary.spoilageEvents },
  ]

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & GLOBAL CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            System-Wide Audit Trail & Activity Logs
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Centralized, immutable operational activity trail across inventory batches, order fulfillments, staff auth sessions, and food waste
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Range Selector */}
          <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-bold border border-gray-200 shadow-2xs">
            {(['today', '7d', 'month', '30d', 'all'] as DateRange[]).map((range) => {
              const labels: Record<DateRange, string> = {
                today: 'Today',
                '7d': '7 Days',
                month: 'This Month',
                '30d': '30 Days',
                all: 'All Time',
                custom: 'Custom',
              }
              return (
                <button
                  key={range}
                  onClick={() => {
                    setShowCustomPicker(false)
                    setDateRange(range)
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    dateRange === range && !showCustomPicker
                      ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {labels[range]}
                </button>
              )
            })}

            <button
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateRange === 'custom' || showCustomPicker
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Custom Range 📅
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => fetchAuditLogs(category, status, dateRange, searchQuery, customFrom, customTo)}
            title="Refresh Audit Logs"
            className="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>Export Audit CSV 📥</span>
          </button>
        </div>
      </div>

      {/* CUSTOM DATE RANGE PICKER DROPDOWN */}
      {showCustomPicker && (
        <form
          onSubmit={handleApplyCustomRange}
          className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-black text-gray-900">Custom Cutoff Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-bold">From:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-900 font-medium focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-bold">To:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-900 font-medium focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCustomPicker(false)}
              className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Apply Filter
            </button>
          </div>
        </form>
      )}

      {/* 2. TOP KPI AUDIT SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Total System Events</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">{summary.totalEvents}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Chronological activity logs</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-200 bg-blue-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800">Inventory Logs</p>
          <p className="text-xl font-black text-blue-700 mt-0.5">{summary.inventoryEvents}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Batches received & adjustments</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Order Transitions</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{summary.orderEvents}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Created, packing, completed</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-200 bg-purple-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">Security & Logins</p>
          <p className="text-xl font-black text-purple-700 mt-0.5">{summary.securityEvents}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Verified sessions & logouts</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-red-200 bg-red-50/20 shadow-xs col-span-2 lg:col-span-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-800">Alerts & Waste</p>
          <p className="text-xl font-black text-red-600 mt-0.5">{summary.warningEvents}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Discards & auth warnings</p>
        </div>
      </div>

      {/* 3. PERSISTENT CATEGORY TABS BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        {categoryTabDefs.map((tab) => {
          const isActive = category === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-gray-900 text-white shadow-xs font-black'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-gray-800 text-white' : 'bg-gray-200/70 text-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 4. SEARCH & STATUS FILTER SUB-BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search action, actor name, email, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none pl-9"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-bold">Filter Status:</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AuditStatus)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer"
          >
            <option value="all">All Outcomes</option>
            <option value="success">Successful</option>
            <option value="warning">Warning</option>
            <option value="danger">Critical / Discard</option>
            <option value="info">Informational</option>
          </select>
        </div>
      </div>

      {/* 5. ITEMIZED AUDIT TRAIL LEDGER */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-xs text-gray-500 font-bold mt-3">Loading system audit stream...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Action & Summary</th>
                  <th className="px-4 py-3">Actor & Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((evt: any) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase tracking-wider ${
                          evt.category === 'inventory'
                            ? 'bg-blue-100 text-blue-800'
                            : evt.category === 'orders'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evt.category === 'security'
                            ? 'bg-purple-100 text-purple-800'
                            : evt.category === 'spoilage'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {evt.category}
                      </span>
                    </td>

                    <td className="px-4 py-3 max-w-md">
                      <p className="font-bold text-gray-900 leading-tight">{evt.details}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Action: {evt.action} {evt.entityId ? `· Entity: ${evt.entityId.slice(0, 8)}...` : ''}
                      </p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-gray-900">{evt.actorName}</p>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        {evt.actorRole}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          evt.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : evt.status === 'danger'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : evt.status === 'warning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span className="text-[11px] font-bold text-emerald-700 hover:underline">
                        View Diff ➔
                      </span>
                    </td>
                  </tr>
                ))}

                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                      No operational audit logs matching your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. MODAL: AUDIT EVENT DEEP-DIVE & JSON DIFF VIEWER       */}
      {/* ======================================================== */}
      {selectedEvent !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wider ${
                      selectedEvent.category === 'inventory'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedEvent.category === 'orders'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedEvent.category === 'security'
                        ? 'bg-purple-100 text-purple-800'
                        : selectedEvent.category === 'spoilage'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {selectedEvent.category}
                  </span>
                  <h3 className="text-sm font-black text-gray-900">{selectedEvent.action}</h3>
                </div>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  ID: {selectedEvent.id} · Timestamp: {new Date(selectedEvent.createdAt).toLocaleString('en-PH')}
                </p>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Event Description */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</span>
                <p className="text-xs font-bold text-gray-900 leading-relaxed">{selectedEvent.details}</p>
              </div>

              {/* Actor & Entity Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actor Information</span>
                  <p className="text-xs font-black text-gray-900 mt-1">{selectedEvent.actorName}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{selectedEvent.actorEmail || 'System Process'}</p>
                  <p className="text-[10px] font-bold text-emerald-700 mt-0.5 capitalize">Role: {selectedEvent.actorRole}</p>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Device & Location</span>
                  <p className="text-xs font-black text-gray-900 mt-1 font-mono">{selectedEvent.ipAddress}</p>
                  <p className="text-[10px] text-gray-500">{selectedEvent.device}</p>
                  <p className="text-[10px] font-bold text-gray-700 mt-0.5">Entity: {selectedEvent.entityType || 'System'}</p>
                </div>
              </div>

              {/* JSON State / Payload View */}
              {selectedEvent.newState && (
                <div>
                  <span className="text-xs font-bold text-gray-900 block mb-1.5">Event State Payload</span>
                  <pre className="p-3.5 rounded-2xl bg-gray-900 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-gray-800">
                    {JSON.stringify(selectedEvent.newState, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
