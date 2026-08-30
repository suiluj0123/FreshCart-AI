'use client'

import React, { useState, useEffect } from 'react'

interface SalesReportProps {
  sales: any
}

type ExpandableWidget = 'chart' | 'payments' | 'peak' | 'departments' | 'products' | 'ledger' | null

export default function SalesReport({ sales }: SalesReportProps) {
  const [graphMetric, setGraphMetric] = useState<'revenue' | 'orders'>('revenue')
  const [searchTxn, setSearchTxn] = useState('')
  const [filterMethod, setFilterMethod] = useState('all')
  const [searchProduct, setSearchProduct] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [expandedWidget, setExpandedWidget] = useState<ExpandableWidget>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number
    y: number
    label: string
    revenue: number
    orders: number
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

  const salesTrend = sales.salesTrend || []
  const isRev = graphMetric === 'revenue'

  const maxVal = isRev
    ? Math.max(...salesTrend.map((t: any) => Number(t.revenue) || 0), 1000)
    : Math.max(...salesTrend.map((t: any) => Number(t.orders) || 0), 5)

  // SVG Line Chart Dimensions (Compact default)
  const svgWidth = 700
  const svgHeight = 180
  const paddingX = 35
  const paddingTop = 25
  const paddingBottom = 35

  const chartWidth = svgWidth - paddingX * 2
  const chartHeight = svgHeight - paddingTop - paddingBottom

  // Compute point coordinates
  const points = salesTrend.map((item: any, index: number) => {
    const x = salesTrend.length > 1
      ? paddingX + (index / (salesTrend.length - 1)) * chartWidth
      : paddingX + chartWidth / 2
    const currentVal = isRev ? (Number(item.revenue) || 0) : (Number(item.orders) || 0)
    const y = paddingTop + chartHeight - (currentVal / maxVal) * chartHeight
    return {
      x,
      y,
      label: item.label,
      revenue: Number(item.revenue) || 0,
      orders: Number(item.orders) || 0,
      currentVal,
    }
  })

  // Build SVG Path
  const linePathD = points.reduce((acc: string, pt: any, idx: number) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`
  }, '')

  // Area under curve
  const areaPathD = points.length > 0
    ? `${linePathD} L ${points[points.length - 1].x},${paddingTop + chartHeight} L ${points[0].x},${paddingTop + chartHeight} Z`
    : ''

  const customerPayments = sales.customerPayments || []
  const peakHours = sales.peakHours || []
  const recentTransactions = sales.recentTransactions || []
  const productSalesShare = sales.productSalesShare || []
  const revenueBreakdown = sales.revenueBreakdown || { groceries: sales.totalGrossRevenue, deliveryFees: 0 }

  // Filtered transactions for the ledger
  const filteredTxns = recentTransactions.filter((txn: any) => {
    const matchesSearch =
      txn.customerName.toLowerCase().includes(searchTxn.toLowerCase()) ||
      txn.customerEmail.toLowerCase().includes(searchTxn.toLowerCase()) ||
      txn.shortId.toLowerCase().includes(searchTxn.toLowerCase())
    const matchesMethod =
      filterMethod === 'all' || txn.paymentMethod.toLowerCase() === filterMethod.toLowerCase()
    return matchesSearch && matchesMethod
  })

  // Filtered product sales share
  const filteredProducts = productSalesShare.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchProduct.toLowerCase())
    const matchesCat = filterCategory === 'all' || p.category.toLowerCase() === filterCategory.toLowerCase()
    return matchesSearch && matchesCat
  })

  const uniqueCategories = Array.from(new Set(productSalesShare.map((p: any) => p.category))) as string[]

  const handleExportSalesCsv = () => {
    if (!recentTransactions || recentTransactions.length === 0) {
      alert('No sales transactions to export.')
      return
    }

    const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Payment Method', 'Items Count', 'Delivery Fee (PHP)', 'Total Gross (PHP)']
    const rows = recentTransactions.map((txn: any) => [
      `"#${txn.shortId}"`,
      new Date(txn.createdAt).toLocaleDateString('en-PH'),
      `"${txn.customerName.replace(/"/g, '""')}"`,
      txn.customerEmail,
      txn.paymentMethod,
      txn.itemsCount,
      Number(txn.deliveryFee || 0).toFixed(2),
      Number(txn.total).toFixed(2),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FreshCart_Sales_Transactions_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* ACTION BAR: EXPORT SALES CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h3 className="text-xs font-black text-gray-900">Sales & Revenue Financial Ledger</h3>
          <p className="text-[10px] text-gray-400">Itemized gross revenue, product contributions, and payment settlement breakdown</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSalesCsv}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Export Sales CSV 📥</span>
          </button>
        </div>
      </div>

      {/* 1. TOP KPI FINANCIAL CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Gross Sales (GMV)</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">
            ₱{Number(sales.totalGrossRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{Number(sales.totalOrders || 0).toLocaleString('en-PH')} completed orders</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Cost of Goods (COGS)</p>
          <p className="text-xl font-black text-gray-700 mt-0.5">
            ₱{Number(sales.totalCogs || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Supplier purchase expenses</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Net Gross Profit</p>
            <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
              {sales.profitMarginPct || 0}% Margin
            </span>
          </div>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            ₱{Number(sales.totalGrossProfit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Gross earnings after product cost</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Average Basket (AOV)</p>
          <p className="text-xl font-black text-blue-700 mt-0.5">
            ₱{Number(sales.averageOrderValue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{Number(sales.totalItemsSold || 0).toLocaleString('en-PH')} items sold</p>
        </div>
      </div>

      {/* 2. COMPACT MODULAR 2-COLUMN WIDGET GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* WIDGET 1: Daily Velocity Line Graph */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-gray-900">
                  {isRev ? 'Daily Sales Revenue Velocity' : 'Daily Order Volume Velocity'}
                </h3>
                <div className="flex items-center rounded-lg bg-gray-100 p-0.5 text-[10px] font-bold">
                  <button
                    onClick={() => setGraphMetric('revenue')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      isRev ? 'bg-white text-emerald-700 font-black shadow-2xs' : 'text-gray-500'
                    }`}
                  >
                    ₱ Revenue
                  </button>
                  <button
                    onClick={() => setGraphMetric('orders')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      !isRev ? 'bg-white text-blue-700 font-black shadow-2xs' : 'text-gray-500'
                    }`}
                  >
                    Orders
                  </button>
                </div>
              </div>

              <button
                onClick={() => setExpandedWidget('chart')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            {/* Compact SVG Chart */}
            <div className="relative w-full overflow-hidden mt-3">
              {hoveredPoint && (
                <div
                  className="absolute z-30 pointer-events-none bg-gray-900 text-white rounded-lg py-1 px-2 text-[10px] shadow-lg transition-all border border-gray-700"
                  style={{
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                    top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                    transform: 'translate(-50%, -120%)',
                  }}
                >
                  <p className={`font-black ${isRev ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {isRev ? `₱${hoveredPoint.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : `${hoveredPoint.orders} order(s)`}
                  </p>
                  <p className="text-gray-300 text-[9px]">{hoveredPoint.label}</p>
                </div>
              )}

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-40 overflow-visible"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="compactSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isRev ? '#10B981' : '#3B82F6'} stopOpacity="0.30" />
                    <stop offset="100%" stopColor={isRev ? '#10B981' : '#3B82F6'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = paddingTop + chartHeight * (1 - ratio)
                  const val = maxVal * ratio
                  return (
                    <g key={idx}>
                      <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#F3F4F6" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={paddingX - 6} y={y + 3} textAnchor="end" className="text-[8px] fill-gray-400 font-mono">
                        {isRev ? `₱${Math.round(val).toLocaleString('en-PH')}` : `${Math.round(val)}`}
                      </text>
                    </g>
                  )
                })}

                {areaPathD && <path d={areaPathD} fill="url(#compactSalesGrad)" />}
                {linePathD && (
                  <path
                    d={linePathD}
                    fill="none"
                    stroke={isRev ? '#059669' : '#2563EB'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {points.map((pt: any, idx: number) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint?.label === pt.label ? 6 : 3.5}
                      fill="#FFFFFF"
                      stroke={isRev ? '#059669' : '#2563EB'}
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredPoint(pt)}
                    />
                    <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" onMouseEnter={() => setHoveredPoint(pt)} />
                    <text x={pt.x} y={svgHeight - 10} textAnchor="middle" className="text-[9px] fill-gray-400 font-bold">
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Peak: {isRev ? `₱${maxVal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : `${maxVal} orders`}</span>
            <span className="text-emerald-700">{salesTrend.length} Timeline Points</span>
          </div>
        </div>

        {/* WIDGET 2: Grocery Item Sales & Share (% of Total Sales) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Grocery Item Sales & Share</h3>
                <p className="text-[10px] text-gray-400">Real percentage of total revenue generated per item</p>
              </div>
              <button
                onClick={() => setExpandedWidget('products')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {productSalesShare.slice(0, 3).map((item: any) => (
                <div key={item.productId} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-900 truncate max-w-[180px]">{item.name}</span>
                    <span className="text-gray-900 font-black">
                      ₱{Number(item.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-emerald-700 font-extrabold ml-1">
                        ({item.percentageOfTotalSales}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div style={{ width: `${Math.min(item.percentageOfTotalSales, 100)}%` }} className="h-full bg-emerald-600 rounded-full"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                    <span>{item.unitsSold} {item.unit}s sold</span>
                    <span>{item.marginPct}% margin</span>
                  </div>
                </div>
              ))}
              {productSalesShare.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4 text-center">No item sales in this period.</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>{productSalesShare.length} Active Selling Items</span>
            <span className="text-emerald-700 font-bold">SKU Contribution</span>
          </div>
        </div>

        {/* WIDGET 3: Customer Payments Total */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Customer Payments Total</h3>
                <p className="text-[10px] text-gray-400">Real-time payment method choice percentage</p>
              </div>
              <button
                onClick={() => setExpandedWidget('payments')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {customerPayments.map((item: any) => (
                <div key={item.key} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-800">{item.label}</span>
                    <span className="text-gray-900 font-black">
                      ₱{Number(item.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-emerald-700 font-extrabold ml-1">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div style={{ width: `${item.percentage}%` }} className={`h-full ${item.color} rounded-full`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Verified Paid: ₱{Number(sales.totalGrossRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            <span className="text-emerald-700">{customerPayments.reduce((s: number, i: any) => s + i.count, 0)} Orders</span>
          </div>
        </div>

        {/* WIDGET 4: Peak Sales Hours & Operations Rush Windows */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Peak Sales Hours & Rush Windows</h3>
                <p className="text-[10px] text-gray-400">Order timing across store operational rush windows</p>
              </div>
              <button
                onClick={() => setExpandedWidget('peak')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
              {peakHours.slice(0, 5).map((rush: any) => (
                <div key={rush.key} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[11px] text-gray-900">{rush.label}</span>
                    <span className="text-[9px] font-black text-gray-600 px-1 py-0.2 bg-white rounded border border-gray-200">
                      {rush.percentage}%
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400">{rush.timeRange}</p>
                  <p className="text-[11px] font-black text-emerald-700">
                    ₱{Number(rush.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>5 Operational Windows</span>
            <span className="text-amber-700">Dispatch Timing</span>
          </div>
        </div>
      </div>

      {/* 3. FULL-WIDTH COMPACT TRANSACTIONS LEDGER BOX */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-xs font-black text-gray-900 flex items-center gap-2">
              <span>Itemized Completed Transactions Ledger</span>
              <span className="text-[9px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">
                {recentTransactions.length} Total Records
              </span>
            </h3>
            <p className="text-[10px] text-gray-400">Previewing recent customer sales transactions</p>
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
                <th className="px-5 py-2.5">Order</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Fulfillment</th>
                <th className="px-4 py-2.5">Payment</th>
                <th className="px-4 py-2.5 text-center">Items</th>
                <th className="px-5 py-2.5 text-right">Total (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransactions.slice(0, 5).map((txn: any) => (
                <tr key={txn.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-2.5 font-mono font-bold text-gray-900">#{txn.shortId}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-bold text-gray-900">{txn.customerName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{txn.customerEmail}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold capitalize bg-gray-100 text-gray-700">
                      {txn.fulfillmentType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-700 capitalize">
                    {txn.paymentMethod === 'cash' ? 'Cash on Delivery' : txn.paymentMethod}
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold text-gray-700">{txn.itemsCount}</td>
                  <td className="px-5 py-2.5 text-right font-black text-gray-900">
                    ₱{Number(txn.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
            View All {recentTransactions.length} Transactions in Full View ➔
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
                  {expandedWidget === 'chart' && 'Full View: Daily Sales & Order Velocity Analytics'}
                  {expandedWidget === 'products' && 'Full View: Grocery Item Sales & Share (% of Total Sales)'}
                  {expandedWidget === 'payments' && 'Full View: Customer Payments Total Breakdown'}
                  {expandedWidget === 'peak' && 'Full View: Peak Sales Hours & Rush Windows'}
                  {expandedWidget === 'departments' && 'Full View: Department Revenue Shares & Margins'}
                  {expandedWidget === 'ledger' && 'Full View: Itemized Completed Sales Ledger'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detailed analytics and complete itemized audit data
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
              {/* MODAL 1: CHART EXPANDED */}
              {expandedWidget === 'chart' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-bold">
                      <button
                        onClick={() => setGraphMetric('revenue')}
                        className={`px-3 py-1 rounded-lg ${isRev ? 'bg-white text-emerald-700 font-black shadow-xs' : 'text-gray-500'}`}
                      >
                        Revenue (₱)
                      </button>
                      <button
                        onClick={() => setGraphMetric('orders')}
                        className={`px-3 py-1 rounded-lg ${!isRev ? 'bg-white text-blue-700 font-black shadow-xs' : 'text-gray-500'}`}
                      >
                        Order Volume
                      </button>
                    </div>
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-xl">
                      Peak: {isRev ? `₱${maxVal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : `${maxVal} orders`}
                    </span>
                  </div>

                  <div className="border border-gray-200 rounded-2xl p-6 bg-white">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight + 40}`} className="w-full h-72">
                      <defs>
                        <linearGradient id="modalSalesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isRev ? '#10B981' : '#3B82F6'} stopOpacity="0.40" />
                          <stop offset="100%" stopColor={isRev ? '#10B981' : '#3B82F6'} stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = paddingTop + (chartHeight + 40) * (1 - ratio)
                        const val = maxVal * ratio
                        return (
                          <g key={idx}>
                            <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#F3F4F6" strokeDasharray="4 4" />
                            <text x={paddingX - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-gray-400 font-mono">
                              {isRev ? `₱${Math.round(val).toLocaleString('en-PH')}` : `${Math.round(val)}`}
                            </text>
                          </g>
                        )
                      })}

                      {areaPathD && <path d={areaPathD} fill="url(#modalSalesGrad)" />}
                      {linePathD && (
                        <path
                          d={linePathD}
                          fill="none"
                          stroke={isRev ? '#059669' : '#2563EB'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {points.map((pt: any, idx: number) => (
                        <g key={idx}>
                          <circle cx={pt.x} cy={pt.y} r={5} fill="#FFFFFF" stroke={isRev ? '#059669' : '#2563EB'} strokeWidth="2.5" />
                          <text x={pt.x} y={svgHeight + 28} textAnchor="middle" className="text-[10px] fill-gray-500 font-bold">
                            {pt.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              )}

              {/* MODAL 2: GROCERY ITEM SALES & SHARE (% OF TOTAL SALES) EXPANDED */}
              {expandedWidget === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Search grocery item..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none w-full sm:w-72"
                    />

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
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3">Rank & Product Name</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Units Sold</th>
                          <th className="px-4 py-3 text-right">Revenue (₱)</th>
                          <th className="px-6 py-3 text-right">% of Total Sales</th>
                          <th className="px-5 py-3 text-right">Gross Profit (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map((item: any, idx: number) => (
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
                              ₱{Number(item.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div style={{ width: `${Math.min(item.percentageOfTotalSales, 100)}%` }} className="h-full bg-emerald-600 rounded-full"></div>
                                </div>
                                <span className="font-black text-emerald-700 text-xs">{item.percentageOfTotalSales}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-gray-700">
                              ₱{Number(item.profit).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-gray-400 ml-1">({item.marginPct}%)</span>
                            </td>
                          </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">
                              No grocery items matching the filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODAL 3: PAYMENTS EXPANDED */}
              {expandedWidget === 'payments' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customerPayments.map((item: any) => (
                      <div key={item.key} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-gray-900 text-sm">{item.label}</span>
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {item.percentage}% Share
                          </span>
                        </div>
                        <p className="text-2xl font-black text-gray-900">
                          ₱{Number(item.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">{item.count} total customer transactions</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MODAL 4: PEAK HOURS EXPANDED */}
              {expandedWidget === 'peak' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {peakHours.map((rush: any) => (
                    <div key={rush.key} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-gray-900 text-sm">{rush.label}</span>
                        <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          {rush.percentage}% of Orders
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">{rush.timeRange}</p>
                      <p className="text-xl font-black text-emerald-700 mt-1">
                        ₱{Number(rush.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">{rush.orders} orders processed</p>
                    </div>
                  ))}
                </div>
              )}

              {/* MODAL 5: DEPARTMENTS EXPANDED */}
              {expandedWidget === 'departments' && (
                <div className="space-y-3">
                  {Object.entries(sales.salesByDept || {}).map(([dept, val]: [string, any]) => {
                    const totalRev = Number(sales.totalGrossRevenue) || 1
                    const pct = Math.round((Number(val.revenue) / totalRev) * 100)
                    return (
                      <div key={dept} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="capitalize font-black text-gray-900 text-sm">{dept}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
                              {val.marginPct ?? 30}% margin
                            </span>
                          </div>
                          <span className="font-black text-gray-900 text-sm">
                            ₱{Number(val.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="h-full bg-emerald-600 rounded-full"></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                          <span>{Number(val.unitsSold).toLocaleString('en-PH')} units sold</span>
                          <span>Gross Profit: ₱{Number(val.profit || (val.revenue * 0.3)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* MODAL 6: FULL TRANSACTIONS LEDGER */}
              {expandedWidget === 'ledger' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Search customer or order #..."
                      value={searchTxn}
                      onChange={(e) => setSearchTxn(e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none w-full sm:w-72"
                    />

                    <select
                      value={filterMethod}
                      onChange={(e) => setFilterMethod(e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer"
                    >
                      <option value="all">All Payment Methods</option>
                      <option value="cash">Cash on Delivery</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3">Order & Timestamp</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Fulfillment</th>
                          <th className="px-4 py-3">Payment</th>
                          <th className="px-4 py-3 text-center">Items</th>
                          <th className="px-5 py-3 text-right">Total (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTxns.map((txn: any) => (
                          <tr key={txn.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-mono font-bold text-gray-900">#{txn.shortId}</p>
                              <p className="text-[10px] text-gray-400 font-mono">
                                {new Date(txn.createdAt).toLocaleDateString('en-PH', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-900">{txn.customerName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{txn.customerEmail}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold capitalize bg-gray-100 text-gray-700">
                                {txn.fulfillmentType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-700 capitalize">
                              {txn.paymentMethod === 'cash' ? 'Cash on Delivery' : txn.paymentMethod}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{txn.itemsCount}</td>
                            <td className="px-5 py-3 text-right font-black text-gray-900">
                              ₱{Number(txn.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
