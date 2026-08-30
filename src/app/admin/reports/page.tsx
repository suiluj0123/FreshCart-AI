'use client'

import React, { useState, useEffect } from 'react'
import SalesReport from './components/SalesReport'
import InventoryReport from './components/InventoryReport'
import SpoilageReport from './components/SpoilageReport'
import CustomerReport from './components/CustomerReport'
import SecurityReport from './components/SecurityReport'

export type DateRange = 'today' | '7d' | 'month' | '30d' | 'all' | 'custom'
export type ReportTab = 'sales' | 'inventory' | 'spoilage' | 'customers' | 'security'

interface ReportCardDef {
  key: ReportTab
  title: string
  shortTitle: string
  subtitle: string
  color: string
  badgeBg: string
  badgeText: string
  getPreview: (data: any) => { primary: string; secondary: string; tag: string }
}

const REPORT_CARDS: ReportCardDef[] = [
  {
    key: 'sales',
    title: 'Sales & Revenue Performance',
    shortTitle: 'Sales & Revenue',
    subtitle: 'Daily sales velocity, gross revenue (GMV), department contributions, and payment methods.',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeText: 'Financial Performance',
    getPreview: (data) => ({
      primary: `₱${Number(data?.sales?.totalGrossRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      secondary: `${Number(data?.sales?.totalOrders || 0).toLocaleString('en-PH')} completed orders · AOV: ₱${Number(data?.sales?.averageOrderValue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      tag: `${Number(data?.sales?.totalItemsSold || 0).toLocaleString('en-PH')} items sold`,
    }),
  },
  {
    key: 'inventory',
    title: 'Inventory Health & Fast Movers',
    shortTitle: 'Inventory Health',
    subtitle: 'Top 10 best-selling groceries leaderboard, slow-moving stagnant stock, and warehouse valuation.',
    color: 'blue',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    badgeText: 'Stock & Velocity',
    getPreview: (data) => ({
      primary: `${Number(data?.inventory?.totalStockOnHand || 0).toLocaleString('en-PH')} units`,
      secondary: `Valuation: ₱${Number(data?.inventory?.totalStockValuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${data?.inventory?.totalSkus || 0} active SKUs`,
      tag: 'Best-Sellers Leaderboard',
    }),
  },
  {
    key: 'spoilage',
    title: 'Food Spoilage & Clearance Savings',
    shortTitle: 'Food Spoilage & Expiry',
    subtitle: 'Damaged & expired food financial losses, revenue rescued via clearance sales, and discard reasons.',
    color: 'amber',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'Freshness & Waste Audit',
    getPreview: (data) => ({
      primary: `₱${Number(data?.spoilage?.totalSpoilageLoss || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} loss`,
      secondary: `₱${Number(data?.spoilage?.clearanceRevenueRescued || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} rescued via discounts (${data?.spoilage?.rescueRatioPct || 85}% recovery rate)`,
      tag: `${Number(data?.spoilage?.totalUnitsSpoiled || 0).toLocaleString('en-PH')} units discarded`,
    }),
  },
  {
    key: 'customers',
    title: 'Customer Activity & Fulfillment',
    shortTitle: 'Customer Activity',
    subtitle: 'Shopper purchasing frequency, repeat buyer retention rates, and delivery vs pickup preferences.',
    color: 'indigo',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    badgeText: 'Shopper Insights',
    getPreview: (data) => ({
      primary: `${Number(data?.customers?.activeShoppers || 0).toLocaleString('en-PH')} Active Buyers`,
      secondary: `${data?.customers?.repeatRatePct || 0}% repeat ordering rate · ${data?.customers?.fulfillment?.delivery || 0} delivery vs ${data?.customers?.fulfillment?.pickup || 0} pickup`,
      tag: `${Number(data?.customers?.totalUsers || 0).toLocaleString('en-PH')} registered users`,
    }),
  },
  {
    key: 'security',
    title: 'User Logins & Security Audit',
    shortTitle: 'User Security & Logins',
    subtitle: 'Verified user sessions, failed password attempts, account lockouts, and live security activity ledger.',
    color: 'purple',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    badgeText: 'Authentication Security',
    getPreview: (data) => ({
      primary: `${data?.security?.metrics?.successfulLogins ?? 0} Verified Logins`,
      secondary: `${data?.security?.metrics?.failedAttempts ?? 0} failed attempts · ${data?.security?.metrics?.lockedAccounts ?? 0} locked accounts`,
      tag: `${data?.security?.metrics?.activeSessions ?? 0} active sessions`,
    }),
  },
]

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const [selectedReport, setSelectedReport] = useState<ReportTab | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchReports = async (range: DateRange, fromDate?: string, toDate?: string) => {
    try {
      setLoading(true)
      let url = `/api/admin/reports?range=${range}`
      if (range === 'custom' && fromDate) {
        url += `&from=${fromDate}&to=${toDate || fromDate}`
      }
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setData(json)
        setLastUpdated(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dateRange === 'custom') {
      fetchReports('custom', customFrom, customTo)
    } else {
      fetchReports(dateRange)
    }
  }, [dateRange])

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault()
    setDateRange('custom')
    fetchReports('custom', customFrom, customTo)
    setShowCustomPicker(false)
  }

  // Universal CSV Export
  const handleExportCSV = () => {
    if (!data) return
    const activeKey = selectedReport || 'executive_summary'
    let csvContent = 'data:text/csv;charset=utf-8,'
    let filename = `FreshCart_${activeKey}_report_${dateRange}.csv`

    if (activeKey === 'sales') {
      csvContent += 'Date,Revenue (PHP),Orders\n'
      data.sales?.salesTrend?.forEach((item: any) => {
        csvContent += `"${item.label}",${item.revenue},${item.orders}\n`
      })
    } else if (activeKey === 'inventory') {
      csvContent += 'Product Name,Category,Units Sold,Revenue (PHP),Stock on Hand,Valuation (PHP)\n'
      data.inventory?.bestSellers?.forEach((item: any) => {
        csvContent += `"${item.name}","${item.category}",${item.unitsSold},${item.revenue},${item.currentStock},${item.valuation}\n`
      })
    } else if (activeKey === 'spoilage') {
      csvContent += 'Date Discarded,Product Name,Category,Quantity,Cost Price (PHP),Total Loss (PHP),Reason\n'
      data.spoilage?.recentLogs?.forEach((item: any) => {
        csvContent += `"${new Date(item.createdAt).toLocaleDateString()}","${item.Product?.name || 'Item'}","${item.Product?.category || 'general'}",${item.quantity},${item.costPrice},${item.totalLossValuation},"${item.reason}"\n`
      })
    } else if (activeKey === 'customers') {
      csvContent += 'Customer Name,Email,Orders,Total Spent (PHP),Deliveries,Pickups,Member Since\n'
      data.customers?.customerDirectory?.forEach((item: any) => {
        csvContent += `"${item.name}","${item.email}",${item.ordersCount},${item.totalSpent},${item.deliveryCount},${item.pickupCount},"${new Date(item.memberSince || item.lastOrderDate).toLocaleDateString()}"\n`
      })
    } else if (activeKey === 'security') {
      csvContent += 'Timestamp,Account Created,User Name,Email,Role,Event Type,IP Address,Device,Status\n'
      data.security?.auditLogs?.forEach((item: any) => {
        csvContent += `"${new Date(item.timestamp).toLocaleString()}","${item.userCreatedAt ? new Date(item.userCreatedAt).toLocaleDateString() : 'N/A'}","${item.userName}","${item.userEmail}","${item.role}","${item.eventType}","${item.ipAddress}","${item.device}","${item.status}"\n`
      })
    } else {
      csvContent += 'Executive Summary Metric,Value\n'
      csvContent += `"Gross Revenue (PHP)",${data.sales?.totalGrossRevenue || 0}\n`
      csvContent += `"Total Orders Completed",${data.sales?.totalOrders || 0}\n`
      csvContent += `"Average Order Value (PHP)",${data.sales?.averageOrderValue || 0}\n`
      csvContent += `"Total Stock Units on Hand",${data.inventory?.totalStockOnHand || 0}\n`
      csvContent += `"Warehouse Stock Valuation (PHP)",${data.inventory?.totalStockValuation || 0}\n`
      csvContent += `"Food Spoilage Discard Loss (PHP)",${data.spoilage?.totalSpoilageLoss || 0}\n`
      csvContent += `"Clearance Revenue Rescued (PHP)",${data.spoilage?.clearanceRevenueRescued || 0}\n`
      csvContent += `"Active Shoppers",${data.customers?.activeShoppers || 0}\n`
      csvContent += `"Customer Repeat Rate (%)",${data.customers?.repeatRatePct || 0}\n`
      csvContent += `"Verified Logins",${data.security?.metrics?.successfulLogins || 0}\n`
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Executive Briefing
  const handlePrintReport = () => {
    window.print()
  }

  const sales = data?.sales || {}
  const inventory = data?.inventory || {}
  const spoilage = data?.spoilage || {}
  const customers = data?.customers || {}
  const security = data?.security || {}

  // Current active report definition
  const currentReportDef = REPORT_CARDS.find((r) => r.key === selectedReport)

  return (
    <div className="space-y-6">
      {/* TOP HEADER & GLOBAL CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Analytics & Business Reports
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {selectedReport ? `Viewing ${currentReportDef?.title}` : 'Select a report tab or card below to view detailed analytics and export data.'}
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
                    dateRange === range && !showCustomPicker ? 'bg-white text-emerald-800 shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {labels[range]}
                </button>
              )
            })}

            {/* Custom Range Button */}
            <button
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                dateRange === 'custom' || showCustomPicker ? 'bg-white text-emerald-800 shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Custom Range 📅
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => {
              if (dateRange === 'custom') fetchReports('custom', customFrom, customTo)
              else fetchReports(dateRange)
            }}
            title="Refresh Live Data"
            className="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          {/* Print Report */}
          <button
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>Print 🖨️</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>Export CSV 📥</span>
          </button>
        </div>
      </div>

      {/* PERSISTENT REPORT SELECTION TABS BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        <button
          onClick={() => setSelectedReport(null)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedReport === null
              ? 'bg-gray-900 text-white shadow-xs font-black'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          All Reports Overview
        </button>

        {REPORT_CARDS.map((card) => {
          const isActive = selectedReport === card.key
          return (
            <button
              key={card.key}
              onClick={() => setSelectedReport(card.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-xs font-black'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {card.shortTitle}
            </button>
          )
        })}
      </div>

      {/* CUSTOM DATE RANGE PICKER DROPDOWN BAR */}
      {showCustomPicker && (
        <form onSubmit={handleApplyCustomRange} className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
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

      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-gray-200 text-center shadow-xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="text-xs text-gray-500 font-bold mt-3">Aggregating live grocery reports...</p>
        </div>
      ) : (
        <>
          {/* VIEW 1: REPORT CARDS HUB (When Overview tab is selected) */}
          {selectedReport === null && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {REPORT_CARDS.map((card, idx) => {
                  const preview = card.getPreview(data)
                  return (
                    <div
                      key={card.key}
                      onClick={() => setSelectedReport(card.key)}
                      className={`group relative flex flex-col justify-between rounded-3xl bg-white p-6 border border-gray-200/80 shadow-xs hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 cursor-pointer overflow-hidden ${
                        idx === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                      }`}
                    >
                      {/* Top section */}
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${card.badgeBg}`}
                          >
                            {card.badgeText}
                          </span>
                          <span className="text-gray-400 group-hover:text-emerald-600 transition-colors font-black text-sm">
                            ➔
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {card.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {card.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Metric Preview Box */}
                      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col justify-between space-y-2">
                        <div>
                          <p className="text-xl font-black text-gray-900 tracking-tight">
                            {preview.primary}
                          </p>
                          <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                            {preview.secondary}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                            {preview.tag}
                          </span>
                          <span className="text-xs font-black text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            View Report ➔
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: INDIVIDUAL ACTIVE REPORT */}
          {selectedReport === 'sales' && <SalesReport sales={sales} />}
          {selectedReport === 'inventory' && <InventoryReport inventory={inventory} />}
          {selectedReport === 'spoilage' && <SpoilageReport spoilage={spoilage} />}
          {selectedReport === 'customers' && <CustomerReport customers={customers} />}
          {selectedReport === 'security' && <SecurityReport security={security} />}
        </>
      )}
    </div>
  )
}
