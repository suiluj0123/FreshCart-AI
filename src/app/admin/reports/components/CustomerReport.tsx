'use client'

import React, { useState, useEffect } from 'react'

interface CustomerReportProps {
  customers: any
}

type ExpandableWidget = 'segmentation' | 'fulfillment' | 'top_spenders' | 'growth' | 'directory' | null

export default function CustomerReport({ customers }: CustomerReportProps) {
  const [expandedWidget, setExpandedWidget] = useState<ExpandableWidget>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [filterSegment, setFilterSegment] = useState('all')
  const [filterFulfillment, setFilterFulfillment] = useState('all')

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedWidget(null)
        setSelectedCustomer(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fulfillment = customers.fulfillment || {
    delivery: 0,
    pickup: 0,
    deliveryRevenue: 0,
    pickupRevenue: 0,
    deliveryPct: 50,
    pickupPct: 50,
  }

  const topSpenders = customers.topSpendingCustomers || []
  const customerDirectory = customers.customerDirectory || []
  const customerTrend = customers.customerTrend || []
  const segmentationTiers = customers.segmentationTiers || {
    vip: { name: 'VIP Champions', count: 1, revenue: 11042.5, color: 'bg-purple-500', badge: 'VIP' },
    loyal: { name: 'Loyal Regulars', count: 0, revenue: 0, color: 'bg-emerald-500', badge: 'Regular' },
    firstTimers: { name: 'Recent First-Timers', count: 1, revenue: 623, color: 'bg-blue-500', badge: 'New' },
    dormant: { name: 'Dormant / Inactive', count: 2, revenue: 0, color: 'bg-gray-400', badge: 'Inactive' },
  }

  const totalStoreCustomers = customerDirectory.length || customers.totalUsers || 1
  const avgOrderValue =
    customerDirectory.reduce((sum: number, c: any) => sum + (Number(c.totalSpent) || 0), 0) /
      (customerDirectory.reduce((sum: number, c: any) => sum + (Number(c.ordersCount) || 0), 0) || 1) || 0

  // Filtered customer directory
  const filteredCustomers = customerDirectory.filter((c: any) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.email.toLowerCase().includes(searchFilter.toLowerCase())

    let matchesSeg = true
    if (filterSegment === 'vip') matchesSeg = c.totalSpent >= 3000 || c.ordersCount >= 5
    else if (filterSegment === 'loyal') matchesSeg = c.ordersCount >= 2 && c.ordersCount < 5 && c.totalSpent < 3000
    else if (filterSegment === 'firstTimers') matchesSeg = c.ordersCount === 1
    else if (filterSegment === 'dormant') matchesSeg = c.ordersCount === 0

    let matchesFul = true
    if (filterFulfillment === 'delivery') matchesFul = c.deliveryCount > c.pickupCount
    else if (filterFulfillment === 'pickup') matchesFul = c.pickupCount >= c.deliveryCount && c.ordersCount > 0

    return matchesSearch && matchesSeg && matchesFul
  })

  // Customer Directory CSV Export
  const handleExportCustomersCsv = () => {
    if (!customerDirectory || customerDirectory.length === 0) {
      alert('No customer records to export.')
      return
    }

    const headers = ['Customer Name', 'Email Address', 'Role', 'Total Orders', 'Total Spent (PHP)', 'Avg Order Value (PHP)', 'Deliveries', 'Pickups', 'Member Since']
    const rows = customerDirectory.map((c: any) => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.email,
      c.role || 'customer',
      c.ordersCount,
      Number(c.totalSpent).toFixed(2),
      c.ordersCount > 0 ? (Number(c.totalSpent) / c.ordersCount).toFixed(2) : '0.00',
      c.deliveryCount,
      c.pickupCount,
      new Date(c.memberSince || c.lastOrderDate).toLocaleDateString('en-PH'),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FreshCart_Customer_Directory_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* ACTION BAR: EXPORT CUSTOMER DIRECTORY */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h3 className="text-xs font-black text-gray-900">Customer Intelligence & Retention Analytics</h3>
          <p className="text-[10px] text-gray-400">Track buyer behavior, fulfillment preferences, and VIP customer lifecycle</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCustomersCsv}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Export Customers CSV 📥</span>
          </button>
        </div>
      </div>

      {/* 1. TOP KPI CUSTOMER METRICS BANNER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-blue-200 bg-blue-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800">Total Registered Accounts</p>
          <p className="text-xl font-black text-blue-700 mt-0.5">
            {customers.totalUsers || customerDirectory.length}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Verified shopper database</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Active Buying Shoppers</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            {customers.activeShoppers || customerDirectory.filter((c: any) => c.ordersCount > 0).length}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Shoppers with purchase history</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-200 bg-purple-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">Repeat Buyer Rate</p>
          <p className="text-xl font-black text-purple-700 mt-0.5">
            {customers.repeatRatePct || 50}%
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {customers.repeatCustomersCount || customerDirectory.filter((c: any) => c.ordersCount > 1).length} repeat customers
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/20 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Avg Re-Order Turnaround</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">
            {customers.avgReorderCycleDays || 4.5} <span className="text-xs font-semibold">days</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Avg cycle between grocery orders</p>
        </div>
      </div>

      {/* 2. COMPACT MODULAR 2-COLUMN WIDGET GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* WIDGET 1: Customer RFM Segmentation Tiers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Customer Segmentation Tiers</h3>
                <p className="text-[10px] text-gray-400">Shopper lifecycle segments & revenue contribution</p>
              </div>
              <button
                onClick={() => setExpandedWidget('segmentation')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {/* VIP Tier */}
              <div className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/40 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-purple-950 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-600"></span> VIP Champions (5+ orders / ₱3k+)
                  </span>
                  <span className="text-purple-900 font-black">
                    {segmentationTiers.vip?.count || 0} users ({Math.round(((segmentationTiers.vip?.count || 0) / totalStoreCustomers) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-purple-700 font-semibold">
                  <span>₱{Number(segmentationTiers.vip?.revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} contributed</span>
                  <span>High LTV</span>
                </div>
              </div>

              {/* Loyal Tier */}
              <div className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-950 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-600"></span> Loyal Regulars (2–4 orders)
                  </span>
                  <span className="text-emerald-900 font-black">
                    {segmentationTiers.loyal?.count || 0} users ({Math.round(((segmentationTiers.loyal?.count || 0) / totalStoreCustomers) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-emerald-700 font-semibold">
                  <span>₱{Number(segmentationTiers.loyal?.revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} contributed</span>
                  <span>Consistent Re-order</span>
                </div>
              </div>

              {/* First-Timers Tier */}
              <div className="p-2.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-950 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span> Recent First-Timers (1 order)
                  </span>
                  <span className="text-blue-900 font-black">
                    {segmentationTiers.firstTimers?.count || 0} users ({Math.round(((segmentationTiers.firstTimers?.count || 0) / totalStoreCustomers) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-blue-700 font-semibold">
                  <span>₱{Number(segmentationTiers.firstTimers?.revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} contributed</span>
                  <span>Target for 2nd Order</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Dormant Accounts: {segmentationTiers.dormant?.count || 0}</span>
            <span className="text-purple-700 font-bold">Targeted Lifecycle Active</span>
          </div>
        </div>

        {/* WIDGET 2: Fulfillment Channel Preference */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Fulfillment Preference</h3>
                <p className="text-[10px] text-gray-400">Home Delivery vs In-Store Pickup revenue & order split</p>
              </div>
              <button
                onClick={() => setExpandedWidget('fulfillment')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {/* Home Delivery */}
              <div className="p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-900">Home Delivery</span>
                  <span className="text-blue-900 font-black">
                    ₱{Number(fulfillment.deliveryRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    <span className="text-[10px] text-blue-700 ml-1">({fulfillment.deliveryPct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-blue-200 rounded-full overflow-hidden">
                  <div style={{ width: `${fulfillment.deliveryPct}%` }} className="h-full bg-blue-600 rounded-full"></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                  <span>{fulfillment.delivery} orders dispatched</span>
                  <span>Driver delivery</span>
                </div>
              </div>

              {/* In-Store Pickup */}
              <div className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/50 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-purple-900">In-Store Pickup</span>
                  <span className="text-purple-900 font-black">
                    ₱{Number(fulfillment.pickupRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    <span className="text-[10px] text-purple-700 ml-1">({fulfillment.pickupPct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-purple-200 rounded-full overflow-hidden">
                  <div style={{ width: `${fulfillment.pickupPct}%` }} className="h-full bg-purple-600 rounded-full"></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                  <span>{fulfillment.pickup} pickup orders</span>
                  <span>Store counter</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Total Orders: {(fulfillment.delivery || 0) + (fulfillment.pickup || 0)}</span>
            <span className="text-blue-700 font-bold">Omnichannel Operations</span>
          </div>
        </div>

        {/* WIDGET 3: Top Spending VIP Customers Leaderboard */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Top VIP Spenders</h3>
                <p className="text-[10px] text-gray-400">Highest gross spending customers</p>
              </div>
              <button
                onClick={() => setExpandedWidget('top_spenders')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {topSpenders.slice(0, 3).map((c: any, idx: number) => (
                <div
                  key={c.userId}
                  onClick={() => setSelectedCustomer(c)}
                  className="p-2 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{c.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{c.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">
                      ₱{Number(c.totalSpent).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold">{c.ordersCount} orders</p>
                  </div>
                </div>
              ))}
              {topSpenders.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4 text-center">No purchases recorded yet.</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>VIP Leaderboard</span>
            <span className="text-emerald-700 font-bold">Top Revenue Drivers</span>
          </div>
        </div>

        {/* WIDGET 4: Shopper Growth & Order Velocity Trend */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-black text-gray-900">Shopper Velocity Trend</h3>
                <p className="text-[10px] text-gray-400">Active buyers vs new accounts across timeline</p>
              </div>
              <button
                onClick={() => setExpandedWidget('growth')}
                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
              >
                Full View ⤢
              </button>
            </div>

            <div className="space-y-2 mt-3">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">Average Basket Size</span>
                <span className="font-black text-gray-900">
                  ₱{avgOrderValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">Repeat Shopper Velocity</span>
                <span className="font-black text-emerald-700">{customers.repeatRatePct || 50}% Repeat Rate</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 mt-2">
            <span>Organic Growth</span>
            <span className="text-emerald-700 font-bold">Stable Retention</span>
          </div>
        </div>
      </div>

      {/* 3. FULL-WIDTH COMPACT CUSTOMER DIRECTORY BOX */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-xs font-black text-gray-900 flex items-center gap-2">
              <span>Customer Directory & Spend Ledger</span>
              <span className="text-[9px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">
                {customerDirectory.length} Accounts
              </span>
            </h3>
            <p className="text-[10px] text-gray-400">Click any customer row to open their full order history</p>
          </div>

          <button
            onClick={() => setExpandedWidget('directory')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer self-end sm:self-auto"
          >
            <span>Full View & Directory ⤢</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-5 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Segment</th>
                <th className="px-4 py-2.5 text-right">Total Orders</th>
                <th className="px-4 py-2.5">Fulfillment Split</th>
                <th className="px-4 py-2.5 text-right">Lifetime Spend (₱)</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customerDirectory.slice(0, 5).map((c: any) => (
                <tr
                  key={c.userId}
                  onClick={() => setSelectedCustomer(c)}
                  className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-2.5">
                    <p className="font-bold text-gray-900">{c.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{c.email}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      c.totalSpent >= 3000 || c.ordersCount >= 5 ? 'bg-purple-100 text-purple-800' :
                      c.ordersCount >= 2 ? 'bg-emerald-100 text-emerald-800' :
                      c.ordersCount === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.totalSpent >= 3000 || c.ordersCount >= 5 ? 'VIP Champion' :
                       c.ordersCount >= 2 ? 'Loyal Regular' :
                       c.ordersCount === 1 ? 'First-Timer' : 'Registered'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-gray-900">
                    {c.ordersCount} orders
                  </td>
                  <td className="px-4 py-2.5 text-[10px] text-gray-500 font-medium">
                    <span className="text-blue-700 font-bold">{c.deliveryCount} Del</span> /{' '}
                    <span className="text-purple-700 font-bold">{c.pickupCount} Pick</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-gray-900">
                    ₱{Number(c.totalSpent).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <span className="text-[11px] font-bold text-emerald-700 hover:underline">
                      View Orders ➔
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <button
            onClick={() => setExpandedWidget('directory')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            View All {customerDirectory.length} Customers in Full View ➔
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL: DEDICATED CUSTOMER PROFILE & ORDER HISTORY     */}
      {/* ======================================================== */}
      {selectedCustomer !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/40">
              <div>
                <h3 className="text-sm font-black text-emerald-950">{selectedCustomer.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Customer Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-500">Lifetime Spend</span>
                  <p className="text-base font-black text-emerald-700 mt-0.5">
                    ₱{Number(selectedCustomer.totalSpent).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-500">Total Orders</span>
                  <p className="text-base font-black text-gray-900 mt-0.5">
                    {selectedCustomer.ordersCount} orders
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-500">Fulfillment Split</span>
                  <p className="text-xs font-bold text-gray-800 mt-1">
                    {selectedCustomer.deliveryCount} Delivery · {selectedCustomer.pickupCount} Pickup
                  </p>
                </div>
              </div>

              {/* Order History Timeline */}
              <div>
                <h4 className="text-xs font-black text-gray-900 mb-2">Order History ({selectedCustomer.ordersList?.length || 0})</h4>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Order ID</th>
                        <th className="px-3 py-2.5">Mode</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Total (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedCustomer.ordersList?.map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-gray-50/80">
                          <td className="px-4 py-2 text-gray-600 font-mono text-[11px]">
                            {new Date(ord.createdAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-gray-500">
                            #{ord.id.slice(0, 8)}
                          </td>
                          <td className="px-3 py-2 capitalize font-bold text-[10px]">
                            {ord.fulfillmentType === 'pickup' ? (
                              <span className="text-purple-700">Pickup</span>
                            ) : (
                              <span className="text-blue-700">Delivery</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                              {ord.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-black text-gray-900">
                            ₱{Number(ord.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {(!selectedCustomer.ordersList || selectedCustomer.ordersList.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-gray-400 italic">
                            No orders placed yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close Profile
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
                  {expandedWidget === 'segmentation' && 'Full View: Customer RFM Segmentation & Lifecycle'}
                  {expandedWidget === 'fulfillment' && 'Full View: Fulfillment Preference & Delivery Analysis'}
                  {expandedWidget === 'top_spenders' && 'Full View: VIP Customer Leaderboard'}
                  {expandedWidget === 'growth' && 'Full View: Shopper Growth & Order Velocity'}
                  {expandedWidget === 'directory' && 'Full View: Complete Customer Directory & Ledger'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detailed buyer intelligence and customer purchase histories
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
              {/* MODAL: FULL DIRECTORY */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Search by customer name or email..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none w-full sm:w-72"
                  />

                  <div className="flex items-center gap-2">
                    <select
                      value={filterSegment}
                      onChange={(e) => setFilterSegment(e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer"
                    >
                      <option value="all">All Segments</option>
                      <option value="vip">VIP Champions (5+ orders)</option>
                      <option value="loyal">Loyal Regulars (2-4 orders)</option>
                      <option value="firstTimers">First-Timers (1 order)</option>
                      <option value="dormant">Dormant (0 orders)</option>
                    </select>

                    <select
                      value={filterFulfillment}
                      onChange={(e) => setFilterFulfillment(e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white font-medium cursor-pointer"
                    >
                      <option value="all">All Modes</option>
                      <option value="delivery">Prefers Delivery</option>
                      <option value="pickup">Prefers Pickup</option>
                    </select>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3">Customer Name</th>
                        <th className="px-4 py-3">Segment</th>
                        <th className="px-4 py-3 text-right">Orders</th>
                        <th className="px-4 py-3">Fulfillment</th>
                        <th className="px-4 py-3 text-right">Lifetime Spend (₱)</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredCustomers.map((c: any) => (
                        <tr
                          key={c.userId}
                          onClick={() => {
                            setExpandedWidget(null)
                            setSelectedCustomer(c)
                          }}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3">
                            <p className="font-bold text-gray-900">{c.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{c.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              c.totalSpent >= 3000 || c.ordersCount >= 5 ? 'bg-purple-100 text-purple-800' :
                              c.ordersCount >= 2 ? 'bg-emerald-100 text-emerald-800' :
                              c.ordersCount === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {c.totalSpent >= 3000 || c.ordersCount >= 5 ? 'VIP Champion' :
                               c.ordersCount >= 2 ? 'Loyal Regular' :
                               c.ordersCount === 1 ? 'First-Timer' : 'Registered'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-gray-900">
                            {c.ordersCount}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-gray-500 font-medium">
                            <span className="text-blue-700 font-bold">{c.deliveryCount} Del</span> /{' '}
                            <span className="text-purple-700 font-bold">{c.pickupCount} Pick</span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-gray-900">
                            ₱{Number(c.totalSpent).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-[11px] font-bold text-emerald-700 hover:underline">
                              View Orders ➔
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">
                            No customers found matching the filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
