'use client'

import React, { useState, useEffect } from 'react'

interface SpoilageReportProps {
  spoilage: any
}

type ExpandableWidget = 'horizon' | 'chart' | 'tiers' | 'reasons' | 'batches' | 'ledger' | null

export default function SpoilageReport({ spoilage }: SpoilageReportProps) {
  const [expandedWidget, setExpandedWidget] = useState<ExpandableWidget>(null)
  const [activeLedgerTab, setActiveLedgerTab] = useState<'batches' | 'logs'>('batches')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterHorizonTier, setFilterHorizonTier] = useState('all')

  // Log Food Waste Modal State
  const [showLogModal, setShowLogModal] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [discardQuantity, setDiscardQuantity] = useState(1)
  const [discardReason, setDiscardReason] = useState('expired')
  const [discardNotes, setDiscardNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null)
  const [logErrorMessage, setLogErrorMessage] = useState<string | null>(null)

  const [hoveredTrend, setHoveredTrend] = useState<{
    x: number
    y: number
    label: string
    loss: number
    rescued: number
  } | null>(null)

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedWidget(null)
        setShowLogModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const expiryHorizon = spoilage.expiryHorizon || {
    critical: { label: '1–3 Days (Critical)', days: '1-3', units: 0, valuation: 0, batchCount: 0, color: 'bg-red-500', markdown: '50% Flash Sale' },
    impending: { label: '4–7 Days (Impending)', days: '4-7', units: 0, valuation: 0, batchCount: 0, color: 'bg-amber-500', markdown: '30% Markdown' },
    upcoming: { label: '8–14 Days (Notice)', days: '8-14', units: 0, valuation: 0, batchCount: 0, color: 'bg-blue-500', markdown: '15% Discount' },
    safe: { label: '15+ Days (Fresh)', days: '15+', units: 0, valuation: 0, batchCount: 0, color: 'bg-emerald-500', markdown: 'Full Price' },
  }

  const nearExpiryBatches = spoilage.nearExpiryBatches || []
  const spoilageTrend = spoilage.spoilageTrend || []
  const clearanceTiers = spoilage.clearanceTiers || []
  const reasonBreakdown = spoilage.reasonBreakdown || []
  const departmentSpoilage = spoilage.departmentSpoilage || []
  const recentLogs = spoilage.recentLogs || []
  const productsList = spoilage.productsList || []

  // Total At-Risk Valuation in next 14 days
  const totalAtRiskValuation =
    (Number(expiryHorizon.critical?.valuation) || 0) +
    (Number(expiryHorizon.impending?.valuation) || 0) +
    (Number(expiryHorizon.upcoming?.valuation) || 0)

  const totalAtRiskUnits =
    (Number(expiryHorizon.critical?.units) || 0) +
    (Number(expiryHorizon.impending?.units) || 0) +
    (Number(expiryHorizon.upcoming?.units) || 0)

  // SVG Trend Chart Dimensions (Compact default)
  const svgWidth = 700
  const svgHeight = 190
  const paddingX = 45
  const paddingTop = 25
  const paddingBottom = 40

  const chartWidth = svgWidth - paddingX * 2
  const chartHeight = svgHeight - paddingTop - paddingBottom
  const maxVal = Math.max(
    ...spoilageTrend.map((t: any) => Math.max(Number(t.clearanceRescued) || 0, Number(t.spoilageLoss) || 0)),
    500
  )

  // Filtered near-expiry batches
  const filteredBatches = nearExpiryBatches.filter((b: any) => {
    const matchesSearch = b.productName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = filterCategory === 'all' || b.category.toLowerCase() === filterCategory.toLowerCase()
    const matchesTier =
      filterHorizonTier === 'all' ||
      (filterHorizonTier === 'critical' && b.daysLeft <= 3) ||
      (filterHorizonTier === 'impending' && b.daysLeft > 3 && b.daysLeft <= 7) ||
      (filterHorizonTier === 'upcoming' && b.daysLeft > 7 && b.daysLeft <= 14)
    return matchesSearch && matchesCat && matchesTier
  })

  // Filtered spoilage logs
  const filteredLogs = recentLogs.filter((log: any) => {
    const prodName = log.Product?.name || 'Product'
    const matchesSearch = prodName.toLowerCase().includes(searchQuery.toLowerCase()) || (log.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const uniqueCategories = Array.from(new Set(nearExpiryBatches.map((b: any) => b.category))) as string[]

  // Handle Log Discarded Food Submit
  const handleLogDiscardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId) {
      setLogErrorMessage('Please select a product.')
      return
    }
    if (discardQuantity <= 0) {
      setLogErrorMessage('Quantity must be greater than 0.')
      return
    }

    setIsSubmitting(true)
    setLogErrorMessage(null)
    setLogSuccessMessage(null)

    try {
      const res = await fetch('/api/admin/inventory/spoilage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity: discardQuantity,
          reason: discardReason,
          notes: discardNotes,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record food discard')
      }

      setLogSuccessMessage('Food waste recorded successfully! Stock deducted automatically.')
      setTimeout(() => {
        setShowLogModal(false)
        setLogSuccessMessage(null)
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      setLogErrorMessage(err.message || 'An error occurred while logging food discard.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Spoilage CSV Export
  const handleExportSpoilageCsv = () => {
    if (!recentLogs || recentLogs.length === 0) {
      alert('No spoilage records to export.')
      return
    }

    const headers = ['Date Discarded', 'Product Name', 'Category', 'Reason', 'Units Discarded', 'Cost Price (PHP)', 'Total Loss (PHP)', 'Discarded By', 'Notes']
    const rows = recentLogs.map((l: any) => [
      new Date(l.createdAt).toLocaleDateString('en-PH'),
      `"${(l.Product?.name || 'Product').replace(/"/g, '""')}"`,
      l.Product?.category || 'general',
      l.reason || 'Expired',
      l.quantity,
      Number(l.costPrice || 0).toFixed(2),
      Number(l.totalLossValuation || 0).toFixed(2),
      `"${(l.discardedBy || 'Admin').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FreshCart_Food_Spoilage_Audit_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* ACTION BAR: LOG SPOILAGE & EXPORT CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h3 className="text-xs font-black text-gray-900">Perishable Management & Food Waste Control</h3>
          <p className="text-[10px] text-gray-400">Proactively rescue near-expiry inventory and record physical spoilage</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (productsList.length > 0 && !selectedProductId) {
                setSelectedProductId(productsList[0].id)
              }
              setShowLogModal(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <span>+ Log Food Discard</span>
          </button>

          <button
            onClick={handleExportSpoilageCsv}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Export Waste CSV 📥</span>
          </button>
        </div>
      </div>

      {/* 1. TOP KPI FINANCIAL IMPACT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-red-200 bg-red-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-700">Total Food Waste Loss</p>
          <p className="text-xl font-black text-red-600 mt-0.5">
            ₱{Number(spoilage.totalSpoilageLoss || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-red-700/80 mt-0.5">
            {Number(spoilage.totalUnitsSpoiled || 0).toLocaleString('en-PH')} units discarded
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Clearance Revenue Rescued</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            ₱{Number(spoilage.clearanceRevenueRescued || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Recovered via dynamic discounts</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">At-Risk Near-Expiry Stock</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">
            ₱{Number(totalAtRiskValuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-amber-700/80 mt-0.5">
            {totalAtRiskUnits} units expiring within 14 days
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-200 bg-blue-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Perishable Recovery Rate</p>
          <p className="text-xl font-black text-blue-700 mt-0.5">{spoilage.rescueRatioPct || 85}%</p>
          <p className="text-[10px] text-blue-700/80 mt-0.5">Avoided waste vs total potential loss</p>
        </div>
      </div>

      {/* 2. COMPACT MODULAR 2-COLUMN WIDGET GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* WIDGET 1: Expiration Risk Horizon (1–3d, 4–7d, 8–14d) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Expiration Risk Horizon</h3>
                <p className="text-[10px] text-gray-400">Inventory timeline breakdown of upcoming product expirations</p>
              </div>
              <button
                onClick={() => setExpandedWidget('horizon')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mt-3">
              {/* Critical Tier */}
              <div className="p-3 rounded-xl bg-red-50/60 border border-red-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-red-800">1–3 Days</span>
                  <span className="text-[9px] font-extrabold bg-red-100 text-red-800 px-1 py-0.2 rounded">
                    50% Flash
                  </span>
                </div>
                <p className="text-base font-black text-red-700">
                  {expiryHorizon.critical?.units || 0} <span className="text-[10px] font-normal text-red-600">units</span>
                </p>
                <p className="text-[10px] text-red-700/80 font-mono">
                  ₱{Number(expiryHorizon.critical?.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>

              {/* Impending Tier */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-800">4–7 Days</span>
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
                    30% Off
                  </span>
                </div>
                <p className="text-base font-black text-amber-700">
                  {expiryHorizon.impending?.units || 0} <span className="text-[10px] font-normal text-amber-600">units</span>
                </p>
                <p className="text-[10px] text-amber-700/80 font-mono">
                  ₱{Number(expiryHorizon.impending?.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>

              {/* Upcoming Notice Tier */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-800">8–14 Days</span>
                  <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-1 py-0.2 rounded">
                    15% Off
                  </span>
                </div>
                <p className="text-base font-black text-blue-700">
                  {expiryHorizon.upcoming?.units || 0} <span className="text-[10px] font-normal text-blue-600">units</span>
                </p>
                <p className="text-[10px] text-blue-700/80 font-mono">
                  ₱{Number(expiryHorizon.upcoming?.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Safe Stock (&gt;14d): {Number(expiryHorizon.safe?.units || 0).toLocaleString('en-PH')} units</span>
            <span className="text-amber-700 font-bold">Proactive Markdown Ready</span>
          </div>
        </div>

        {/* WIDGET 2: Spoilage Loss vs Clearance Rescued Trend */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Waste Loss vs Clearance Rescued</h3>
                <p className="text-[10px] text-gray-400">Financial comparison across the selected timeframe</p>
              </div>
              <button
                onClick={() => setExpandedWidget('chart')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            {/* Dual Trend Chart */}
            <div className="relative w-full overflow-hidden mt-3">
              {hoveredTrend && (
                <div
                  className="absolute z-30 pointer-events-none bg-gray-900 text-white rounded-xl py-2 px-3 text-[10px] shadow-xl transition-all border border-gray-700"
                  style={{
                    left: `${(hoveredTrend.x / svgWidth) * 100}%`,
                    top: `${(hoveredTrend.y / svgHeight) * 100}%`,
                    transform: 'translate(-50%, -125%)',
                  }}
                >
                  <p className="text-gray-300 text-[9px] font-bold">{hoveredTrend.label}</p>
                  <p className="font-black text-emerald-400 mt-0.5">
                    Rescued: ₱{hoveredTrend.rescued.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="font-black text-red-400">
                    Loss: ₱{hoveredTrend.loss.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-44 overflow-visible"
                onMouseLeave={() => setHoveredTrend(null)}
              >
                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = paddingTop + chartHeight * (1 - ratio)
                  const val = Math.round(maxVal * ratio)
                  return (
                    <g key={idx}>
                      <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#F3F4F6" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={paddingX - 8} y={y + 3} textAnchor="end" className="text-[8px] fill-gray-400 font-mono">
                        ₱{val.toLocaleString('en-PH')}
                      </text>
                    </g>
                  )
                })}

                {spoilageTrend.map((item: any, idx: number) => {
                  const count = spoilageTrend.length || 1
                  const totalW = chartWidth
                  const bW = Math.max(Math.min((totalW / count) - 16, 24), 10)
                  const groupX = paddingX + idx * (totalW / count) + (totalW / count - (bW * 2 + 4)) / 2

                  const rescuedH = Math.max(Math.round((item.clearanceRescued / maxVal) * chartHeight), 4)
                  const lossH = Math.max(Math.round((item.spoilageLoss / maxVal) * chartHeight), 4)

                  const rescuedY = paddingTop + chartHeight - rescuedH
                  const lossY = paddingTop + chartHeight - lossH

                  return (
                    <g key={idx} className="cursor-pointer">
                      <rect
                        x={groupX}
                        y={rescuedY}
                        width={bW}
                        height={rescuedH}
                        rx={3}
                        fill="#10B981"
                        opacity={hoveredTrend?.label === item.label ? 1 : 0.85}
                        onMouseEnter={() =>
                          setHoveredTrend({
                            x: groupX + bW,
                            y: Math.min(rescuedY, lossY),
                            label: item.label,
                            loss: item.spoilageLoss,
                            rescued: item.clearanceRescued,
                          })
                        }
                      />
                      <rect
                        x={groupX + bW + 3}
                        y={lossY}
                        width={bW}
                        height={lossH}
                        rx={3}
                        fill="#EF4444"
                        opacity={hoveredTrend?.label === item.label ? 1 : 0.85}
                        onMouseEnter={() =>
                          setHoveredTrend({
                            x: groupX + bW,
                            y: Math.min(rescuedY, lossY),
                            label: item.label,
                            loss: item.spoilageLoss,
                            rescued: item.clearanceRescued,
                          })
                        }
                      />
                      <rect
                        x={groupX - 4}
                        y={paddingTop}
                        width={bW * 2 + 12}
                        height={chartHeight}
                        fill="transparent"
                        onMouseEnter={() =>
                          setHoveredTrend({
                            x: groupX + bW,
                            y: Math.min(rescuedY, lossY),
                            label: item.label,
                            loss: item.spoilageLoss,
                            rescued: item.clearanceRescued,
                          })
                        }
                      />
                      <text
                        x={groupX + bW + 1.5}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        className="text-[8.5px] fill-gray-400 font-bold"
                      >
                        {item.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Rescued
              </span>
              <span className="flex items-center gap-1 text-[10px] text-red-600">
                <span className="h-2 w-2 rounded-full bg-red-500"></span> Loss
              </span>
            </div>
            <span className="text-emerald-700 font-black">Net Rescued: +{spoilage.rescueRatioPct || 85}%</span>
          </div>
        </div>

        {/* WIDGET 3: Dynamic Clearance Markdown Tiers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Clearance Markdown Tiers</h3>
                <p className="text-[10px] text-gray-400">Revenue recovered across dynamic discount levels</p>
              </div>
              <button
                onClick={() => setExpandedWidget('tiers')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {clearanceTiers.map((t: any) => (
                <div key={t.tier} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-900">{t.tier}</span>
                    <span className="text-gray-900 font-black">
                      ₱{Number(t.rescuedRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-emerald-700 font-extrabold ml-1">({t.sharePct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div style={{ width: `${t.sharePct}%` }} className={`h-full ${t.color} rounded-full`}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                    <span>{t.unitsRescued} units sold before expiry</span>
                    <span>{t.discountPct}% Discount Tier</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>3 Dynamic Clearance Tiers</span>
            <span className="text-emerald-700 font-bold">Automated Markdown Engine</span>
          </div>
        </div>

        {/* WIDGET 4: Discard Root Causes & Department Waste */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Discard Reasons & Department Waste</h3>
                <p className="text-[10px] text-gray-400">Causes of inventory loss & department shares</p>
              </div>
              <button
                onClick={() => setExpandedWidget('reasons')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {reasonBreakdown.slice(0, 3).map((r: any) => (
                <div key={r.reason} className="p-2 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    <span className="capitalize font-bold text-gray-900">{r.reason}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-red-600 block">₱{Number(r.loss).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    <span className="text-[10px] text-gray-400">{r.units} units ({r.count} logs)</span>
                  </div>
                </div>
              ))}
              {reasonBreakdown.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4 text-center">No waste incidents recorded in this period.</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Root Cause Tracking</span>
            <span className="text-red-600 font-bold">Waste Prevention</span>
          </div>
        </div>
      </div>

      {/* 3. FULL-WIDTH TABBED NEAR-EXPIRY BATCHES & DISCARD LEDGER BOX */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveLedgerTab('batches')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeLedgerTab === 'batches'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              At-Risk Near-Expiry Batches ({nearExpiryBatches.length})
            </button>
            <button
              onClick={() => setActiveLedgerTab('logs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeLedgerTab === 'logs'
                  ? 'bg-red-100 text-red-900 border border-red-300'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Recent Discarded Food Logs ({recentLogs.length})
            </button>
          </div>

          <button
            onClick={() => setExpandedWidget(activeLedgerTab === 'batches' ? 'batches' : 'ledger')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer self-end sm:self-auto"
          >
            <span>Full View & Audit ⤢</span>
          </button>
        </div>

        {/* Tab 1: Near Expiry Batches */}
        {activeLedgerTab === 'batches' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-2.5">Product Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Units on Hand</th>
                  <th className="px-4 py-2.5">Days to Expiry</th>
                  <th className="px-4 py-2.5">Recommended Markdown</th>
                  <th className="px-5 py-2.5 text-right">At-Risk Value (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {nearExpiryBatches.slice(0, 5).map((b: any) => (
                  <tr key={b.batchId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-2.5 font-bold text-gray-900">{b.productName}</td>
                    <td className="px-4 py-2.5">
                      <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                        {b.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-gray-900">
                      {b.quantity} {b.unit}s
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        b.daysLeft <= 3 ? 'bg-red-50 text-red-700 border-red-200' :
                        b.daysLeft <= 7 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {b.daysLeft === 0 ? 'Expires Today' : `${b.daysLeft} days left`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                        b.daysLeft <= 3 ? 'bg-red-100 text-red-800' :
                        b.daysLeft <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {b.markdownTier}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-black text-gray-900">
                      ₱{Number(b.totalValuation).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {nearExpiryBatches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-gray-400 italic">
                      All active stock has safe shelf-life (&gt;14 days). Zero near-expiry risk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Discard Logs */}
        {activeLedgerTab === 'logs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-2.5">Date Discarded</th>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5 text-right">Units Discarded</th>
                  <th className="px-5 py-2.5 text-right">Financial Loss (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLogs.slice(0, 5).map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-2.5 text-gray-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-gray-900">{log.Product?.name || 'Product'}</td>
                    <td className="px-4 py-2.5">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-[10px] border border-red-200">
                        {log.reason}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-800">
                      {Number(log.quantity).toLocaleString('en-PH')}
                    </td>
                    <td className="px-5 py-2.5 text-right font-black text-red-600">
                      ₱{Number(log.totalLossValuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-400 italic">
                      No spoilage records in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <button
            onClick={() => setExpandedWidget(activeLedgerTab === 'batches' ? 'batches' : 'ledger')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            {activeLedgerTab === 'batches'
              ? `View All ${nearExpiryBatches.length} At-Risk Batches in Full View ➔`
              : `View All ${recentLogs.length} Spoilage Records in Full View ➔`}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL: LOG FOOD DISCARD / SPOILAGE MODAL              */}
      {/* ======================================================== */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
              <div>
                <h3 className="text-sm font-black text-red-950">Log Food Spoilage & Discard</h3>
                <p className="text-xs text-red-700/80 mt-0.5">Deduct physical waste and record to the financial audit log</p>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogDiscardSubmit} className="p-6 space-y-4">
              {logErrorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold">
                  {logErrorMessage}
                </div>
              )}
              {logSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold">
                  {logSuccessMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium focus:border-red-500 focus:outline-none"
                  required
                >
                  {productsList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantity Discarded</label>
                  <input
                    type="number"
                    min="1"
                    value={discardQuantity}
                    onChange={(e) => setDiscardQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Discard Reason</label>
                  <select
                    value={discardReason}
                    onChange={(e) => setDiscardReason(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium focus:border-red-500 focus:outline-none"
                  >
                    <option value="expired">Expired on Shelf</option>
                    <option value="bruised_produce">Bruised / Moldy Produce</option>
                    <option value="damaged_packaging">Damaged Packaging</option>
                    <option value="cold_chain_failure">Cold Chain Failure</option>
                    <option value="other">Dropped / Handling Loss</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Optional Notes / Staff Details</label>
                <textarea
                  value={discardNotes}
                  onChange={(e) => setDiscardNotes(e.target.value)}
                  placeholder="e.g. Found during morning produce inspection..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Discard & Deduct'}
                </button>
              </div>
            </form>
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
                  {expandedWidget === 'horizon' && 'Full View: Expiration Risk Horizon & Shelf-Life Radar'}
                  {expandedWidget === 'chart' && 'Full View: Waste Loss vs Clearance Rescued Analytics'}
                  {expandedWidget === 'tiers' && 'Full View: Clearance Markdown Tiers (15%, 30%, 50%)'}
                  {expandedWidget === 'reasons' && 'Full View: Food Discard & Spoilage Reasons Breakdown'}
                  {expandedWidget === 'batches' && 'Full View: At-Risk Near-Expiry Inventory Batches'}
                  {expandedWidget === 'ledger' && 'Full View: Itemized Spoilage & Damaged Food Ledger'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detailed perishable analytics and proactive food waste management
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
              {/* MODAL: EXPANDED BATCHES */}
              {expandedWidget === 'batches' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Search product name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none w-full sm:w-72"
                    />

                    <div className="flex items-center gap-2">
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer capitalize"
                      >
                        <option value="all">All Categories</option>
                        {uniqueCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <select
                        value={filterHorizonTier}
                        onChange={(e) => setFilterHorizonTier(e.target.value)}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer"
                      >
                        <option value="all">All Expiry Windows</option>
                        <option value="critical">1–3 Days (Critical 50%)</option>
                        <option value="impending">4–7 Days (Impending 30%)</option>
                        <option value="upcoming">8–14 Days (Notice 15%)</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3">Product Name</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Units on Hand</th>
                          <th className="px-4 py-3">Days Left</th>
                          <th className="px-4 py-3">Recommended Markdown</th>
                          <th className="px-5 py-3 text-right">At-Risk Value (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredBatches.map((b: any) => (
                          <tr key={b.batchId} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3 font-bold text-gray-900">{b.productName}</td>
                            <td className="px-4 py-3">
                              <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                                {b.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-gray-900">
                              {b.quantity} {b.unit}s
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                b.daysLeft <= 3 ? 'bg-red-50 text-red-700 border-red-200' :
                                b.daysLeft <= 7 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {b.daysLeft === 0 ? 'Expires Today' : `${b.daysLeft} days remaining`}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                                b.daysLeft <= 3 ? 'bg-red-100 text-red-800' :
                                b.daysLeft <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {b.markdownTier}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-black text-gray-900">
                              ₱{Number(b.totalValuation).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {filteredBatches.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">
                              No near-expiry inventory batches matching the filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODAL: HORIZON RADAR */}
              {expandedWidget === 'horizon' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl border border-red-200 bg-red-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-red-900 text-sm">Critical Window (1–3 Days)</span>
                        <span className="text-xs font-black text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                          50% Flash Sale
                        </span>
                      </div>
                      <p className="text-2xl font-black text-red-700">
                        {expiryHorizon.critical?.units || 0} units
                      </p>
                      <p className="text-xs text-red-600 font-bold">
                        Valuation: ₱{Number(expiryHorizon.critical?.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-gray-500">Requires immediate 50% clearance flash markdown</p>
                    </div>

                    <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-900 text-sm">Impending Window (4–7 Days)</span>
                        <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          30% Markdown
                        </span>
                      </div>
                      <p className="text-2xl font-black text-amber-700">
                        {expiryHorizon.impending?.units || 0} units
                      </p>
                      <p className="text-xs text-amber-600 font-bold">
                        Valuation: ₱{Number(expiryHorizon.impending?.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-gray-500">Apply 30% near-expiry discount badge</p>
                    </div>

                    <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-blue-900 text-sm">Notice Window (8–14 Days)</span>
                        <span className="text-xs font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                          15% Discount
                        </span>
                      </div>
                      <p className="text-2xl font-black text-blue-700">
                        {expiryHorizon.upcoming?.units || 0} units
                      </p>
                      <p className="text-xs text-blue-600 font-bold">
                        Valuation: ₱{Number(expiryHorizon.upcoming?.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-gray-500">Display in clearance produce section</p>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: TREND CHART */}
              {expandedWidget === 'chart' && (
                <div className="border border-gray-200 rounded-2xl p-6 bg-white overflow-x-auto">
                  <svg viewBox={`0 0 ${svgWidth + 100} ${svgHeight + 50}`} className="w-full h-80 min-w-[700px]">
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const y = paddingTop + (chartHeight + 30) * (1 - ratio)
                      const val = Math.round(maxVal * ratio)
                      return (
                        <g key={idx}>
                          <line x1={paddingX} y1={y} x2={svgWidth + 100 - paddingX} y2={y} stroke="#F3F4F6" strokeDasharray="4 4" />
                          <text x={paddingX - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-gray-400 font-mono">
                            ₱{val.toLocaleString('en-PH')}
                          </text>
                        </g>
                      )
                    })}

                    {spoilageTrend.map((item: any, idx: number) => {
                      const count = spoilageTrend.length || 1
                      const totalW = svgWidth + 100 - paddingX * 2
                      const bW = Math.max(Math.min((totalW / count) - 20, 36), 14)
                      const groupX = paddingX + idx * (totalW / count) + (totalW / count - (bW * 2 + 6)) / 2

                      const rescuedH = Math.max(Math.round((item.clearanceRescued / maxVal) * (chartHeight + 30)), 4)
                      const lossH = Math.max(Math.round((item.spoilageLoss / maxVal) * (chartHeight + 30)), 4)

                      const rescuedY = paddingTop + (chartHeight + 30) - rescuedH
                      const lossY = paddingTop + (chartHeight + 30) - lossH

                      return (
                        <g key={idx}>
                          <rect x={groupX} y={rescuedY} width={bW} height={rescuedH} rx={4} fill="#10B981" />
                          <rect x={groupX + bW + 4} y={lossY} width={bW} height={lossH} rx={4} fill="#EF4444" />
                          <text x={groupX + bW + 2} y={svgHeight + 46} textAnchor="middle" className="text-[9px] fill-gray-500 font-bold">
                            {item.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
              )}

              {/* MODAL: TIERS */}
              {expandedWidget === 'tiers' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {clearanceTiers.map((t: any) => (
                    <div key={t.tier} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-gray-900 text-sm">{t.tier}</span>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {t.sharePct}% Share
                        </span>
                      </div>
                      <p className="text-2xl font-black text-emerald-700 mt-1">
                        ₱{Number(t.rescuedRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">{t.unitsRescued} units sold before expiration</p>
                    </div>
                  ))}
                </div>
              )}

              {/* MODAL: REASONS */}
              {expandedWidget === 'reasons' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reasonBreakdown.map((r: any) => (
                    <div key={r.reason} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="capitalize font-black text-gray-900 text-sm">{r.reason}</span>
                        <span className="text-xs font-black text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                          {r.count} incidents
                        </span>
                      </div>
                      <p className="text-2xl font-black text-red-600 mt-1">
                        ₱{Number(r.loss).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">{r.units} physical units discarded</p>
                    </div>
                  ))}
                </div>
              )}

              {/* MODAL: DISCARD LEDGER */}
              {expandedWidget === 'ledger' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Search product or discard notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none w-full sm:w-72"
                  />

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3">Date Discarded</th>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Reason</th>
                          <th className="px-4 py-3 text-right">Units Discarded</th>
                          <th className="px-5 py-3 text-right">Financial Loss (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3 text-gray-500 font-mono text-[11px]">
                              {new Date(log.createdAt).toLocaleDateString('en-PH', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">{log.Product?.name || 'Product'}</td>
                            <td className="px-4 py-3">
                              <span className="capitalize px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-[10px] border border-red-200">
                                {log.reason}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-800">
                              {Number(log.quantity).toLocaleString('en-PH')}
                            </td>
                            <td className="px-5 py-3 text-right font-black text-red-600">
                              ₱{Number(log.totalLossValuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                              No spoilage records found.
                            </td>
                          </tr>
                        )}
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
