import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Admin.css'
import ProfileMenu from '../../components/ProfileMenu.jsx'
import { useAuth } from '../../../src/AuthContext.jsx'
import { API_BASE } from '../../../src/api.js'


export default function Admin() {

  const apiBase = API_BASE()
  const { user } = useAuth()
  const fmt    = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtNum = (n) => Number(n || 0).toLocaleString()

  // ── Metrics ────────────────────────────────────────────────────────────────
  const [metrics, setMetrics]           = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  useEffect(() => {
    fetch(`${apiBase}/api/admin/metrics`)
      .then(r => r.json()).then(setMetrics).catch(console.error)
      .finally(() => setMetricsLoading(false))
  }, [])

  // ── Revenue trend ──────────────────────────────────────────────────────────
  const [trend, setTrend]       = useState([])
  const [trendFrom, setTrendFrom] = useState(new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10))
  const [trendTo,   setTrendTo]   = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const loadTrend = useCallback(() => {
    fetch(`${apiBase}/api/admin/revenue-trend?dateFrom=${trendFrom}&dateTo=${trendTo}`)
      .then(r => r.json()).then(d => setTrend(d.daily || [])).catch(console.error)
  }, [trendFrom, trendTo])
  useEffect(() => { loadTrend() }, [loadTrend])

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview')

  // ── Tickets report ─────────────────────────────────────────────────────────
  const [tf, setTf] = useState({ dateFrom:'', dateTo:'', purchaseDateFrom:'', purchaseDateTo:'', status:'', sortBy:'purchase_desc', groupBy:'' })
  const [ticketRows,    setTicketRows]    = useState([])
  const [ticketLoading, setTicketLoading] = useState(false)
  const [ticketError,   setTicketError]   = useState('')
  const [ticketGrouped, setTicketGrouped] = useState(false)

  const loadTickets = () => {
    setTicketLoading(true); setTicketError('')
    const p = new URLSearchParams(Object.fromEntries(Object.entries(tf).filter(([, v]) => v !== '')))
    fetch(`${apiBase}/api/admin/tickets/report?${p}`)
      .then(r => r.json())
      .then(d => { setTicketRows(d.rows || []); setTicketGrouped(d.grouped || false) })
      .catch(e => setTicketError(String(e)))
      .finally(() => setTicketLoading(false))
  }

  const exportTicketCSV = () => {
    if (!ticketRows.length) return
    const headers = ticketGrouped
      ? ['Visit Date','Orders','Unique Visitors','Total Revenue']
      : ['ID','Purchase Date','Visit Date','Visitor','Amount','Tickets','Status']
    const rowData = ticketGrouped
      ? ticketRows.map(r => [r.visitDate, r.orders, r.uniqueVisitors, r.totalRevenue])
      : ticketRows.map(r => [r.TicketPurchaseID, r.purchaseDate, r.visitDate, r.visitorName, r.TotalAmount, r.ticketCount, r.Status])
    const csv = [headers, ...rowData].map(row => row.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type:'text/csv' })), download: `tickets-report-${new Date().toISOString().slice(0,10)}.csv` })
    a.click()
  }

  // ── Memberships report ─────────────────────────────────────────────────────
  const [mf, setMf] = useState({ dateFrom:'', dateTo:'', membershipType:'', status:'', groupBy:'' })
  const [memberRows,    setMemberRows]    = useState([])
  const [memberLoading, setMemberLoading] = useState(false)
  const [memberError,   setMemberError]   = useState('')
  const [memberGrouped, setMemberGrouped] = useState(false)

  const loadMembers = () => {
    setMemberLoading(true); setMemberError('')
    const p = new URLSearchParams(Object.fromEntries(Object.entries(mf).filter(([, v]) => v !== '')))
    fetch(`${apiBase}/api/admin/memberships/report?${p}`)
      .then(r => r.json())
      .then(d => { setMemberRows(d.rows || []); setMemberGrouped(d.grouped || false) })
      .catch(e => setMemberError(String(e)))
      .finally(() => setMemberLoading(false))
  }

  // ── Create Account modal ───────────────────────────────────────────────────
  const [createModal, setCreateModal] = useState(false)
  const emptyForm = () => ({ accountType: 'Visitor', username: '', password: '', firstName: '', lastName: '', email: '', phone: '', address: '', dateOfBirth: '', hireDate: new Date().toISOString().slice(0,10) })
  const [createForm, setCreateForm] = useState(emptyForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const openCreateModal = () => { setCreateForm(emptyForm()); setCreateError(''); setCreateSuccess(''); setCreateModal(true) }
  const closeCreateModal = () => setCreateModal(false)

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    if (!createForm.username || !createForm.password || !createForm.firstName || !createForm.lastName) {
      setCreateError('Username, password, first name, and last name are required.')
      return
    }
    setCreateSubmitting(true)
    setCreateError('')
    try {
      const uid = user?.userId || user?.UserID || user?.id
      const res = await fetch(`${apiBase}/api/admin/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, userId: uid })
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Failed to create account.'); setCreateSubmitting(false); return }
      setCreateSuccess(`Account "${createForm.username}" created successfully!`)
      setTimeout(() => { closeCreateModal(); setCreateSuccess('') }, 2200)
    } catch { setCreateError('Network error. Please try again.') }
    finally { setCreateSubmitting(false) }
  }

  // ── Membership × Exhibit report ────────────────────────────────────────────
  const [mef, setMef] = useState({ dateFrom: '', dateTo: '', membershipType: '', exhibitId: '', sortBy: 'revenue_desc' })
  const [meRows,    setMeRows]    = useState(null)
  const [meLoading, setMeLoading] = useState(false)
  const [meError,   setMeError]   = useState('')
  const setMeF = (key, val) => setMef(prev => ({ ...prev, [key]: val }))

  const loadMeReport = () => {
    setMeLoading(true); setMeError('')
    const p = new URLSearchParams(Object.fromEntries(Object.entries(mef).filter(([, v]) => v !== '')))
    fetch(`${apiBase}/api/admin/membership-exhibit-report?${p}`)
      .then(r => r.json())
      .then(d => setMeRows(d.rows || []))
      .catch(e => setMeError(String(e)))
      .finally(() => setMeLoading(false))
  }

  const exportMeCSV = () => {
    if (!meRows?.length) return
    const headers = ['Membership Type', 'Discount %', 'Exhibit', 'Exhibit Status', 'Members', 'Tickets Sold', 'Revenue ($)']
    const body = meRows.map(r => [
      r.MembershipType, r.DiscountPercent, r.ExhibitName, r.ExhibitStatus,
      r.Members, r.TicketsSold, parseFloat(r.Revenue || 0).toFixed(2),
    ])
    const csv = [headers, ...body].map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `membership-exhibit-report-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
  }

  const generateLargeReport = () => {}  // removed — replaced by real reports below

  return (
    <div className="home-root admin-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          <div style={{marginLeft:12}}><ProfileMenu /></div>
        </nav>
      </header>

      <main className="admin-main">
        {/* Hero */}
        <div className="admin-hero">
          <div className="hero-left">
            <h1>Admin Dashboard</h1>
            <p className="muted">Ticket sales, memberships, and revenue — all from live data.</p>
          </div>
          <div className="hero-right">
            <div className="quick-actions">
              <button className="btn ghost" onClick={openCreateModal}>＋ Create Account</button>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <section className="adm-metrics">
          {metricsLoading ? (
            <div className="adm-metric-loading">Loading metrics…</div>
          ) : metrics ? (
            <>
              <div className="adm-metric-card">
                <div className="adm-metric-label">Total Revenue</div>
                <div className="adm-metric-value">${fmt(metrics.totalRevenue)}</div>
                <div className="adm-metric-sub">{fmtNum(metrics.totalTransactions)} transactions</div>
              </div>
              <div className="adm-metric-card">
                <div className="adm-metric-label">Ticket Revenue</div>
                <div className="adm-metric-value">${fmt(metrics.ticketRevenue)}</div>
                <div className="adm-metric-sub">{fmtNum(metrics.ticketOrders)} purchases · {fmtNum(metrics.totalTickets)} tickets</div>
              </div>
              <div className="adm-metric-card">
                <div className="adm-metric-label">Active Members</div>
                <div className="adm-metric-value">{fmtNum(metrics.activeMemberships)}</div>
                <div className="adm-metric-sub">
                  {metrics.membershipByType?.length
                    ? metrics.membershipByType.map(t => `${t.TypeName}: ${t.cnt}`).join(' · ')
                    : 'No active memberships'}
                </div>
              </div>
              <div className="adm-metric-card">
                <div className="adm-metric-label">Active Exhibits</div>
                <div className="adm-metric-value">{fmtNum(metrics.activeExhibits)}</div>
                <div className="adm-metric-sub">Registered visitors: {fmtNum(metrics.totalVisitors)}</div>
              </div>
              <div className="adm-metric-card">
                <div className="adm-metric-label">Unique Ticket Visitors</div>
                <div className="adm-metric-value">{fmtNum(metrics.uniqueTicketVisitors)}</div>
                <div className="adm-metric-sub">Revenue today: ${fmt(metrics.revenueToday)}</div>
              </div>
            </>
          ) : (
            <div className="adm-metric-loading">Failed to load metrics.</div>
          )}
        </section>

        {/* Tab nav */}
        <nav className="adm-tab-nav">
          {[['overview','📊 Overview'],['tickets','🎟 Tickets'],['memberships','🪪 Memberships'],['memexhibit','🏛️ Membership × Exhibit']].map(([id, label]) => (
            <button key={id} className={`adm-tab-btn${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </nav>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="adm-tab-content">
            <div className="adm-section">
              <div className="adm-section-header">
                <h2>Revenue Trend</h2>
                <div className="adm-row-filters">
                  <label>From <input type="date" value={trendFrom} onChange={e => setTrendFrom(e.target.value)} /></label>
                  <label>To&nbsp;&nbsp; <input type="date" value={trendTo}   onChange={e => setTrendTo(e.target.value)} /></label>
                  <button className="btn primary" onClick={loadTrend}>Update</button>
                </div>
              </div>
              {trend.length === 0
                ? <div className="adm-empty">No revenue data for this range.</div>
                : (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th style={{textAlign:'right'}}>Revenue</th>
                          <th style={{textAlign:'right'}}>Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trend.map((r, i) => (
                          <tr key={i}>
                            <td>{r.date}</td>
                            <td style={{textAlign:'right'}}>${fmt(r.revenue)}</td>
                            <td style={{textAlign:'right'}}>{r.transactions ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="adm-row-count">
                      {trend.length} day{trend.length !== 1 ? 's' : ''}
                      &nbsp;·&nbsp;
                      Total: <strong>${fmt(trend.reduce((s, r) => s + +(r.revenue || 0), 0))}</strong>
                    </div>
                  </div>
                )}
            </div>
            {metrics?.membershipByType?.length > 0 && (
              <div className="adm-section">
                <h2>Active Memberships by Type</h2>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Membership Type</th>
                        <th style={{textAlign:'right'}}>Active Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.membershipByType.map((t, i) => (
                        <tr key={i}>
                          <td>{t.TypeName}</td>
                          <td style={{textAlign:'right'}}>{fmtNum(t.cnt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="adm-section">
              <h2>Quick Stats</h2>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <tbody>
                    <tr><td>Total Revenue (all time)</td><td style={{textAlign:'right'}}><strong>${fmt(metrics?.totalRevenue)}</strong></td></tr>
                    <tr><td>Total Transactions</td><td style={{textAlign:'right'}}>{fmtNum(metrics?.totalTransactions)}</td></tr>
                    <tr><td>Ticket Revenue</td><td style={{textAlign:'right'}}>${fmt(metrics?.ticketRevenue)}</td></tr>
                    <tr><td>Ticket Purchases</td><td style={{textAlign:'right'}}>{fmtNum(metrics?.ticketOrders)}</td></tr>
                    <tr><td>Total Tickets Sold</td><td style={{textAlign:'right'}}>{fmtNum(metrics?.totalTickets)}</td></tr>
                    <tr><td>Active Members</td><td style={{textAlign:'right'}}>{fmtNum(metrics?.activeMemberships)}</td></tr>
                    <tr><td>Active Exhibits</td><td style={{textAlign:'right'}}>{fmtNum(metrics?.activeExhibits)}</td></tr>
                    <tr><td>Registered Visitors</td><td style={{textAlign:'right'}}>{fmtNum(metrics?.totalVisitors)}</td></tr>
                    <tr><td>Unique Ticket Visitors</td><td style={{textAlign:'right'}}>{fmtNum(metrics?.uniqueTicketVisitors)}</td></tr>
                    <tr><td>Revenue Today</td><td style={{textAlign:'right'}}><strong>${fmt(metrics?.revenueToday)}</strong></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TICKETS TAB ── */}
        {activeTab === 'tickets' && (
          <div className="adm-tab-content">
            <div className="adm-section">
              <h2>Ticket Sales Report</h2>
              <div className="adm-filter-grid">
                <label>Visit Date From
                  <input type="date" value={tf.dateFrom} onChange={e => setTf(s => ({ ...s, dateFrom: e.target.value }))} />
                </label>
                <label>Visit Date To
                  <input type="date" value={tf.dateTo} onChange={e => setTf(s => ({ ...s, dateTo: e.target.value }))} />
                </label>
                <label>Purchase Date From
                  <input type="date" value={tf.purchaseDateFrom} onChange={e => setTf(s => ({ ...s, purchaseDateFrom: e.target.value }))} />
                </label>
                <label>Purchase Date To
                  <input type="date" value={tf.purchaseDateTo} onChange={e => setTf(s => ({ ...s, purchaseDateTo: e.target.value }))} />
                </label>
                <label>Status
                  <select value={tf.status} onChange={e => setTf(s => ({ ...s, status: e.target.value }))}>
                    <option value="">All</option>
                    <option>Active</option>
                    <option>Cancelled</option>
                    <option>Used</option>
                  </select>
                </label>
                <label>Sort By
                  <select value={tf.sortBy} onChange={e => setTf(s => ({ ...s, sortBy: e.target.value }))}>
                    <option value="purchase_desc">Purchase Date ↓</option>
                    <option value="visitDate_desc">Visit Date ↓</option>
                    <option value="visitDate_asc">Visit Date ↑</option>
                    <option value="amount_desc">Amount ↓</option>
                    <option value="amount_asc">Amount ↑</option>
                  </select>
                </label>
                <label>Group By
                  <select value={tf.groupBy} onChange={e => setTf(s => ({ ...s, groupBy: e.target.value }))}>
                    <option value="">None (detail rows)</option>
                    <option value="date">Visit Date</option>
                  </select>
                </label>
              </div>
              <div className="adm-filter-actions">
                <button className="btn ghost" onClick={() => { setTf({ dateFrom:'', dateTo:'', purchaseDateFrom:'', purchaseDateTo:'', status:'', sortBy:'purchase_desc', groupBy:'' }); setTicketRows([]) }}>Reset</button>
                <button className="btn primary" onClick={loadTickets} disabled={ticketLoading}>{ticketLoading ? 'Loading…' : 'Generate Report'}</button>
                {ticketRows.length > 0 && <button className="btn ghost" onClick={exportTicketCSV}>Export CSV</button>}
              </div>
              {ticketError && <div className="adm-error">{ticketError}</div>}
              {ticketRows.length > 0 && (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    {ticketGrouped ? (
                      <>
                        <thead><tr><th>Visit Date</th><th>Orders</th><th>Unique Visitors</th><th>Total Revenue</th></tr></thead>
                        <tbody>{ticketRows.map((r, i) => <tr key={i}><td>{r.visitDate}</td><td>{r.orders}</td><td>{r.uniqueVisitors}</td><td>${fmt(r.totalRevenue)}</td></tr>)}</tbody>
                      </>
                    ) : (
                      <>
                        <thead><tr><th>ID</th><th>Purchase Date</th><th>Visit Date</th><th>Visitor</th><th>Amount</th><th>Tickets</th><th>Status</th></tr></thead>
                        <tbody>
                          {ticketRows.map((r, i) => (
                            <tr key={i} className={r.Status === 'Cancelled' ? 'adm-row-cancelled' : ''}>
                              <td>#{r.TicketPurchaseID}</td><td>{r.purchaseDate}</td><td>{r.visitDate}</td>
                              <td>{r.visitorName}</td><td>${fmt(r.TotalAmount)}</td><td>{r.ticketCount}</td>
                              <td><span className={`adm-badge adm-badge-${(r.Status||'').toLowerCase()}`}>{r.Status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                  </table>
                  <div className="adm-row-count">{ticketRows.length} row{ticketRows.length !== 1 ? 's' : ''}</div>
                </div>
              )}
              {!ticketLoading && ticketRows.length === 0 && !ticketError && (
                <div className="adm-empty">Use the filters above and click Generate Report.</div>
              )}
            </div>
          </div>
        )}

        {/* ── MEMBERSHIPS TAB ── */}
        {activeTab === 'memberships' && (
          <div className="adm-tab-content">
            <div className="adm-section">
              <h2>Membership Report</h2>
              <div className="adm-filter-grid">
                <label>Start Date From
                  <input type="date" value={mf.dateFrom} onChange={e => setMf(s => ({ ...s, dateFrom: e.target.value }))} />
                </label>
                <label>Start Date To
                  <input type="date" value={mf.dateTo} onChange={e => setMf(s => ({ ...s, dateTo: e.target.value }))} />
                </label>
                <label>Membership Type
                  <select value={mf.membershipType} onChange={e => setMf(s => ({ ...s, membershipType: e.target.value }))}>
                    <option value="">All Types</option>
                    <option value="1">Basic</option>
                    <option value="2">Premium</option>
                    <option value="3">Patron</option>
                  </select>
                </label>
                <label>Status
                  <select value={mf.status} onChange={e => setMf(s => ({ ...s, status: e.target.value }))}>
                    <option value="">All</option>
                    <option>Active</option>
                    <option>Canceled</option>
                    <option>Expired</option>
                  </select>
                </label>
                <label>Group By
                  <select value={mf.groupBy} onChange={e => setMf(s => ({ ...s, groupBy: e.target.value }))}>
                    <option value="">None (detail rows)</option>
                    <option value="type">Membership Type</option>
                    <option value="month">Month</option>
                  </select>
                </label>
              </div>
              <div className="adm-filter-actions">
                <button className="btn ghost" onClick={() => { setMf({ dateFrom:'', dateTo:'', membershipType:'', status:'', groupBy:'' }); setMemberRows([]) }}>Reset</button>
                <button className="btn primary" onClick={loadMembers} disabled={memberLoading}>{memberLoading ? 'Loading…' : 'Generate Report'}</button>
              </div>
              {memberError && <div className="adm-error">{memberError}</div>}
              {memberRows.length > 0 && (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    {memberGrouped && mf.groupBy === 'type' ? (
                      <>
                        <thead><tr><th>Type</th><th>Total</th><th>Active</th><th>Canceled</th><th>Expired</th></tr></thead>
                        <tbody>{memberRows.map((r, i) => <tr key={i}><td>{r.TypeName}</td><td>{r.total}</td><td>{r.active}</td><td>{r.canceled}</td><td>{r.expired}</td></tr>)}</tbody>
                      </>
                    ) : memberGrouped && mf.groupBy === 'month' ? (
                      <>
                        <thead><tr><th>Month</th><th>New Members</th><th>Active</th></tr></thead>
                        <tbody>{memberRows.map((r, i) => <tr key={i}><td>{r.month}</td><td>{r.total}</td><td>{r.active}</td></tr>)}</tbody>
                      </>
                    ) : (
                      <>
                        <thead><tr><th>ID</th><th>Visitor</th><th>Type</th><th>Status</th><th>Start Date</th><th>Expiration</th></tr></thead>
                        <tbody>
                          {memberRows.map((r, i) => (
                            <tr key={i} className={r.Status === 'Canceled' || r.Status === 'Expired' ? 'adm-row-cancelled' : ''}>
                              <td>#{r.MembershipID}</td><td>{r.visitorName}</td><td>{r.TypeName}</td>
                              <td><span className={`adm-badge adm-badge-${(r.Status||'').toLowerCase()}`}>{r.Status}</span></td>
                              <td>{r.startDate}</td><td>{r.expirationDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                  </table>
                  <div className="adm-row-count">{memberRows.length} row{memberRows.length !== 1 ? 's' : ''}</div>
                </div>
              )}
              {!memberLoading && memberRows.length === 0 && !memberError && (
                <div className="adm-empty">Use the filters above and click Generate Report.</div>
              )}
            </div>
          </div>
        )}

        {/* ── MEMBERSHIP × EXHIBIT TAB ── */}
        {activeTab === 'memexhibit' && (
          <div className="adm-tab-content">
            <div className="adm-section">
              <h2>Membership Tier × Exhibit Engagement</h2>
              <p className="adm-section-desc">How each membership tier drives ticket purchases and revenue across exhibits. Identify which tiers engage most with specific exhibits to optimize pricing, promotions, and exhibit planning.</p>
              <div className="adm-filter-grid">
                <label>Visit Date From
                  <input type="date" value={mef.dateFrom} onChange={e => setMeF('dateFrom', e.target.value)} />
                </label>
                <label>Visit Date To
                  <input type="date" value={mef.dateTo} onChange={e => setMeF('dateTo', e.target.value)} />
                </label>
                <label>Membership Type
                  <select value={mef.membershipType} onChange={e => setMeF('membershipType', e.target.value)}>
                    <option value="">All Types</option>
                    <option value="1">Basic</option>
                    <option value="2">Premium</option>
                    <option value="3">Patron</option>
                  </select>
                </label>
                <label>Exhibit
                  <select value={mef.exhibitId} onChange={e => setMeF('exhibitId', e.target.value)}>
                    <option value="">All Exhibits</option>
                    <option value="1">Space</option>
                    <option value="2">Natural History</option>
                    <option value="3">Ancient Civilizations</option>
                  </select>
                </label>
                <label>Sort By
                  <select value={mef.sortBy} onChange={e => setMeF('sortBy', e.target.value)}>
                    <option value="revenue_desc">Highest Revenue</option>
                    <option value="revenue_asc">Lowest Revenue</option>
                    <option value="tickets_desc">Most Tickets Sold</option>
                    <option value="members_desc">Most Members</option>
                    <option value="type_asc">Membership Type A–Z</option>
                    <option value="exhibit_asc">Exhibit A–Z</option>
                  </select>
                </label>
              </div>
              <div className="adm-filter-actions">
                <button className="btn ghost" onClick={() => { setMef({ dateFrom: '', dateTo: '', membershipType: '', exhibitId: '', sortBy: 'revenue_desc' }); setMeRows(null) }}>Reset</button>
                <button className="btn primary" onClick={loadMeReport} disabled={meLoading}>{meLoading ? 'Loading…' : 'Generate Report'}</button>
                {meRows?.length > 0 && <button className="btn ghost" onClick={exportMeCSV}>Export CSV</button>}
              </div>
              {meError && <div className="adm-error">{meError}</div>}
              {meRows === null && !meLoading && (
                <div className="adm-empty">Use the filters above and click Generate Report.</div>
              )}
              {meRows !== null && !meLoading && meRows.length === 0 && (
                <div className="adm-empty">No data matches your filters.</div>
              )}
              {meRows?.length > 0 && (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Membership Type</th>
                        <th>Discount</th>
                        <th>Exhibit</th>
                        <th>Status</th>
                        <th>Members</th>
                        <th>Tickets Sold</th>
                        <th>Revenue</th>
                        <th>Avg Revenue / Member</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meRows.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.MembershipType}</strong></td>
                          <td>{r.DiscountPercent}%</td>
                          <td>{r.ExhibitName}</td>
                          <td>
                            <span className={`adm-badge ${r.ExhibitStatus === 'Active' ? 'adm-badge--green' : 'adm-badge--red'}`}>
                              {r.ExhibitStatus}
                            </span>
                          </td>
                          <td>{r.Members}</td>
                          <td>{r.TicketsSold}</td>
                          <td>${fmt(r.Revenue)}</td>
                          <td>{r.Members > 0 ? `$${fmt(parseFloat(r.Revenue) / r.Members)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="adm-row-count">{meRows.length} row{meRows.length !== 1 ? 's' : ''}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {createModal && (
        <div className="artifact-modal-overlay" onClick={closeCreateModal}>
          <div className="artifact-modal" style={{maxWidth:540}} onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <h2>Create Account</h2>
              <button className="artifact-modal-close" onClick={closeCreateModal}>✕</button>
            </div>
            <form className="artifact-form" onSubmit={handleCreateAccount}>
              <label className="artifact-label">Account Type
                <select className="artifact-input" value={createForm.accountType} onChange={e => setCreateForm(f => ({...f, accountType: e.target.value}))}>
                  <option value="Visitor">Visitor</option>
                  <option value="Curator">Curator</option>
                  <option value="Gift_Shop_Manager">Gift Shop Manager</option>
                </select>
              </label>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <label className="artifact-label">First Name <span className="artifact-required">*</span>
                  <input className="artifact-input" type="text" value={createForm.firstName} onChange={e => setCreateForm(f => ({...f, firstName: e.target.value}))} />
                </label>
                <label className="artifact-label">Last Name <span className="artifact-required">*</span>
                  <input className="artifact-input" type="text" value={createForm.lastName} onChange={e => setCreateForm(f => ({...f, lastName: e.target.value}))} />
                </label>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <label className="artifact-label">Username <span className="artifact-required">*</span>
                  <input className="artifact-input" type="text" value={createForm.username} onChange={e => setCreateForm(f => ({...f, username: e.target.value}))} autoComplete="off" />
                </label>
                <label className="artifact-label">Password <span className="artifact-required">*</span>
                  <input className="artifact-input" type="password" value={createForm.password} onChange={e => setCreateForm(f => ({...f, password: e.target.value}))} autoComplete="new-password" />
                </label>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <label className="artifact-label">Email
                  <input className="artifact-input" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({...f, email: e.target.value}))} />
                </label>
                <label className="artifact-label">Phone
                  <input className="artifact-input" type="text" value={createForm.phone} onChange={e => setCreateForm(f => ({...f, phone: e.target.value}))} maxLength={11} />
                </label>
              </div>
              {createForm.accountType === 'Visitor' && (
                <>
                  <label className="artifact-label">Address
                    <input className="artifact-input" type="text" value={createForm.address} onChange={e => setCreateForm(f => ({...f, address: e.target.value}))} />
                  </label>
                  <label className="artifact-label">Date of Birth
                    <input className="artifact-input" type="date" value={createForm.dateOfBirth} onChange={e => setCreateForm(f => ({...f, dateOfBirth: e.target.value}))} />
                  </label>
                </>
              )}

              {(createForm.accountType === 'Curator' || createForm.accountType === 'Gift_Shop_Manager') && (
                <>
                  <label className="artifact-label">Address
                    <input className="artifact-input" type="text" value={createForm.address} onChange={e => setCreateForm(f => ({...f, address: e.target.value}))} />
                  </label>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                    <label className="artifact-label">Date of Birth
                      <input className="artifact-input" type="date" value={createForm.dateOfBirth} onChange={e => setCreateForm(f => ({...f, dateOfBirth: e.target.value}))} />
                    </label>
                    <label className="artifact-label">Hire Date
                      <input className="artifact-input" type="date" value={createForm.hireDate} onChange={e => setCreateForm(f => ({...f, hireDate: e.target.value}))} />
                    </label>
                  </div>
                </>
              )}

              {createError && <p className="artifact-form-error">{createError}</p>}
              {createSuccess && <p className="artifact-form-success">{createSuccess}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={closeCreateModal}>Cancel</button>
                <button type="submit" className="btn primary" disabled={createSubmitting}>
                  {createSubmitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Admin</footer>
    </div>
  )
}
