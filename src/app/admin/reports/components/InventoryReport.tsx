'use client'

import React, { useState, useEffect } from 'react'

interface InventoryReportProps {
  inventory: any
}

type ExpandableWidget = 'barChart' | 'categories' | 'bestSellers' | 'slowMovers' | 'ledger' | null
type BarFilterMode = 'top' | 'low' | 'all'

export default function InventoryReport({ inventory }: InventoryReportProps) {
  const [expandedWidget, setExpandedWidget] = useState<ExpandableWidget>(null)
  const [barFilter, setBarFilter] = useState<BarFilterMode>('top')
  const [searchLedger, setSearchLedger] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchModalBar, setSearchModalBar] = useState('')
  const [modalBarCategory, setModalBarCategory] = useState('all')
  const [hoveredBar, setHoveredBar] = useState<{
    x: number
    y: number
    name: string
    category: string
    stock: number
    unit: string
    valuation: number
    status: string
  } | null>(null)

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedWidget(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const categoryStockValuation = inventory.categoryStockValuation || []
  const bestSellers = inventory.bestSellers || []
  const slowMovers = inventory.slowMovers || []
  const allInventoryItems = inventory.allInventoryItems || []
  const health = inventory.stockHealthSummary || { healthyCount: 0, lowStockCount: 0, outOfStockCount: 0 }

  // Determine items for the compact widget bar graph based on barFilter
  const displayBarItems = [...allInventoryItems]
    .sort((a, b) => (barFilter === 'low' ? a.stock - b.stock : b.stock - a.stock))
    .slice(0, 10)

  // Bar Graph SVG Dimensions (Compact default)
  const svgWidth = 700
  const svgHeight = 210
  const paddingX = 45
  const paddingTop = 30
  const paddingBottom = 45

  const chartWidth = svgWidth - paddingX * 2
  const chartHeight = svgHeight - paddingTop - paddingBottom
  const maxStock = Math.max(...displayBarItems.map((item: any) => Number(item.stock) || 0), 20)

  // Bar width calculation
  const barCount = displayBarItems.length || 1
  const barWidth = Math.max(Math.min((chartWidth / barCount) - 14, 38), 18)

  // Reorder threshold line Y coordinate (at 10 units)
  const reorderThreshold = 10
  const reorderY = paddingTop + chartHeight - (Math.min(reorderThreshold, maxStock) / maxStock) * chartHeight

  // Filtered master ledger items
  const filteredLedger = allInventoryItems.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchLedger.toLowerCase())
    const matchesCat = filterCategory === 'all' || item.category.toLowerCase() === filterCategory.toLowerCase()
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus
    return matchesSearch && matchesCat && matchesStatus
  })

  // Filtered items for the modal bar chart
  const modalFilteredBarItems = allInventoryItems.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchModalBar.toLowerCase())
    const matchesCat = modalBarCategory === 'all' || item.category.toLowerCase() === modalBarCategory.toLowerCase()
    return matchesSearch && matchesCat
  })

  const uniqueCategories = Array.from(new Set(allInventoryItems.map((i: any) => i.category))) as string[]

  const handleExportInventoryCsv = () => {
    if (!allInventoryItems || allInventoryItems.length === 0) {
      alert('No inventory items to export.')
      return
    }

    const headers = ['Product Name', 'Category', 'Unit', 'Stock on Hand', 'Status', 'Unit Cost (PHP)', 'Retail Price (PHP)', 'Stock Valuation (PHP)']
    const rows = allInventoryItems.map((item: any) => [
      `"${item.name.replace(/"/g, '""')}"`,
      item.category,
      item.unit,
      item.stock,
      item.status,
      Number(item.costPrice || 0).toFixed(2),
      Number(item.basePrice || 0).toFixed(2),
      Number(item.valuation || 0).toFixed(2),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FreshCart_Inventory_Stock_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* ACTION BAR: EXPORT INVENTORY CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h3 className="text-xs font-black text-gray-900">Inventory Valuation & Stock Levels Ledger</h3>
          <p className="text-[10px] text-gray-400">Warehouse stock valuation, fast-moving items, and stockout prevention</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportInventoryCsv}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Export Stock CSV 📥</span>
          </button>
        </div>
      </div>

      {/* 1. TOP KPI INVENTORY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Total Stock on Hand</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            {Number(inventory.totalStockOnHand || 0).toLocaleString('en-PH')}{' '}
            <span className="text-xs font-bold text-gray-400">units</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Physical units available in warehouse</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Total Stock Valuation</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">
            ₱{Number(inventory.totalStockValuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Based on supplier purchase cost</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Active Grocery SKUs</p>
          <p className="text-xl font-black text-blue-700 mt-0.5">
            {Number(inventory.totalSkus || 0).toLocaleString('en-PH')}{' '}
            <span className="text-xs font-bold text-gray-400">products</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Catalog product lines</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Stock Health Alerts</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
              {health.healthyCount} Healthy
            </span>
            <span className="text-xs font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
              {health.lowStockCount} Low
            </span>
            <span className="text-xs font-black text-red-700 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200">
              {health.outOfStockCount} Out
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Reorder Threshold: 10 units</p>
        </div>
      </div>

      {/* 2. COMPACT MODULAR 2-COLUMN WIDGET GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* WIDGET 1: Enhanced Stock on Hand Bar Graph */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-gray-900">Stock Levels per Item</h3>
                {/* Bar Filter Switcher */}
                <div className="flex items-center rounded-lg bg-gray-100 p-0.5 text-[10px] font-bold">
                  <button
                    onClick={() => setBarFilter('top')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      barFilter === 'top' ? 'bg-white text-emerald-700 font-black shadow-2xs' : 'text-gray-500'
                    }`}
                  >
                    Top Stocked
                  </button>
                  <button
                    onClick={() => setBarFilter('low')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      barFilter === 'low' ? 'bg-white text-amber-700 font-black shadow-2xs' : 'text-gray-500'
                    }`}
                  >
                    Low & Critical
                  </button>
                </div>
              </div>

              <button
                onClick={() => setExpandedWidget('barChart')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200 self-end sm:self-auto"
              >
                Full View ⤢
              </button>
            </div>

            {/* Compact SVG Bar Graph */}
            <div className="relative w-full overflow-hidden mt-3">
              {hoveredBar && (
                <div
                  className="absolute z-30 pointer-events-none bg-gray-900 text-white rounded-xl py-2 px-3 text-[10px] shadow-xl transition-all border border-gray-700"
                  style={{
                    left: `${(hoveredBar.x / svgWidth) * 100}%`,
                    top: `${(hoveredBar.y / svgHeight) * 100}%`,
                    transform: 'translate(-50%, -125%)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-gray-700">
                    <span className="font-extrabold text-white">{hoveredBar.name}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                      hoveredBar.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-300' :
                      hoveredBar.status === 'low_stock' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {hoveredBar.status === 'healthy' ? 'Healthy' : hoveredBar.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  <p className="font-black text-emerald-400 text-xs mt-1">
                    {hoveredBar.stock} {hoveredBar.unit}s available
                  </p>
                  <p className="text-gray-400 text-[9px]">
                    Valuation: ₱{hoveredBar.valuation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-48 overflow-visible"
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Horizontal Gridlines */}
                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = paddingTop + chartHeight * (1 - ratio)
                  const val = Math.round(maxStock * ratio)
                  return (
                    <g key={idx}>
                      <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#F3F4F6" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={paddingX - 8} y={y + 3} textAnchor="end" className="text-[8px] fill-gray-400 font-mono">
                        {val}
                      </text>
                    </g>
                  )
                })}

                {/* Safe Reorder Threshold Guideline (10 units) */}
                {maxStock >= 10 && (
                  <g>
                    <line
                      x1={paddingX}
                      y1={reorderY}
                      x2={svgWidth - paddingX}
                      y2={reorderY}
                      stroke="#F59E0B"
                      strokeDasharray="4 4"
                      strokeWidth="1.2"
                      opacity="0.8"
                    />
                    <text
                      x={svgWidth - paddingX}
                      y={reorderY - 4}
                      textAnchor="end"
                      className="text-[8px] fill-amber-700 font-extrabold"
                    >
                      Safe Reorder Level (10 units)
                    </text>
                  </g>
                )}

                {/* SVG Bars & Stock Numbers */}
                {displayBarItems.map((item: any, idx: number) => {
                  const x = paddingX + idx * (chartWidth / barCount) + (chartWidth / barCount - barWidth) / 2
                  const stockH = Math.max(Math.round((item.stock / maxStock) * chartHeight), item.stock > 0 ? 6 : 2)
                  const y = paddingTop + chartHeight - stockH
                  const isHovered = hoveredBar?.name === item.name
                  const barColor = item.stock === 0 ? '#EF4444' : item.stock <= 10 ? '#F59E0B' : '#10B981'

                  return (
                    <g key={item.id} className="cursor-pointer">
                      {/* Column Hover Background */}
                      {isHovered && (
                        <rect
                          x={x - 4}
                          y={paddingTop}
                          width={barWidth + 8}
                          height={chartHeight}
                          fill="#F9FAFB"
                          rx={6}
                        />
                      )}

                      {/* Main Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={stockH}
                        rx={4}
                        fill={barColor}
                        opacity={isHovered ? 1 : 0.9}
                        className="transition-all duration-150"
                        onMouseEnter={() =>
                          setHoveredBar({
                            x: x + barWidth / 2,
                            y,
                            name: item.name,
                            category: item.category,
                            stock: item.stock,
                            unit: item.unit,
                            valuation: item.valuation,
                            status: item.status,
                          })
                        }
                      />

                      {/* Stock Value Directly Above Bar */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                        className={`text-[9px] font-black ${
                          item.stock === 0 ? 'fill-red-600' : item.stock <= 10 ? 'fill-amber-600' : 'fill-gray-700'
                        }`}
                      >
                        {item.stock}
                      </text>

                      {/* Hit Target */}
                      <rect
                        x={x - 6}
                        y={paddingTop}
                        width={barWidth + 12}
                        height={chartHeight}
                        fill="transparent"
                        onMouseEnter={() =>
                          setHoveredBar({
                            x: x + barWidth / 2,
                            y,
                            name: item.name,
                            category: item.category,
                            stock: item.stock,
                            unit: item.unit,
                            valuation: item.valuation,
                            status: item.status,
                          })
                        }
                      />

                      {/* Shortened Product Label */}
                      <text
                        x={x + barWidth / 2}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        className={`text-[8.5px] font-bold ${isHovered ? 'fill-emerald-800 font-black' : 'fill-gray-500'}`}
                      >
                        {item.name.slice(0, 8)}..
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Peak Level: {maxStock} units</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Healthy
              </span>
              <span className="flex items-center gap-1 text-[10px] text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span> Low
              </span>
              <span className="flex items-center gap-1 text-[10px] text-red-700">
                <span className="h-2 w-2 rounded-full bg-red-500"></span> Out
              </span>
            </div>
          </div>
        </div>

        {/* WIDGET 2: Category Stock Valuation & Share */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Category Stock Valuation</h3>
                <p className="text-[10px] text-gray-400">Warehouse capital and units share per department</p>
              </div>
              <button
                onClick={() => setExpandedWidget('categories')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {categoryStockValuation.slice(0, 4).map((c: any) => (
                <div key={c.category} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="capitalize text-gray-900 font-extrabold">{c.category}</span>
                    <span className="text-gray-900 font-black">
                      ₱{Number(c.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-blue-700 font-extrabold ml-1">({c.percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div style={{ width: `${c.percentage}%` }} className="h-full bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                    <span>{Number(c.units).toLocaleString('en-PH')} units</span>
                    <span>{c.productCount} SKUs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>{categoryStockValuation.length} Active Departments</span>
            <span className="text-blue-700">Valuation Distribution</span>
          </div>
        </div>

        {/* WIDGET 3: Top 10 Fastest-Moving Best Sellers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Fastest-Moving Grocery Items</h3>
                <p className="text-[10px] text-gray-400">Ranked by volume of units sold</p>
              </div>
              <button
                onClick={() => setExpandedWidget('bestSellers')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {bestSellers.slice(0, 3).map((item: any, idx: number) => (
                <div key={item.productId} className="p-2 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center text-[10px] font-black shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900 truncate max-w-[170px]">{item.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-blue-700 block">{item.unitsSold} {item.unit}s</span>
                    <span className="text-[10px] text-gray-400 font-mono">₱{Number(item.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
              {bestSellers.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4 text-center">No sales recorded in this period.</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Leaderboard</span>
            <span className="text-emerald-700">High Velocity</span>
          </div>
        </div>

        {/* WIDGET 4: Slow-Moving / Stagnant Stock */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Slow-Moving Stagnant Stock</h3>
                <p className="text-[10px] text-gray-400">Zero sales in period with capital tied up</p>
              </div>
              <button
                onClick={() => setExpandedWidget('slowMovers')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {slowMovers.slice(0, 3).map((item: any) => (
                <div key={item.productId} className="p-2 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-gray-900 truncate max-w-[180px]">{item.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-700 block">{item.currentStock} {item.unit}s</span>
                    <span className="text-[10px] text-gray-400 font-mono">₱{Number(item.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
              {slowMovers.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4 text-center">All items have sales activity.</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>{slowMovers.length} Stagnant Items</span>
            <span className="text-amber-700">Promotion Candidates</span>
          </div>
        </div>
      </div>

      {/* 3. FULL-WIDTH COMPACT MASTER INVENTORY LEDGER BOX */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-xs font-black text-gray-900 flex items-center gap-2">
              <span>Master Inventory Stock Ledger</span>
              <span className="text-[9px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">
                {allInventoryItems.length} Total SKUs
              </span>
            </h3>
            <p className="text-[10px] text-gray-400">Overview of all active grocery catalog items, stock on hand, and valuations</p>
          </div>

          <button
            onClick={() => setExpandedWidget('ledger')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
          >
            <span>Full View & Audit ⤢</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-5 py-2.5">Product Name</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5 text-right">Stock on Hand</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Valuation (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allInventoryItems.slice(0, 5).map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-2.5 font-bold text-gray-900">{item.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-gray-900">
                    {item.stock} {item.unit}s
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      item.status === 'low_stock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {item.status === 'healthy' ? 'Healthy' : item.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-black text-gray-900">
                    ₱{Number(item.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <button
            onClick={() => setExpandedWidget('ledger')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            View All {allInventoryItems.length} Products in Full View ➔
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. EXPAND / FULL VIEW FOCUSED MODAL OVERLAY               */}
      {/* ======================================================== */}
      {expandedWidget !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-base font-black text-gray-900">
                  {expandedWidget === 'barChart' && 'Full View: Stock on Hand Bar Graph per Item'}
                  {expandedWidget === 'categories' && 'Full View: Category Stock Valuation & Warehouse Shares'}
                  {expandedWidget === 'bestSellers' && 'Full View: Top 10 Fastest-Moving Grocery Items'}
                  {expandedWidget === 'slowMovers' && 'Full View: Slow-Moving / Stagnant Stock Analysis'}
                  {expandedWidget === 'ledger' && 'Full View: Master Inventory Stock Ledger'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detailed inventory analytics and complete stock audit data
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
              {/* MODAL 1: EXPANDED BAR GRAPH */}
              {expandedWidget === 'barChart' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Filter product in chart..."
                      value={searchModalBar}
                      onChange={(e) => setSearchModalBar(e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none w-full sm:w-64"
                    />

                    <div className="flex items-center gap-2">
                      <select
                        value={modalBarCategory}
                        onChange={(e) => setModalBarCategory(e.target.value)}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white font-medium cursor-pointer capitalize"
                      >
                        <option value="all">All Categories</option>
                        {uniqueCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                        {modalFilteredBarItems.length} Products
                      </span>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl p-6 bg-white overflow-x-auto">
                    <svg
                      viewBox={`0 0 ${Math.max(modalFilteredBarItems.length * 52, 700)} ${svgHeight + 70}`}
                      className="w-full h-80 min-w-[700px]"
                    >
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = paddingTop + (chartHeight + 40) * (1 - ratio)
                        const val = Math.round(maxStock * ratio)
                        return (
                          <g key={idx}>
                            <line x1={paddingX} y1={y} x2={Math.max(modalFilteredBarItems.length * 52, 700) - paddingX} y2={y} stroke="#F3F4F6" strokeDasharray="4 4" />
                            <text x={paddingX - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-gray-400 font-mono">
                              {val}
                            </text>
                          </g>
                        )
                      })}

                      {/* Threshold line in modal */}
                      {maxStock >= 10 && (
                        <line
                          x1={paddingX}
                          y1={paddingTop + (chartHeight + 40) - (10 / maxStock) * (chartHeight + 40)}
                          x2={Math.max(modalFilteredBarItems.length * 52, 700) - paddingX}
                          y2={paddingTop + (chartHeight + 40) - (10 / maxStock) * (chartHeight + 40)}
                          stroke="#F59E0B"
                          strokeDasharray="4 4"
                          strokeWidth="1.2"
                        />
                      )}

                      {modalFilteredBarItems.map((item: any, idx: number) => {
                        const count = modalFilteredBarItems.length || 1
                        const totalW = Math.max(modalFilteredBarItems.length * 52, 700) - paddingX * 2
                        const bW = Math.max(Math.min((totalW / count) - 8, 38), 16)
                        const x = paddingX + idx * (totalW / count) + (totalW / count - bW) / 2
                        const sH = Math.max(Math.round((item.stock / maxStock) * (chartHeight + 40)), item.stock > 0 ? 5 : 1)
                        const y = paddingTop + (chartHeight + 40) - sH
                        const barColor = item.stock === 0 ? '#EF4444' : item.stock <= 10 ? '#F59E0B' : '#10B981'

                        return (
                          <g key={item.id}>
                            <rect x={x} y={y} width={bW} height={sH} rx={4} fill={barColor} />
                            <text x={x + bW / 2} y={y - 5} textAnchor="middle" className="text-[9px] fill-gray-800 font-black">
                              {item.stock}
                            </text>
                            <text
                              x={x + bW / 2}
                              y={svgHeight + 56}
                              textAnchor="middle"
                              className="text-[9px] fill-gray-500 font-bold"
                            >
                              {item.name.slice(0, 8)}..
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                </div>
              )}

              {/* MODAL 2: EXPANDED CATEGORIES */}
              {expandedWidget === 'categories' && (
                <div className="space-y-3">
                  {categoryStockValuation.map((c: any) => (
                    <div key={c.category} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-black text-gray-900 text-sm">{c.category}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black">
                            {c.percentage}% of stock
                          </span>
                        </div>
                        <span className="font-black text-gray-900 text-sm">
                          ₱{Number(c.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div style={{ width: `${c.percentage}%` }} className="h-full bg-blue-600 rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 font-medium">
                        <span>{Number(c.units).toLocaleString('en-PH')} total units on hand</span>
                        <span>{c.productCount} active SKUs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MODAL 3: EXPANDED BEST SELLERS */}
              {expandedWidget === 'bestSellers' && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3">Rank & Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Units Sold</th>
                        <th className="px-4 py-3 text-right">Revenue (₱)</th>
                        <th className="px-5 py-3 text-right">Current Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bestSellers.map((item: any, idx: number) => (
                        <tr key={item.productId} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-700 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-gray-900">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-blue-700">
                            {item.unitsSold} {item.unit}s
                          </td>
                          <td className="px-4 py-3 text-right font-black text-gray-900">
                            ₱{Number(item.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-gray-600">
                            {item.currentStock} {item.unit}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL 4: EXPANDED SLOW MOVERS */}
              {expandedWidget === 'slowMovers' && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3">Product Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Units on Hand</th>
                        <th className="px-5 py-3 text-right">Capital Tied Up (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {slowMovers.map((item: any) => (
                        <tr key={item.productId} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3 font-bold text-gray-900">{item.name}</td>
                          <td className="px-4 py-3">
                            <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-amber-700">
                            {item.currentStock} {item.unit}s
                          </td>
                          <td className="px-5 py-3 text-right font-black text-gray-900">
                            ₱{Number(item.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL 5: EXPANDED MASTER INVENTORY LEDGER */}
              {expandedWidget === 'ledger' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Search product name..."
                      value={searchLedger}
                      onChange={(e) => setSearchLedger(e.target.value)}
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
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="healthy">Healthy</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3">Product Name</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Stock on Hand</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Units Sold</th>
                          <th className="px-5 py-3 text-right">Valuation (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredLedger.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3 font-bold text-gray-900">{item.name}</td>
                            <td className="px-4 py-3">
                              <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-gray-900">
                              {item.stock} {item.unit}s
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                item.status === 'low_stock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {item.status === 'healthy' ? 'Healthy' : item.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-700">
                              {item.unitsSold} {item.unit}s
                            </td>
                            <td className="px-5 py-3 text-right font-black text-gray-900">
                              ₱{Number(item.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {filteredLedger.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">
                              No products found matching the filter.
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
