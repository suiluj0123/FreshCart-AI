'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

interface InventoryBatch {
  id: string
  productId: string
  quantity: number
  expiryDate: string
  costPrice: number
  receivedAt: string
  wasAutoPurged?: boolean
}

interface ProductItem {
  id: string
  name: string
  category: string
  unit: string
  imageUrl: string | null
  basePrice: number
  active: boolean
  totalStock: number
  stockValuation: number
  avgCostPrice: number
  marginPct: number
  healthStatus: 'healthy' | 'low_stock' | 'out_of_stock'
  hasNearExpiry: boolean
  nearExpiryUnits: number
  earliestNearExpiryDate: string | null
  isExpired?: boolean
  hasExpiredBatches?: boolean
  expiredBatchesCount?: number
  effectivePrice?: number
  discountPct?: number
  markdownTier?: 'none' | 'early_clearance' | 'special_clearance' | 'flash_clearance'
  markdownBadge?: string | null
  isClearance?: boolean
  daysUntilExpiry?: number | null
  batches: InventoryBatch[]
}

interface InventoryMetrics {
  totalSkus: number
  totalStockUnits: number
  totalValuation: number
  lowStockCount: number
  outOfStockCount: number
  nearExpiryBatchesCount: number
  nearExpiryProductsCount: number
  expiredProductsCount: number
  expiredBatchesAutoPurged: number
}

interface SpoilageLogItem {
  id: string
  productId: string
  batchId: string | null
  quantity: number
  costPrice: number
  totalLossValuation: number
  reason: string
  notes: string | null
  discardedBy: string | null
  createdAt: string
  Product?: {
    id: string
    name: string
    category: string
    unit: string
    imageUrl: string | null
  }
}

interface SpoilageMetrics {
  totalLossValuation: number
  totalUnitsDiscarded: number
  totalIncidents: number
  reasonCounts: Record<string, { count: number; loss: number }>
}

const DEPARTMENTS = [
  { key: 'all', label: 'All Departments' },
  { key: 'produce', label: 'Produce (Fruits & Veg)' },
  { key: 'meat', label: 'Fresh Meat & Poultry' },
  { key: 'seafood', label: 'Fresh Seafood & Fish' },
  { key: 'dairy', label: 'Dairy & Eggs' },
  { key: 'rice', label: 'Rice & Grains' },
  { key: 'pantry', label: 'Pantry Essentials' },
  { key: 'frozen', label: 'Frozen Foods' },
  { key: 'beverages', label: 'Beverages' },
  { key: 'snacks', label: 'Snacks & Noodles' },
]

