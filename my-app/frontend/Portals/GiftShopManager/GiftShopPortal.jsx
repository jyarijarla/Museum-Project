import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './GiftShopPortal.css'
import ProfileMenu from '../../components/ProfileMenu.jsx'
import { useAuth } from '../../../src/AuthContext.jsx'



export default function GiftShopPortal() {
  const { user } = useAuth()
  const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : ''

  // ── Shared ──
  const [metrics, setMetrics]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('products')

  // ── Products & Inventory ──
  const [products, setProducts]       = useState(null)
  const [prodLoading, setProdLoading] = useState(false)
  const [prodError, setProdError]     = useState('')
  const [pf, setPf] = useState({ productName: '', dateFrom: '', dateTo: '', stockStatus: '', sortBy: 'name_asc' })
  const [editingStock, setEditingStock] = useState({})
  const [savingStock,  setSavingStock]  = useState(new Set())
  const [restockModal,  setRestockModal]  = useState(null) // { product, addQty }
  const [restockSaving, setRestockSaving] = useState(false)
  const [restockError,  setRestockError]  = useState('')

  // ── Low Stock Panel ──
  const [lowStockItems,   setLowStockItems]   = useState(null)
  const [lowStockLoading, setLowStockLoading] = useState(false)
  const [lowStockError,   setLowStockError]   = useState('')

  // ── Add Product ──
  const BLANK_PRODUCT = { name: '', description: '', retailPrice: '', stockQuantity: '0', lowStockThreshold: '5', imageURL: '' }
  const [addModal,   setAddModal]   = useState(false)
  const [addForm,    setAddForm]    = useState(BLANK_PRODUCT)
  const [addSaving,  setAddSaving]  = useState(false)
  const [addError,   setAddError]   = useState('')
  const setAF = (key, val) => setAddForm(prev => ({ ...prev, [key]: val }))

  // ── Edit Product ──
  const [editModal,   setEditModal]   = useState(false)
  const [editForm,    setEditForm]    = useState(BLANK_PRODUCT)
  const [editId,      setEditId]      = useState(null)
  const [editSaving,  setEditSaving]  = useState(false)
  const [editError,   setEditError]   = useState('')
  const setEF = (key, val) => setEditForm(prev => ({ ...prev, [key]: val }))

  // ── Delete Product ──
  const [deleteTarget,  setDeleteTarget]  = useState(null) // product object
  const [deleteSaving,  setDeleteSaving]  = useState(false)
  const [deleteError,   setDeleteError]   = useState('')

  // ── Sales Report ──
  const [transactions, setTransactions] = useState([])
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', sortBy: 'date_desc' })
  const [rptRows,    setRptRows]    = useState(null)
  const [rptLoading, setRptLoading] = useState(false)
  const [rptError,   setRptError]   = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/giftshop/metrics`).then(r => r.json()),
      fetch(`${apiBase}/api/giftshop/transactions?limit=20`).then(r => r.json()),
    ]).then(([m, t]) => {
      if (m && !m.error) setMetrics(m)
      if (t?.transactions) setTransactions(t.transactions)
    }).catch(() => {}).finally(() => setLoading(false))
    // Auto-load product list and low-stock list
    fetchProducts()
    fetchLowStock()
  }, [apiBase]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLowStock = async () => {
    setLowStockLoading(true); setLowStockError('')
    try {
      const res  = await fetch(`${apiBase}/api/giftshop/products/low-stock`)
      const data = await res.json()
      if (!res.ok) { setLowStockError(data.error || 'Failed to load low-stock items'); return }
      setLowStockItems(data.products || [])
    } catch { setLowStockError('Network error.') }
    finally { setLowStockLoading(false) }
  }

  const setPfKey = (key, val) => setPf(prev => ({ ...prev, [key]: val }))
  const setF     = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))

  const fetchProducts = async (overrides = {}) => {
    const f = { ...pf, ...overrides }
    setProdLoading(true); setProdError('')
    try {
      const p = new URLSearchParams()
      if (f.productName) p.set('productName', f.productName)
      if (f.dateFrom)    p.set('dateFrom',    f.dateFrom)
      if (f.dateTo)      p.set('dateTo',      f.dateTo)
      if (f.stockStatus) p.set('stockStatus', f.stockStatus)
      if (f.sortBy)      p.set('sortBy',      f.sortBy)
      const res  = await fetch(`${apiBase}/api/giftshop/products/analytics?${p}`)
      const data = await res.json()
      if (!res.ok) { setProdError(data.error || 'Failed to load products'); return }
      setProducts(data.products || [])
    } catch { setProdError('Network error.') }
    finally { setProdLoading(false) }
  }

  // No auto-load — user clicks Apply Filters to populate the table

  const saveStock = async (productId, newQty) => {
    const qty = parseInt(newQty, 10)
    if (!Number.isFinite(qty) || qty < 0) return
    setSavingStock(prev => new Set([...prev, productId]))
    try {
      const res = await fetch(`${apiBase}/api/giftshop/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: qty }),
      })
      if (res.ok) {
        setProducts(prev => prev?.map(p => p.ProductID === productId ? { ...p, StockQuantity: qty } : p) ?? prev)
        setLowStockItems(prev => prev?.map(p => p.ProductID === productId ? { ...p, StockQuantity: qty } : p) ?? prev)
        setEditingStock(prev => { const n = { ...prev }; delete n[productId]; return n })
        // Refresh metric card and low-stock list
        fetch(`${apiBase}/api/giftshop/metrics`).then(r => r.json()).then(m => { if (m && !m.error) setMetrics(m) }).catch(() => {})
        fetchLowStock()
      }
    } catch {}
    finally { setSavingStock(prev => { const n = new Set(prev); n.delete(productId); return n }) }
  }

  const openAddProduct  = () => { setAddForm(BLANK_PRODUCT); setAddError(''); setAddModal(true) }
  const closeAddProduct = () => { setAddModal(false); setAddError('') }
  const submitAddProduct = async () => {
    if (!addForm.name.trim()) { setAddError('Name is required.'); return }
    const price = parseFloat(addForm.retailPrice)
    if (!Number.isFinite(price) || price < 0) { setAddError('Enter a valid retail price.'); return }
    setAddSaving(true); setAddError('')
    try {
      const res = await fetch(`${apiBase}/api/giftshop/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          description: addForm.description.trim() || null,
          retailPrice: price,
          stockQuantity: parseInt(addForm.stockQuantity, 10) || 0,
          lowStockThreshold: parseInt(addForm.lowStockThreshold, 10) || 5,
          imageURL: addForm.imageURL.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Failed to add product.'); return }
      // Refresh metrics and products list if currently shown
      fetch(`${apiBase}/api/giftshop/metrics`).then(r => r.json()).then(m => { if (m && !m.error) setMetrics(m) }).catch(() => {})
      if (products !== null) fetchProducts()
      closeAddProduct()
    } catch { setAddError('Network error.') }
    finally { setAddSaving(false) }
  }

  const openEditProduct = (product) => {
    setEditId(product.ProductID)
    setEditForm({
      name: product.Name || '',
      description: product.Description || '',
      retailPrice: String(parseFloat(product.RetailPrice) || ''),
      stockQuantity: String(product.StockQuantity ?? 0),
      lowStockThreshold: String(product.LowStockThreshold ?? 5),
      imageURL: product.imageURL || product.ImageURL || '',
    })
    setEditError('')
    setEditModal(true)
  }
  const closeEditProduct = () => { setEditModal(false); setEditError('') }
  const submitEditProduct = async () => {
    if (!editForm.name.trim()) { setEditError('Name is required.'); return }
    const price = parseFloat(editForm.retailPrice)
    if (!Number.isFinite(price) || price < 0) { setEditError('Enter a valid retail price.'); return }
    setEditSaving(true); setEditError('')
    try {
      const res = await fetch(`${apiBase}/api/giftshop/products/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          retailPrice: price,
          stockQuantity: parseInt(editForm.stockQuantity, 10) || 0,
          lowStockThreshold: parseInt(editForm.lowStockThreshold, 10) || 5,
          imageURL: editForm.imageURL.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || 'Failed to update product.'); return }
      fetch(`${apiBase}/api/giftshop/metrics`).then(r => r.json()).then(m => { if (m && !m.error) setMetrics(m) }).catch(() => {})
      if (products !== null) fetchProducts()
      fetchLowStock()
      closeEditProduct()
    } catch { setEditError('Network error.') }
    finally { setEditSaving(false) }
  }

  const openDeleteProduct = (product) => { setDeleteTarget(product); setDeleteError('') }
  const closeDeleteProduct = () => { setDeleteTarget(null); setDeleteError('') }
  const submitDeleteProduct = async () => {
    if (!deleteTarget) return
    setDeleteSaving(true); setDeleteError('')
    try {
      const res = await fetch(`${apiBase}/api/giftshop/products/${deleteTarget.ProductID}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error || 'Failed to delete product.'); return }
      fetch(`${apiBase}/api/giftshop/metrics`).then(r => r.json()).then(m => { if (m && !m.error) setMetrics(m) }).catch(() => {})
      setProducts(prev => prev?.filter(p => p.ProductID !== deleteTarget.ProductID) ?? prev)
      fetchLowStock()
      closeDeleteProduct()
    } catch { setDeleteError('Network error.') }
    finally { setDeleteSaving(false) }
  }

  const openRestock  = (product) => { setRestockModal({ product, addQty: '' }); setRestockError('') }
  const closeRestock = () => { setRestockModal(null); setRestockError('') }
  const submitRestock = async () => {
    const add = parseInt(restockModal.addQty, 10)
    if (!Number.isFinite(add) || add <= 0) { setRestockError('Enter a positive quantity to add.'); return }
    const newQty = restockModal.product.StockQuantity + add
    setRestockSaving(true); setRestockError('')
    try {
      const res = await fetch(`${apiBase}/api/giftshop/products/${restockModal.product.ProductID}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newQty }),
      })
      if (res.ok) {
        setProducts(prev => prev?.map(p => p.ProductID === restockModal.product.ProductID ? { ...p, StockQuantity: newQty } : p) ?? prev)
        setLowStockItems(prev => prev?.map(p => p.ProductID === restockModal.product.ProductID ? { ...p, StockQuantity: newQty } : p) ?? prev)
        fetch(`${apiBase}/api/giftshop/metrics`).then(r => r.json()).then(m => { if (m && !m.error) setMetrics(m) }).catch(() => {})
        fetchLowStock()
        closeRestock()
      } else {
        const d = await res.json()
        setRestockError(d.error || 'Failed to update stock.')
      }
    } catch { setRestockError('Network error.') }
    finally { setRestockSaving(false) }
  }

  const exportProdCSV = () => {
    if (!products?.length) return
    const headers = ['Product', 'Price ($)', 'Stock', 'Threshold', 'Qty Sold', 'Revenue ($)', 'Orders', 'Avg Qty/Order', 'Last Sold']
    const body = products.map(p => [
      p.Name, parseFloat(p.RetailPrice).toFixed(2), p.StockQuantity, p.LowStockThreshold,
      p.TotalQtySold, parseFloat(p.TotalRevenue).toFixed(2), p.NumTransactions,
      parseFloat(p.AvgQtyPerTxn || 0).toFixed(2), p.LastSoldDate ? String(p.LastSoldDate).slice(0, 10) : '',
    ])
    const csv = [headers, ...body].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `giftshop-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const generateReport = async () => {
    setRptLoading(true); setRptError('')
    try {
      const p = new URLSearchParams()
      if (filters.search)   p.set('search',   filters.search)
      if (filters.dateFrom) p.set('dateFrom', filters.dateFrom)
      if (filters.dateTo)   p.set('dateTo',   filters.dateTo)
      if (filters.sortBy)   p.set('sortBy',   filters.sortBy)
      const res = await fetch(`${apiBase}/api/giftshop/report?${p}`)
      const data = await res.json()
      if (!res.ok) { setRptError(data.error || 'Report failed.'); return }
      setRptRows(data.rows || [])
    } catch { setRptError('Network error.') }
    finally { setRptLoading(false) }
  }

  const exportRptCSV = () => {
    if (!rptRows?.length) return
    const headers = ['Txn ID', 'Date', 'Visitor', 'Username', 'Product', 'Qty', 'Price ($)', 'Line Total ($)', 'Txn Total ($)']
    const body = rptRows.map(r => [
      `#${r.TransactionID}`,
      String(r.Date || '').slice(0, 10),
      r.VisitorName || '—',
      r.Username || '—',
      r.ProductName || '—',
      r.Quantity ?? '',
      parseFloat(r.RetailPrice || 0).toFixed(2),
      parseFloat(r.LineTotal || 0).toFixed(2),
      parseFloat(r.TxnTotal || 0).toFixed(2),
    ])
    const csv = [headers, ...body].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `giftshop-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const alertProducts = products?.filter(p => p.StockQuantity <= p.LowStockThreshold) || []

  return (
    <div className="home-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/tickets">Tickets</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          <div style={{ marginLeft: 12 }}><ProfileMenu /></div>
        </nav>
      </header>

      <main className="giftshop-portal-main">

        {/* ── Hero banner ── */}
        <div className="gs-hero">
          <div className="gs-hero-text">
            <span className="section-eyebrow">Staff Portal</span>
            <h1 className="gs-hero-title">Gift Shop Portal</h1>
            <p className="gs-hero-sub">Manage inventory and track sales performance.</p>
          </div>
          <div className="gs-hero-stats">
            <div className="gs-stat">
              <span className="gs-stat-num">{loading ? '…' : (metrics?.totalTransactions ?? 0)}</span>
              <span className="gs-stat-label">Total Orders</span>
            </div>
            <div className="gs-stat-div" />
            <div className="gs-stat">
              <span className="gs-stat-num">{loading ? '…' : `$${parseFloat(metrics?.totalRevenue ?? 0).toFixed(2)}`}</span>
              <span className="gs-stat-label">Total Revenue</span>
            </div>
          </div>
        </div>

        {/* ── Metric cards ── */}
        <div className="gs-metrics gs-metrics-5">
          <div className="gs-metric-card">
            <div className="gs-metric-icon">🛍️</div>
            <div>
              <div className="gs-metric-value">{loading ? '…' : (metrics?.totalProducts ?? 0)}</div>
              <div className="gs-metric-label">Products Listed</div>
            </div>
          </div>
          <div className="gs-metric-card">
            <div className="gs-metric-icon">🧾</div>
            <div>
              <div className="gs-metric-value">{loading ? '…' : (metrics?.totalTransactions ?? 0)}</div>
              <div className="gs-metric-label">Total Transactions</div>
            </div>
          </div>
          <div className="gs-metric-card">
            <div className="gs-metric-icon">💰</div>
            <div>
              <div className="gs-metric-value">{loading ? '…' : `$${parseFloat(metrics?.totalRevenue ?? 0).toFixed(2)}`}</div>
              <div className="gs-metric-label">Total Revenue</div>
            </div>
          </div>
          <div className="gs-metric-card">
            <div className="gs-metric-icon">🏆</div>
            <div>
              <div className="gs-metric-value gs-metric-value--sm">{loading ? '…' : (metrics?.topProduct?.Name ?? '—')}</div>
              <div className="gs-metric-label">Best Seller</div>
            </div>
          </div>
          <button
            className={`gs-metric-card gs-metric-card--btn${(metrics?.lowStockCount ?? 0) > 0 ? ' gs-metric-card--warn' : ''}`}
            onClick={() => setActiveTab('lowstock')}
            title="View low-stock items"
          >
            <div className="gs-metric-icon">⚠️</div>
            <div>
              <div className={`gs-metric-value${(metrics?.lowStockCount ?? 0) > 0 ? ' gs-metric-value--warn' : ''}`}>{loading ? '…' : (metrics?.lowStockCount ?? 0)}</div>
              <div className="gs-metric-label">Low / Out of Stock</div>
            </div>
          </button>
        </div>

        {/* ── Tab navigation ── */}
        <div className="gs-tab-nav">
          <button className={`gs-tab-btn${activeTab === 'products' ? ' active' : ''}`} onClick={() => setActiveTab('products')}>
            📦 Products &amp; Inventory
          </button>
          <button className={`gs-tab-btn${activeTab === 'report' ? ' active' : ''}`} onClick={() => setActiveTab('report')}>
            📊 Sales Report
          </button>
          <button className={`gs-tab-btn gs-tab-btn--alert${activeTab === 'lowstock' ? ' active' : ''}${(metrics?.lowStockCount ?? 0) > 0 ? ' gs-tab-btn--has-alert' : ''}`} onClick={() => setActiveTab('lowstock')}>
            ⚠️ Low Stock{(metrics?.lowStockCount ?? 0) > 0 ? ` (${metrics.lowStockCount})` : ''}
          </button>
          <button className="gs-add-product-btn gs-tab-add-btn" onClick={openAddProduct}>＋ Add Product</button>
        </div>

        {/* ═══ Products & Inventory tab ═══ */}
        {activeTab === 'products' && (
          <div className="gs-panel">
            <div className="gs-panel-header">
              <div>
                <div className="gs-panel-title">Product Analytics &amp; Inventory</div>
                <div className="gs-panel-subtitle">Sales performance and stock management for all products</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                {products?.length > 0 && (
                  <button className="gs-csv-btn" onClick={exportProdCSV}>Export CSV</button>
                )}
              </div>
            </div>

            {/* Low-stock / out-of-stock alert */}
            {alertProducts.length > 0 && (
              <div className="gs-alert-box">
                <span className="gs-alert-title">⚠️ {alertProducts.length} item{alertProducts.length !== 1 ? 's' : ''} need{alertProducts.length === 1 ? 's' : ''} restocking</span>
                <div className="gs-alert-chips">
                  {alertProducts.map(p => (
                    <span key={p.ProductID} className={`gs-stock-chip ${p.StockQuantity === 0 ? 'gs-chip-out' : 'gs-chip-low'}`}>
                      {p.Name}: {p.StockQuantity === 0 ? 'Out of Stock' : `${p.StockQuantity} left`}
                      <button className="gs-chip-restock-btn" onClick={() => openRestock(p)}>+ Restock</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="gs-filter-grid gs-prod-filter-grid">
              <label className="gs-filter-label">
                Product Name
                <input className="gs-filter-input" type="text" placeholder="Search products…"
                  value={pf.productName} onChange={e => setPfKey('productName', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchProducts()} />
              </label>
              <label className="gs-filter-label">
                Sale Date From
                <input className="gs-filter-input" type="date" value={pf.dateFrom} onChange={e => setPfKey('dateFrom', e.target.value)} />
              </label>
              <label className="gs-filter-label">
                Sale Date To
                <input className="gs-filter-input" type="date" value={pf.dateTo} onChange={e => setPfKey('dateTo', e.target.value)} />
              </label>
              <label className="gs-filter-label">
                Stock Status
                <select className="gs-filter-input" value={pf.stockStatus} onChange={e => setPfKey('stockStatus', e.target.value)}>
                  <option value="">All Products</option>
                  <option value="out">Out of Stock (0)</option>
                  <option value="low">Low Stock (≤ threshold)</option>
                  <option value="ok">In Stock</option>
                </select>
              </label>
              <label className="gs-filter-label">
                Sort By
                <select className="gs-filter-input" value={pf.sortBy} onChange={e => setPfKey('sortBy', e.target.value)}>
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                  <option value="revenue_desc">Highest Revenue</option>
                  <option value="qty_desc">Most Units Sold</option>
                  <option value="stock_asc">Lowest Stock First</option>
                  <option value="last_sold">Most Recently Sold</option>
                </select>
              </label>
              <div className="gs-filter-actions">
                <button className="gs-generate-btn" onClick={() => fetchProducts()} disabled={prodLoading}>
                  {prodLoading ? 'Loading…' : 'Apply Filters'}
                </button>
                <button className="gs-reset-btn" onClick={() => {
                  const reset = { productName: '', dateFrom: '', dateTo: '', stockStatus: '', sortBy: 'name_asc' }
                  setPf(reset); fetchProducts(reset)
                }}>Reset</button>
              </div>
            </div>

            {prodError && <p className="gs-rpt-error">{prodError}</p>}

            <div className="gs-report-output gs-prod-output">
              {prodLoading ? (
                <div className="gs-report-placeholder"><div className="gs-placeholder-icon">📦</div><p>Loading…</p></div>
              ) : products === null ? (
                <div className="gs-report-placeholder"><div className="gs-placeholder-icon">🔍</div><p>Set your filters above and click <strong>Apply Filters</strong> to see products.</p></div>
              ) : products.length === 0 ? (
                <div className="gs-report-placeholder"><p>No products match those filters.</p></div>
              ) : (
                <table className="gs-table gs-prod-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Qty Sold</th>
                      <th>Revenue</th>
                      <th>Orders</th>
                      <th>Avg Qty/Order</th>
                      <th>Last Sold</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => {
                      const ss = p.StockQuantity === 0 ? 'out' : p.StockQuantity <= p.LowStockThreshold ? 'low' : 'ok'
                      const isEditing = editingStock[p.ProductID] !== undefined
                      const editVal   = editingStock[p.ProductID] ?? String(p.StockQuantity)
                      const isSaving  = savingStock.has(p.ProductID)
                      return (
                        <tr key={p.ProductID} className={`${i % 2 === 0 ? 'row-even' : ''}${ss !== 'ok' ? ` gs-row-${ss}` : ''}`}>
                          <td><span className="product-name">{p.Name}</span></td>
                          <td><span className="price-tag">${parseFloat(p.RetailPrice).toFixed(2)}</span></td>
                          <td>
                            {isEditing ? (
                              <div className="gs-stock-edit">
                                <input type="number" min="0" className="gs-stock-input" value={editVal}
                                  onChange={e => setEditingStock(prev => ({ ...prev, [p.ProductID]: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter')  saveStock(p.ProductID, editVal)
                                    if (e.key === 'Escape') setEditingStock(prev => { const n = { ...prev }; delete n[p.ProductID]; return n })
                                  }}
                                  autoFocus
                                />
                                <button className="gs-stock-save" disabled={isSaving} onClick={() => saveStock(p.ProductID, editVal)} title="Save">{isSaving ? '…' : '✓'}</button>
                                <button className="gs-stock-cancel" onClick={() => setEditingStock(prev => { const n = { ...prev }; delete n[p.ProductID]; return n })} title="Cancel">✕</button>
                              </div>
                            ) : (
                              <div className="gs-stock-display">
                                <span className={`gs-stock-badge gs-stock-${ss}`}>
                                  {p.StockQuantity === 0 ? 'Out of Stock' : p.StockQuantity <= p.LowStockThreshold ? `⚠ ${p.StockQuantity}` : p.StockQuantity}
                                </span>
                                <button className="gs-stock-edit-btn" title="Set exact stock"
                                  onClick={() => setEditingStock(prev => ({ ...prev, [p.ProductID]: String(p.StockQuantity) }))}>
                                  ✎
                                </button>
                                {ss !== 'ok' && (
                                  <button className="gs-restock-btn" title="Add units to stock" onClick={() => openRestock(p)}>+ Restock</button>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>{parseInt(p.TotalQtySold) || 0}</td>
                          <td><span className="revenue-tag">${parseFloat(p.TotalRevenue || 0).toFixed(2)}</span></td>
                          <td style={{ textAlign: 'center' }}>{p.NumTransactions || 0}</td>
                          <td style={{ textAlign: 'center' }}>{parseFloat(p.AvgQtyPerTxn || 0).toFixed(1)}</td>
                          <td className="date-cell">{p.LastSoldDate ? String(p.LastSoldDate).slice(0, 10) : '—'}</td>
                          <td>
                            <div className="gs-action-btns">
                              <button className="gs-edit-btn" title="Edit product" onClick={() => openEditProduct(p)}>✎ Edit</button>
                              <button className="gs-delete-btn" title="Delete product" onClick={() => openDeleteProduct(p)}>🗑 Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ Low Stock tab ═══ */}
        {activeTab === 'lowstock' && (
          <div className="gs-panel">
            <div className="gs-panel-header">
              <div>
                <div className="gs-panel-title">Low Stock &amp; Out of Stock Items</div>
                <div className="gs-panel-subtitle">All products at or below their low-stock threshold — update quantities directly</div>
              </div>
              <button className="gs-csv-btn" onClick={fetchLowStock} disabled={lowStockLoading}>
                {lowStockLoading ? 'Refreshing…' : '↻ Refresh'}
              </button>
            </div>

            {lowStockError && <p className="gs-rpt-error">{lowStockError}</p>}

            <div className="gs-report-output gs-lowstock-output">
              {lowStockLoading ? (
                <div className="gs-report-placeholder"><div className="gs-placeholder-icon">📦</div><p>Loading…</p></div>
              ) : !lowStockItems ? (
                <div className="gs-report-placeholder"><div className="gs-placeholder-icon">🔍</div><p>Loading low-stock items…</p></div>
              ) : lowStockItems.length === 0 ? (
                <div className="gs-report-placeholder">
                  <div className="gs-placeholder-icon">✅</div>
                  <p>All products are well-stocked.</p>
                </div>
              ) : (
                <table className="gs-table gs-lowstock-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th style={{textAlign:'center'}}>Current Stock</th>
                      <th style={{textAlign:'center'}}>Threshold</th>
                      <th>Update Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((p, i) => {
                      const ss = p.StockQuantity === 0 ? 'out' : 'low'
                      const isEditing = editingStock[p.ProductID] !== undefined
                      const editVal   = editingStock[p.ProductID] ?? String(p.StockQuantity)
                      const isSaving  = savingStock.has(p.ProductID)
                      return (
                        <tr key={p.ProductID} className={`gs-row-${ss}${i % 2 === 0 ? ' row-even' : ''}`}>
                          <td>
                            <span className="product-name">{p.Name}</span>
                            {p.Description && <div className="product-desc">{p.Description}</div>}
                          </td>
                          <td><span className="price-tag">${parseFloat(p.RetailPrice).toFixed(2)}</span></td>
                          <td style={{textAlign:'center'}}>
                            <span className={`gs-stock-badge gs-stock-${ss}`}>
                              {p.StockQuantity === 0 ? 'Out of Stock' : `⚠ ${p.StockQuantity}`}
                            </span>
                          </td>
                          <td style={{textAlign:'center',color:'rgba(2,6,23,0.45)',fontWeight:600}}>{p.LowStockThreshold}</td>
                          <td>
                            {isEditing ? (
                              <div className="gs-stock-edit">
                                <input type="number" min="0" className="gs-stock-input" value={editVal}
                                  onChange={e => setEditingStock(prev => ({ ...prev, [p.ProductID]: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter')  saveStock(p.ProductID, editVal)
                                    if (e.key === 'Escape') setEditingStock(prev => { const n = { ...prev }; delete n[p.ProductID]; return n })
                                  }}
                                  autoFocus
                                />
                                <button className="gs-stock-save" disabled={isSaving} onClick={() => saveStock(p.ProductID, editVal)}>{isSaving ? '…' : '✓'}</button>
                                <button className="gs-stock-cancel" onClick={() => setEditingStock(prev => { const n = { ...prev }; delete n[p.ProductID]; return n })}>✕</button>
                              </div>
                            ) : (
                              <div className="gs-stock-display">
                                <button className="gs-restock-btn" onClick={() => openRestock(p)}>+ Restock</button>
                                <button className="gs-stock-edit-btn" title="Set exact quantity"
                                  onClick={() => setEditingStock(prev => ({ ...prev, [p.ProductID]: String(p.StockQuantity) }))}>
                                  ✎ Set Qty
                                </button>
                              </div>
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
        )}

        {/* ═══ Sales Report tab ═══ */}
        {activeTab === 'report' && (
          <div className="gs-panels">

            {/* Report Generator */}
            <div className="gs-panel">
              <div className="gs-panel-header">
                <div>
                  <div className="gs-panel-title">Sales Report</div>
                  <div className="gs-panel-subtitle">Full transaction history — search by visitor name, username, or product</div>
                </div>
                {rptRows?.length > 0 && (
                  <button className="gs-csv-btn" onClick={exportRptCSV}>Export CSV</button>
                )}
              </div>

              <div className="gs-filter-grid gs-rpt-filter-grid">
                <label className="gs-filter-label">
                  Search
                  <input className="gs-filter-input" type="text" placeholder="Visitor name, username, or product…"
                    value={filters.search} onChange={e => setF('search', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateReport()} />
                </label>
                <label className="gs-filter-label">
                  Date From
                  <input className="gs-filter-input" type="date" value={filters.dateFrom} onChange={e => setF('dateFrom', e.target.value)} />
                </label>
                <label className="gs-filter-label">
                  Date To
                  <input className="gs-filter-input" type="date" value={filters.dateTo} onChange={e => setF('dateTo', e.target.value)} />
                </label>
                <label className="gs-filter-label">
                  Sort By
                  <select className="gs-filter-input" value={filters.sortBy} onChange={e => setF('sortBy', e.target.value)}>
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="revenue_desc">Highest Revenue</option>
                    <option value="revenue_asc">Lowest Revenue</option>
                    <option value="product_asc">Product A–Z</option>
                  </select>
                </label>
                <div className="gs-filter-actions">
                  <button className="gs-generate-btn" onClick={generateReport} disabled={rptLoading}>
                    {rptLoading ? 'Generating…' : 'Generate Report'}
                  </button>
                  <button className="gs-reset-btn" onClick={() => {
                    setFilters({ search: '', dateFrom: '', dateTo: '', sortBy: 'date_desc' })
                    setRptRows(null)
                  }}>Reset</button>
                </div>
              </div>

              {rptError && <p className="gs-rpt-error">{rptError}</p>}

              <div className="gs-report-output">
                {rptRows === null ? (
                  <div className="gs-report-placeholder">
                    <div className="gs-placeholder-icon">📊</div>
                    <p>Set your filters above and click <strong>Generate Report</strong> to see results.</p>
                  </div>
                ) : rptLoading ? (
                  <div className="gs-report-placeholder"><p>Generating…</p></div>
                ) : rptRows.length === 0 ? (
                  <div className="gs-report-placeholder"><p>No transactions match your filters.</p></div>
                ) : (
                  <table className="gs-table gs-rpt-table">
                    <thead>
                      <tr>
                        <th>Txn #</th>
                        <th>Date</th>
                        <th>Visitor</th>
                        <th>Username</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Line Total</th>
                        <th>Txn Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rptRows.map((r, i) => (
                        <tr key={`${r.TransactionID}-${r.ProductName}-${i}`} className={i % 2 === 0 ? 'row-even' : ''}>
                          <td className="date-cell">#{r.TransactionID}</td>
                          <td className="date-cell">{String(r.Date || '').slice(0, 10)}</td>
                          <td><span className="visitor-name">{r.VisitorName || '—'}</span></td>
                          <td className="date-cell">{r.Username || '—'}</td>
                          <td><span className="product-name">{r.ProductName || '—'}</span></td>
                          <td style={{ textAlign: 'center' }}>{r.Quantity ?? '—'}</td>
                          <td><span className="price-tag">${parseFloat(r.RetailPrice || 0).toFixed(2)}</span></td>
                          <td><span className="revenue-tag">${parseFloat(r.LineTotal || 0).toFixed(2)}</span></td>
                          <td><span className="revenue-tag">${parseFloat(r.TxnTotal || 0).toFixed(2)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="gs-panel">
              <div className="gs-panel-header">
                <div>
                  <div className="gs-panel-title">Recent Transactions</div>
                  <div className="gs-panel-subtitle">Latest gift shop sales</div>
                </div>
              </div>
              {loading ? (
                <div className="gs-empty">Loading…</div>
              ) : transactions.length === 0 ? (
                <div className="gs-empty">No transactions yet.</div>
              ) : (
                <table className="gs-table">
                  <thead>
                    <tr><th>Date</th><th>Visitor</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={t.TransactionID} className={i % 2 === 0 ? 'row-even' : ''}>
                        <td className="date-cell">{String(t.Date).slice(0, 10)}</td>
                        <td><span className="visitor-name">{t.VisitorName}</span></td>
                        <td><span className="revenue-tag">${parseFloat(t.Revenue || 0).toFixed(2)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}
      </main>

      {/* ── Add Product modal ── */}
      {addModal && (
        <div className="artifact-modal-overlay" onClick={closeAddProduct}>
          <div className="artifact-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <h2>Add New Product</h2>
              <button className="artifact-modal-close" onClick={closeAddProduct}>✕</button>
            </div>
            <div className="artifact-form">
              <label className="artifact-label">Name <span className="artifact-required">*</span>
                <input className="artifact-input" type="text" maxLength={40} placeholder="e.g. Fossil Replica" value={addForm.name} onChange={e => setAF('name', e.target.value)} autoFocus />
              </label>
              <label className="artifact-label">Description
                <textarea className="artifact-input artifact-textarea" maxLength={300} rows={3} placeholder="Short product description…" value={addForm.description} onChange={e => setAF('description', e.target.value)} />
              </label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <label className="artifact-label">Retail Price ($) <span className="artifact-required">*</span>
                  <input className="artifact-input" type="number" min="0" step="0.01" placeholder="0.00" value={addForm.retailPrice} onChange={e => setAF('retailPrice', e.target.value)} />
                </label>
                <label className="artifact-label">Stock Quantity
                  <input className="artifact-input" type="number" min="0" placeholder="0" value={addForm.stockQuantity} onChange={e => setAF('stockQuantity', e.target.value)} />
                </label>
                <label className="artifact-label">Low Stock Threshold
                  <input className="artifact-input" type="number" min="0" placeholder="5" value={addForm.lowStockThreshold} onChange={e => setAF('lowStockThreshold', e.target.value)} />
                </label>
              </div>
              <label className="artifact-label">Image URL
                <input className="artifact-input" type="url" placeholder="https://…" value={addForm.imageURL} onChange={e => setAF('imageURL', e.target.value)} />
              </label>
              {addForm.imageURL.trim() && (
                <div style={{marginBottom:12}}>
                  <img src={addForm.imageURL} alt="preview" style={{maxHeight:120,borderRadius:8,objectFit:'cover',border:'1px solid rgba(0,0,0,0.08)'}}
                    onError={e => { e.target.style.display='none' }} />
                </div>
              )}
              {addError && <p className="artifact-form-error">{addError}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={closeAddProduct}>Cancel</button>
                <button type="button" className="btn primary" onClick={submitAddProduct} disabled={addSaving}>
                  {addSaving ? 'Adding…' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Restock modal ── */}
      {restockModal && (
        <div className="artifact-modal-overlay" onClick={closeRestock}>
          <div className="artifact-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <h2>Restock Item</h2>
              <button className="artifact-modal-close" onClick={closeRestock}>✕</button>
            </div>
            <div className="artifact-form">
              <div className="gs-restock-info">
                <strong>{restockModal.product.Name}</strong>
                <div className="gs-restock-meta">
                  Current stock: <b>{restockModal.product.StockQuantity}</b> &nbsp;·&nbsp; Threshold: <b>{restockModal.product.LowStockThreshold}</b>
                </div>
              </div>
              <label className="artifact-label">Units to Add <span className="artifact-required">*</span>
                <input className="artifact-input" type="number" min="1" placeholder="e.g. 50"
                  value={restockModal.addQty}
                  onChange={e => setRestockModal(prev => ({ ...prev, addQty: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitRestock(); if (e.key === 'Escape') closeRestock() }}
                  autoFocus
                />
              </label>
              {restockModal.addQty !== '' && parseInt(restockModal.addQty, 10) > 0 && (
                <div className="gs-restock-preview">
                  New total stock: <b>{restockModal.product.StockQuantity + parseInt(restockModal.addQty, 10)}</b>
                </div>
              )}
              {restockError && <p className="artifact-form-error">{restockError}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={closeRestock}>Cancel</button>
                <button type="button" className="btn primary" onClick={submitRestock} disabled={restockSaving}>
                  {restockSaving ? 'Saving…' : 'Confirm Restock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Product modal ── */}
      {editModal && (
        <div className="artifact-modal-overlay" onClick={closeEditProduct}>
          <div className="artifact-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <h2>Edit Product</h2>
              <button className="artifact-modal-close" onClick={closeEditProduct}>✕</button>
            </div>
            <div className="artifact-form">
              <label className="artifact-label">Name <span className="artifact-required">*</span>
                <input className="artifact-input" type="text" maxLength={40} placeholder="e.g. Fossil Replica" value={editForm.name} onChange={e => setEF('name', e.target.value)} autoFocus />
              </label>
              <label className="artifact-label">Description
                <textarea className="artifact-input artifact-textarea" maxLength={300} rows={3} placeholder="Short product description…" value={editForm.description} onChange={e => setEF('description', e.target.value)} />
              </label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <label className="artifact-label">Retail Price ($) <span className="artifact-required">*</span>
                  <input className="artifact-input" type="number" min="0" step="0.01" placeholder="0.00" value={editForm.retailPrice} onChange={e => setEF('retailPrice', e.target.value)} />
                </label>
                <label className="artifact-label">Stock Quantity
                  <input className="artifact-input" type="number" min="0" placeholder="0" value={editForm.stockQuantity} onChange={e => setEF('stockQuantity', e.target.value)} />
                </label>
                <label className="artifact-label">Low Stock Threshold
                  <input className="artifact-input" type="number" min="0" placeholder="5" value={editForm.lowStockThreshold} onChange={e => setEF('lowStockThreshold', e.target.value)} />
                </label>
              </div>
              <label className="artifact-label">Image URL
                <input className="artifact-input" type="url" placeholder="https://…" value={editForm.imageURL} onChange={e => setEF('imageURL', e.target.value)} />
              </label>
              {editForm.imageURL.trim() && (
                <div style={{marginBottom:12}}>
                  <img src={editForm.imageURL} alt="preview" style={{maxHeight:120,borderRadius:8,objectFit:'cover',border:'1px solid rgba(0,0,0,0.08)'}}
                    onError={e => { e.target.style.display='none' }} />
                </div>
              )}
              {editError && <p className="artifact-form-error">{editError}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={closeEditProduct}>Cancel</button>
                <button type="button" className="btn primary" onClick={submitEditProduct} disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm modal ── */}
      {deleteTarget && (
        <div className="artifact-modal-overlay" onClick={closeDeleteProduct}>
          <div className="artifact-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <h2>Delete Product</h2>
              <button className="artifact-modal-close" onClick={closeDeleteProduct}>✕</button>
            </div>
            <div className="artifact-form">
              <p style={{marginBottom:16}}>Are you sure you want to delete <strong>{deleteTarget.Name}</strong>? This cannot be undone.</p>
              {deleteError && <p className="artifact-form-error">{deleteError}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={closeDeleteProduct}>Cancel</button>
                <button type="button" className="btn gs-btn-danger" onClick={submitDeleteProduct} disabled={deleteSaving}>
                  {deleteSaving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Gift Shop Portal</footer>
    </div>
  )
}