export default function AdminInventoryPage() {
  const [viewMode, setViewMode] = useState<'catalog' | 'spoilage_log'>('catalog')
  const [products, setProducts] = useState<ProductItem[]>([])
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalSkus: 0,
    totalStockUnits: 0,
    totalValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    nearExpiryBatchesCount: 0,
    nearExpiryProductsCount: 0,
    expiredProductsCount: 0,
    expiredBatchesAutoPurged: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'near_expiry' | 'expired' | 'low_stock' | 'out_of_stock'>('all')
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)

  // Spoilage Logs State
  const [spoilageLogs, setSpoilageLogs] = useState<SpoilageLogItem[]>([])
  const [spoilageMetrics, setSpoilageMetrics] = useState<SpoilageMetrics>({
    totalLossValuation: 0,
    totalUnitsDiscarded: 0,
    totalIncidents: 0,
    reasonCounts: {},
  })
  const [loadingSpoilage, setLoadingSpoilage] = useState(false)

  // Notification feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Add Product Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
  const [addProductForm, setAddProductForm] = useState({
    name: '',
    category: 'produce',
    unit: 'kg',
    basePrice: '',
    imageUrl: '',
    active: true,
    initialQuantity: '',
    costPrice: '',
    expiryDate: '',
  })
  const [isSubmittingAddProduct, setIsSubmittingAddProduct] = useState(false)

  // Receive Stock Modal State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [receivingProduct, setReceivingProduct] = useState<ProductItem | null>(null)
  const [receiveForm, setReceiveForm] = useState({
    productId: '',
    quantity: '',
    costPrice: '',
    expiryDate: '',
  })
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false)

  // Edit Product Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    unit: '',
    basePrice: '',
    active: true,
  })
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // Discard / Spoilage Modal State
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false)
  const [discardTarget, setDiscardTarget] = useState<{
    productId: string
    productName: string
    batchId: string
    maxQty: number
    costPrice: number
    unit: string
  } | null>(null)
  const [discardForm, setDiscardForm] = useState({
    quantity: '',
    reason: 'expired',
    notes: '',
  })
  const [isSubmittingDiscard, setIsSubmittingDiscard] = useState(false)

  const fetchInventory = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      const res = await fetch('/api/admin/inventory')
      const data = await res.json()
      if (data.success) {
        setProducts(data.products || [])
        setMetrics(data.metrics || {
          totalSkus: 0,
          totalStockUnits: 0,
          totalValuation: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          nearExpiryBatchesCount: 0,
          nearExpiryProductsCount: 0,
          expiredProductsCount: 0,
          expiredBatchesAutoPurged: 0,
        })
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  const fetchSpoilage = async () => {
    try {
      setLoadingSpoilage(true)
      const res = await fetch('/api/admin/inventory/spoilage')
      const data = await res.json()
      if (data.success) {
        setSpoilageLogs(data.logs || [])
        setSpoilageMetrics(data.metrics || {
          totalLossValuation: 0,
          totalUnitsDiscarded: 0,
          totalIncidents: 0,
          reasonCounts: {},
        })
      }
    } catch (err) {
      console.error('Failed to fetch spoilage logs:', err)
    } finally {
      setLoadingSpoilage(false)
    }
  }

  useEffect(() => {
    fetchInventory(true)
    fetchSpoilage()
    const interval = setInterval(() => fetchInventory(false), 5000)
    return () => clearInterval(interval)
  }, [])

  // Open Add Product Modal
  const handleOpenAddProduct = (presetCategory = 'produce') => {
    setAddProductForm({
      name: '',
      category: presetCategory === 'all' ? 'produce' : presetCategory,
      unit: 'kg',
      basePrice: '',
      imageUrl: '',
      active: true,
      initialQuantity: '',
      costPrice: '',
      expiryDate: '',
    })
    setIsAddProductModalOpen(true)
  }

  // Submit Add Product
  const handleSubmitAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addProductForm.name.trim() || !addProductForm.basePrice) {
      setFeedback({ type: 'error', message: 'Please enter the product name and selling price.' })
      return
    }

    setIsSubmittingAddProduct(true)
    try {
      const res = await fetch('/api/admin/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addProductForm),
      })

      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || '✓ Product added successfully to your store!' })
        setIsAddProductModalOpen(false)
        fetchInventory(false)
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to add product.' })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error while adding product.' })
    } finally {
      setIsSubmittingAddProduct(false)
    }
  }

  // Open Receive Modal
  const handleOpenReceive = (product?: ProductItem) => {
    if (product) {
      setReceivingProduct(product)
      setReceiveForm({
        productId: product.id,
        quantity: '',
        costPrice: product.avgCostPrice > 0 ? String(Math.round(product.avgCostPrice)) : '',
        expiryDate: '',
      })
    } else {
      setReceivingProduct(null)
      setReceiveForm({
        productId: products[0]?.id || '',
        quantity: '',
        costPrice: '',
        expiryDate: '',
      })
    }
    setIsReceiveModalOpen(true)
  }

  // Submit Receive Batch
  const handleSubmitReceive = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiveForm.productId || !receiveForm.quantity || !receiveForm.expiryDate) {
      setFeedback({ type: 'error', message: 'Please fill in quantity, supplier cost, and expiration date.' })
      return
    }

    setIsSubmittingReceive(true)
    try {
      const res = await fetch('/api/admin/inventory/receive-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: receiveForm.productId,
          quantity: Number(receiveForm.quantity),
          costPrice: Number(receiveForm.costPrice) || 0,
          expiryDate: receiveForm.expiryDate,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', message: '✓ New stock delivery received and added to inventory!' })
        setIsReceiveModalOpen(false)
        fetchInventory(false)
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to receive stock.' })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error while receiving stock.' })
    } finally {
      setIsSubmittingReceive(false)
    }
  }

  // Open Edit Product Modal
  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      basePrice: String(product.basePrice),
      active: product.active,
    })
    setIsEditModalOpen(true)
  }

  // Submit Edit Product
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    setIsSubmittingEdit(true)
    try {
      const res = await fetch(`/api/admin/inventory/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
          unit: editForm.unit,
          basePrice: Number(editForm.basePrice),
          active: editForm.active,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', message: `✓ Updated "${editForm.name}" successfully!` })
        setIsEditModalOpen(false)
        fetchInventory(false)
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update product.' })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error while updating product.' })
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // Open Discard Modal
  const handleOpenDiscard = (product: ProductItem, batch: InventoryBatch) => {
    setDiscardTarget({
      productId: product.id,
      productName: product.name,
      batchId: batch.id,
      maxQty: batch.quantity,
      costPrice: batch.costPrice,
      unit: product.unit,
    })
    setDiscardForm({
      quantity: String(batch.quantity),
      reason: 'expired',
      notes: '',
    })
    setIsDiscardModalOpen(true)
  }

  // Submit Discard Spoilage Batch
  const handleSubmitDiscard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!discardTarget) return

    const qty = Number(discardForm.quantity)
    if (isNaN(qty) || qty <= 0 || qty > discardTarget.maxQty) {
      setFeedback({ type: 'error', message: `Please enter a quantity between 1 and ${discardTarget.maxQty}.` })
      return
    }

    setIsSubmittingDiscard(true)
    try {
      const res = await fetch('/api/admin/inventory/spoilage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: discardTarget.productId,
          batchId: discardTarget.batchId,
          quantity: qty,
          reason: discardForm.reason,
          notes: discardForm.notes,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || '✓ Damaged/expired stock removed and logged.' })
        setIsDiscardModalOpen(false)
        fetchInventory(false)
        fetchSpoilage()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to remove batch.' })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error while recording spoilage.' })
    } finally {
      setIsSubmittingDiscard(false)
    }
  }

  // Filtered Products (Strictly Separated Low Stock vs Out of Stock vs Expired)
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDept =
      selectedDept === 'all' || p.category.toLowerCase().includes(selectedDept.toLowerCase())

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'near_expiry'
        ? p.hasNearExpiry && p.totalStock > 0
        : statusFilter === 'expired'
        ? !!p.isExpired
        : statusFilter === 'low_stock'
        ? p.totalStock > 0 && p.totalStock <= 10
        : statusFilter === 'out_of_stock'
        ? p.totalStock === 0 && !p.isExpired
        : true

    return matchesSearch && matchesDept && matchesStatus
  })

  const getDaysUntilExpiry = (expiryDateStr: string) => {
    const now = new Date().getTime()
    const exp = new Date(expiryDateStr).getTime()
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Inventory & Stock Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your grocery stock levels, expiration dates, and track damaged or expired items.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-bold border border-gray-200">
            <button
              onClick={() => setViewMode('catalog')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'catalog' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              📦 Current Stock & Batches
            </button>
            <button
              onClick={() => {
                setViewMode('spoilage_log')
                fetchSpoilage()
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'spoilage_log' ? 'bg-white text-red-700 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              📉 Damaged & Expired Log
            </button>
          </div>

          <button
            onClick={() => handleOpenAddProduct(selectedDept)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>+ Add New Product</span>
          </button>

          <button
            onClick={() => handleOpenReceive()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>+ Receive Stock Delivery</span>
          </button>
        </div>
      </div>

      {/* Auto-Purge Banner */}
      {metrics.expiredBatchesAutoPurged > 0 && (
        <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-4 text-xs text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🛡️</span>
            <div>
              <span className="font-bold">Automatic Food Freshness Guard: </span>
              <span>{metrics.expiredBatchesAutoPurged} expired food batch(es) reached their expiration date and were automatically removed from the store so customers cannot buy them.</span>
            </div>
          </div>
          <span className="font-mono text-[11px] bg-white px-2 py-1 rounded-lg border border-amber-200 font-bold text-amber-800">
            Auto-Removed
          </span>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rounded-xl p-4 text-xs font-bold flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-gray-800 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: CATALOG & BATCH MATRIX */}
      {viewMode === 'catalog' && (
        <div className="space-y-6">
          {/* Top Metric Cards in Plain Human Language */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Products</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{metrics.totalSkus.toLocaleString('en-PH')}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Active items in store</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Stock on Hand</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.totalStockUnits.toLocaleString('en-PH')}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Available to sell</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Stock Value</p>
              <p className="text-2xl font-black text-gray-900 mt-1">₱{metrics.totalValuation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Total purchase cost</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Running Low (1–10)</p>
              <p className={`text-2xl font-black mt-1 ${metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {metrics.lowStockCount.toLocaleString('en-PH')}
              </p>
              <p className="text-[10px] text-amber-600/80 mt-0.5">1 to 10 items left (excludes 0)</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Expiring in 7 Days</p>
              <p className={`text-2xl font-black mt-1 ${metrics.nearExpiryBatchesCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {metrics.nearExpiryBatchesCount.toLocaleString('en-PH')}
              </p>
              <p className="text-[10px] text-red-600/80 mt-0.5">{metrics.nearExpiryProductsCount.toLocaleString('en-PH')} items on clearance sale</p>
            </div>
          </div>

          {/* Department Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.key}
                onClick={() => setSelectedDept(dept.key)}
                className={`px-3.5 py-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                  selectedDept === dept.key
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {dept.label}
              </button>
            ))}
          </div>

          {/* Filter Pills with Dedicated Expired and Strictly Separated Low Stock vs Out of Stock */}
          <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Products ({products.length.toLocaleString('en-PH')})
            </button>

            <button
              onClick={() => setStatusFilter('near_expiry')}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'near_expiry'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
              }`}
            >
              <span>⚡ Expiring Soon (&lt;7 Days)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'near_expiry' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800'
              }`}>
                {metrics.nearExpiryProductsCount.toLocaleString('en-PH')}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'expired'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span>🚫 Expired Items</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'expired' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {(metrics.expiredProductsCount ?? products.filter((p) => p.isExpired).length).toLocaleString('en-PH')}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('low_stock')}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'low_stock'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span>⚠️ Low Stock (1–10 items)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'low_stock' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {(metrics.lowStockCount ?? products.filter((p) => p.totalStock > 0 && p.totalStock <= 10).length).toLocaleString('en-PH')}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'out_of_stock'
                  ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>❌ Out of Stock (0 items)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'out_of_stock' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
              }`}>
                {(metrics.outOfStockCount ?? products.filter((p) => p.totalStock === 0).length).toLocaleString('en-PH')}
              </span>
            </button>
          </div>

          {/* Product Table Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by product name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <span className="text-xs font-semibold text-gray-500">
                Showing {filteredProducts.length} of {products.length} products
              </span>
            </div>

            {/* Table with Clear Human Columns */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-xs text-gray-500 font-medium">
                  Loading product inventory...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-500">
                  No products found matching your search.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Customer Price (Selling)</th>
                      <th className="px-4 py-3.5">Supplier Cost & Profit</th>
                      <th className="px-4 py-3.5">Stock on Hand</th>
                      <th className="px-4 py-3.5">Freshness & Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((product) => {
                      const isExpanded = expandedProductId === product.id
                      const activeBatches = product.batches.filter((b) => Number(b.quantity) > 0)
                      const earliestExpiry = activeBatches[0]?.expiryDate

                      return (
                        <React.Fragment key={product.id}>
                          <tr className={`hover:bg-gray-50/60 transition-colors ${product.hasNearExpiry ? 'bg-red-50/20' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 shrink-0 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden">
                                  {product.imageUrl ? (
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      fill
                                      sizes="40px"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold text-xs">
                                      {product.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{product.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                                    <span className="font-mono">#{product.id.slice(0, 8)}</span>
                                    <span>•</span>
                                    <span>Sold per {product.unit}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-gray-600 capitalize font-medium">
                              {product.category}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className={`font-black text-sm ${product.isClearance ? 'text-red-600' : 'text-gray-900'}`}>
                                  ₱{Number(product.effectivePrice ?? product.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {product.isClearance && (
                                  <span className="text-xs text-gray-400 line-through font-semibold">
                                    ₱{Number(product.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">Customer pays this</p>
                              {product.isClearance && product.markdownBadge && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-black bg-red-100 text-red-700">
                                  {product.markdownBadge}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-gray-900 font-semibold">
                                ₱{Number(product.avgCostPrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className={`text-[11px] font-bold ${product.marginPct >= 20 ? 'text-emerald-700' : 'text-amber-600'}`}>
                                {product.marginPct}% profit margin
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-base text-gray-900">
                                  {Number(product.totalStock).toLocaleString('en-PH')}
                                </span>
                                <span className="text-[11px] text-gray-400 font-medium">
                                  {product.unit}s
                                </span>
                              </div>
                              {earliestExpiry && (
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  Earliest exp: {new Date(earliestExpiry).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                {product.isExpired ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                      🚫 Expired (0 in stock)
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    {product.hasNearExpiry && product.totalStock > 0 && (
                                      <div>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                                          ⚡ Clearance ({Number(product.nearExpiryUnits).toLocaleString('en-PH')} items &lt;7d)
                                        </span>
                                      </div>
                                    )}

                                    <div>
                                      {product.healthStatus === 'healthy' && !product.hasNearExpiry && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          In Stock ({Number(product.totalStock).toLocaleString('en-PH')})
                                        </span>
                                      )}
                                      {product.healthStatus === 'low_stock' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                          Low Stock ({Number(product.totalStock).toLocaleString('en-PH')} left)
                                        </span>
                                      )}
                                      {product.healthStatus === 'out_of_stock' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                                          Out of Stock (Sold Out)
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenReceive(product)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 bg-white px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Add new delivery shipment"
                                >
                                  + Add Stock
                                </button>

                                <button
                                  onClick={() => handleOpenEdit(product)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                                  title="Change price or details"
                                >
                                  Edit Price
                                </button>

                                <button
                                  onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                                  className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    isExpanded
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                  }`}
                                  title="View individual stock delivery batches"
                                >
                                  <svg
                                    className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Batch Drawer (FEFO Explained) */}
                          {isExpanded && (
                            <tr className="bg-emerald-50/30 border-b border-gray-100">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="rounded-xl bg-white p-4 border border-emerald-200/80 shadow-xs space-y-3">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Stock Delivery Batches for {product.name}
                                      </span>
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                        {product.batches.length} Batch(es)
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-gray-500">
                                      * Oldest/earliest-expiring batches are automatically sold to customers first (First-Expired, First-Out).
                                    </span>
                                  </div>

                                  {product.batches.length === 0 ? (
                                    <p className="text-xs text-gray-400 py-2">
                                      No stock batches recorded yet. Click "+ Add Stock" to add your first delivery.
                                    </p>
                                  ) : (
                                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden text-xs">
                                      <div className="bg-gray-50 px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider grid grid-cols-6">
                                        <span>Batch ID</span>
                                        <span>Date Received</span>
                                        <span>Expiration Date</span>
                                        <span>Items Remaining</span>
                                        <span>Supplier Cost (Per Item)</span>
                                        <span className="text-right">Action</span>
                                      </div>

                                      {product.batches.map((batch) => {
                                        const daysLeft = getDaysUntilExpiry(batch.expiryDate)
                                        const isExpired = daysLeft <= 0 || batch.quantity === 0
                                        const isCritical = daysLeft > 0 && daysLeft <= 7

                                        return (
                                          <div
                                            key={batch.id}
                                            className={`px-4 py-2.5 grid grid-cols-6 items-center transition-colors ${
                                              isCritical ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50/80'
                                            }`}
                                          >
                                            <span className="font-mono font-bold text-gray-700">
                                              #{batch.id.slice(0, 8)}
                                            </span>

                                            <span className="text-gray-500">
                                              {new Date(batch.receivedAt).toLocaleDateString('en-PH', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                              })}
                                            </span>

                                            <div>
                                              <span className="font-semibold text-gray-900">
                                                {new Date(batch.expiryDate).toLocaleDateString('en-PH', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                                })}
                                              </span>
                                              {isExpired ? (
                                                <span className="ml-2 text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                  Removed (0 stock)
                                                </span>
                                              ) : isCritical ? (
                                                <span className="ml-2 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                                  ⚡ {daysLeft}d left (On Sale)
                                                </span>
                                              ) : (
                                                <span className="ml-2 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                                  {daysLeft}d left (Fresh)
                                                </span>
                                              )}
                                            </div>

                                            <span className={`font-bold ${batch.quantity === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                                              {Number(batch.quantity).toLocaleString('en-PH')} {product.unit}s
                                            </span>

                                            <span className="text-gray-700 font-medium">
                                              ₱{Number(batch.costPrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>

                                            <div className="text-right">
                                              {batch.quantity > 0 && (
                                                <button
                                                  onClick={() => handleOpenDiscard(product, batch)}
                                                  className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                                                >
                                                  Remove / Record Damage
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAMAGED & EXPIRED LOG */}
      {viewMode === 'spoilage_log' && (
        <div className="space-y-6">
          {/* Spoilage Loss Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">Total Money Lost to Spoilage / Damage</p>
              <p className="text-3xl font-black text-red-700 mt-1">
                ₱{spoilageMetrics.totalLossValuation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Based on supplier purchase cost</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Damaged / Expired Items Removed</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{spoilageMetrics.totalUnitsDiscarded.toLocaleString('en-PH')}</p>
              <p className="text-[11px] text-gray-400 mt-1">Total items across {spoilageMetrics.totalIncidents.toLocaleString('en-PH')} incident(s)</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Breakdown by Reason</p>
              <div className="mt-2 space-y-1 text-xs">
                {Object.entries(spoilageMetrics.reasonCounts).length === 0 ? (
                  <p className="text-gray-400 text-[11px]">No damaged or expired items recorded yet.</p>
                ) : (
                  Object.entries(spoilageMetrics.reasonCounts).map(([reason, stats]) => (
                    <div key={reason} className="flex justify-between items-center text-[11px]">
                      <span className="capitalize text-gray-600 font-semibold">{reason.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-gray-900">₱{stats.loss.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({stats.count.toLocaleString('en-PH')}x)</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Historical Log Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Historical Damaged & Expired Items Log</h3>
                <p className="text-[11px] text-gray-500">Complete record of every removed food item and why it was discarded</p>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {spoilageLogs.length.toLocaleString('en-PH')} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              {loadingSpoilage ? (
                <div className="p-12 text-center text-xs text-gray-500">Loading records...</div>
              ) : spoilageLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400">
                  No damaged or expired items logged yet. When you remove a damaged batch, it will appear here.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5">Date & Time</th>
                      <th className="px-4 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Items Removed</th>
                      <th className="px-4 py-3.5">Money Lost (₱)</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Logged By & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {spoilageLogs.map((log) => {
                      const reasonColors: Record<string, string> = {
                        expired: 'bg-red-50 text-red-700 border-red-200',
                        damaged_packaging: 'bg-amber-50 text-amber-700 border-amber-200',
                        bruised_produce: 'bg-orange-50 text-orange-700 border-orange-200',
                        cold_chain_failure: 'bg-blue-50 text-blue-700 border-blue-200',
                        other: 'bg-gray-50 text-gray-700 border-gray-200',
                      }

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="font-bold text-gray-900">{log.Product?.name || 'Product'}</p>
                            <p className="text-[10px] text-gray-400 capitalize">{log.Product?.category} • #{log.productId.slice(0, 8)}</p>
                          </td>

                          <td className="px-4 py-3.5 font-bold text-gray-900">
                            {Number(log.quantity).toLocaleString('en-PH')} {log.Product?.unit || 'units'}
                          </td>

                          <td className="px-4 py-3.5 font-black text-red-600">
                            ₱{Number(log.totalLossValuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                              reasonColors[log.reason] || 'bg-gray-50 text-gray-700'
                            }`}>
                              {log.reason.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 max-w-xs">
                            <p className="font-semibold text-gray-800">{log.discardedBy || 'Admin'}</p>
                            {log.notes && (
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">{log.notes}</p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Add New Product */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Add New Product to Store
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Enter product details, selling price, and initial delivery</p>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAddProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Baguio Strawberries (500g)"
                  value={addProductForm.name}
                  onChange={(e) => setAddProductForm({ ...addProductForm, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={addProductForm.category}
                    onChange={(e) => setAddProductForm({ ...addProductForm, category: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold focus:border-emerald-500 outline-none"
                  >
                    <option value="produce">Produce (Fruits & Vegetables)</option>
                    <option value="meat">Fresh Meat & Poultry</option>
                    <option value="seafood">Fresh Seafood & Fish</option>
                    <option value="dairy">Dairy & Eggs</option>
                    <option value="rice">Rice & Grains</option>
                    <option value="pantry">Pantry Essentials</option>
                    <option value="frozen">Frozen Goods</option>
                    <option value="beverages">Beverages & Coffee</option>
                    <option value="snacks">Snacks & Noodles</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sold By Unit *</label>
                  <select
                    value={addProductForm.unit}
                    onChange={(e) => setAddProductForm({ ...addProductForm, unit: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold focus:border-emerald-500 outline-none"
                  >
                    <option value="kg">per Kilogram (kg)</option>
                    <option value="pack">per Pack</option>
                    <option value="each">per Piece (each)</option>
                    <option value="tray">per Tray (e.g. eggs)</option>
                    <option value="bottle">per Bottle</option>
                    <option value="can">per Can</option>
                    <option value="box">per Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Customer Selling Price (₱) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 195.00"
                    value={addProductForm.basePrice}
                    onChange={(e) => setAddProductForm({ ...addProductForm, basePrice: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none font-bold"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    🏷️ <strong>What customers pay:</strong> The retail price displayed to customers on the website.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={addProductForm.imageUrl}
                    onChange={(e) => setAddProductForm({ ...addProductForm, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Leave empty to use category icon</p>
                </div>
              </div>

              {/* Initial Delivery Batch Section */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
                <div>
                  <p className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                    First Delivery Shipment (Initial Stock Batch)
                  </p>
                  <p className="text-[10px] text-gray-500">Optional — you can also add stock later</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Quantity Received</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 25"
                      value={addProductForm.initialQuantity}
                      onChange={(e) => setAddProductForm({ ...addProductForm, initialQuantity: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs bg-white focus:border-emerald-500 outline-none font-bold"
                    />
                    <p className="text-[9px] text-gray-400 mt-0.5">Number of items</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Supplier Cost (₱)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 130.00"
                      value={addProductForm.costPrice}
                      onChange={(e) => setAddProductForm({ ...addProductForm, costPrice: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs bg-white focus:border-emerald-500 outline-none font-bold"
                    />
                    <p className="text-[9px] text-gray-500 mt-0.5 font-medium">💰 <strong>Your Capital:</strong> What you paid supplier</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Expiration Date</label>
                    <input
                      type="date"
                      value={addProductForm.expiryDate}
                      onChange={(e) => setAddProductForm({ ...addProductForm, expiryDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs bg-white focus:border-emerald-500 outline-none"
                    />
                    <p className="text-[9px] text-gray-400 mt-0.5">Expiry on packaging</p>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={addProductForm.active}
                    onChange={(e) => setAddProductForm({ ...addProductForm, active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show in store immediately (Active)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddProduct}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmittingAddProduct ? 'Adding Product...' : 'Add Product to Store →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Receive Stock Delivery */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Receive Stock Delivery (+ Batch)
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Add fresh delivery shipment from your supplier</p>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReceive} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Being Delivered *</label>
                {receivingProduct ? (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 font-bold text-gray-900">
                    {receivingProduct.name} ({receivingProduct.unit})
                  </div>
                ) : (
                  <select
                    required
                    value={receiveForm.productId}
                    onChange={(e) => setReceiveForm({ ...receiveForm, productId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold focus:border-emerald-500 outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) - Customer Selling Price: ₱{p.basePrice}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Quantity Received *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 50"
                  value={receiveForm.quantity}
                  onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none font-bold"
                />
                <p className="text-[10px] text-gray-400 mt-1">Number of units/items in this delivery</p>
              </div>

              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Supplier Purchase Cost per Item (₱) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="e.g. 85.00"
                  value={receiveForm.costPrice}
                  onChange={(e) => setReceiveForm({ ...receiveForm, costPrice: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none font-bold"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  💰 <strong>Your Capital:</strong> What you paid your supplier per piece for this delivery batch.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Food Expiration Date *</label>
                <input
                  type="date"
                  required
                  value={receiveForm.expiryDate}
                  onChange={(e) => setReceiveForm({ ...receiveForm, expiryDate: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  📅 The store will automatically sell this delivery first before newer deliveries.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceive}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmittingReceive ? 'Receiving...' : 'Add Stock Delivery →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Product Details */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Edit Product & Selling Price
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Update product name, category, or customer retail price</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sold By Unit *</label>
                  <input
                    type="text"
                    required
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Customer Selling Price (₱) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={editForm.basePrice}
                  onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 outline-none font-bold"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  🏷️ <strong>What customers pay:</strong> The regular price charged to shoppers on the storefront.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Visible to customers in the store</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Discard / Damaged Food Modal */}
      {isDiscardModalOpen && discardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-red-700">
                  Remove Damaged or Expired Food
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Deduct damaged items from stock and record the financial loss</p>
              </div>
              <button
                onClick={() => setIsDiscardModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDiscard} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 space-y-1">
                <p className="font-bold text-red-950">{discardTarget.productName}</p>
                <p className="text-[11px] text-red-700">
                  Batch: #{discardTarget.batchId.slice(0, 8)} • Max in stock: {discardTarget.maxQty} {discardTarget.unit}s
                </p>
                <p className="text-[11px] text-red-700">
                  Supplier Cost: ₱{Number(discardTarget.costPrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per item
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">How Many Items to Remove? *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={discardTarget.maxQty}
                  step="any"
                  value={discardForm.quantity}
                  onChange={(e) => setDiscardForm({ ...discardForm, quantity: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-red-500 outline-none font-bold"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  💸 <strong>Estimated Money Lost:</strong> ₱{(((Number(discardForm.quantity) || 0) * discardTarget.costPrice)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Calculated from your supplier purchase cost)
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Removal *</label>
                <select
                  value={discardForm.reason}
                  onChange={(e) => setDiscardForm({ ...discardForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold focus:border-red-500 outline-none"
                >
                  <option value="expired">🍎 Food Reached Expiration Date</option>
                  <option value="damaged_packaging">📦 Damaged Box / Torn Packaging / Broken Seal</option>
                  <option value="bruised_produce">🥑 Bruised / Spoiled Fruits or Vegetables</option>
                  <option value="cold_chain_failure">❄️ Chiller / Freezer Temperature Breakdown</option>
                  <option value="other">📝 Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notes / What Happened?</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Box fell during delivery, produce bruised upon opening..."
                  value={discardForm.notes}
                  onChange={(e) => setDiscardForm({ ...discardForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-red-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDiscardModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDiscard}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmittingDiscard ? 'Removing...' : 'Remove Stock & Log Loss →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
