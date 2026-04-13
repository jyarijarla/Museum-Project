import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './CuratorPortal.css'
import ProfileMenu from '../../components/ProfileMenu.jsx'
import { useAuth } from '../../../src/AuthContext.jsx'

const EXHIBIT_ICONS = ['🚀', '🦕', '🏛️', '🔭', '🌿', '⚗️']
const ACCENT_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#dc2626']

export default function CuratorPortal() {
  const { user } = useAuth()
  const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : ''

  const [activeTab, setActiveTab] = useState('overview')

  const [exhibits, setExhibits] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', entryDate: '', exhibitId: '' })
  const [preselectedExhibit, setPreselectedExhibit] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // ── Exhibit Report ──
  const [rptFilters, setRptFilters] = useState({ dateFrom: '', dateTo: '', sortBy: 'revenue_desc' })
  const [rptRows,    setRptRows]    = useState(null)
  const [rptLoading, setRptLoading] = useState(false)
  const [rptError,   setRptError]   = useState('')
  const setRf = (key, val) => setRptFilters(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    fetch(`${apiBase}/api/exhibits`)
      .then(r => r.json())
      .then(d => { if (d.exhibits) setExhibits(d.exhibits) })
      .catch(() => {})
  }, [])

  const mockArtifacts = [
    { ArtifactID: 1, Name: 'Iron Meteorite Fragment', ExhibitName: 'Space Wing',     EntryDate: '2026-03-15' },
    { ArtifactID: 2, Name: 'Trilobite Fossil',        ExhibitName: 'Natural History', EntryDate: '2026-03-10' },
    { ArtifactID: 3, Name: 'Roman Coin Collection',   ExhibitName: 'Ancient Gallery', EntryDate: '2026-02-28' },
    { ArtifactID: 4, Name: 'Ammonite Shell',          ExhibitName: 'Natural History', EntryDate: '2026-02-20' },
    { ArtifactID: 5, Name: 'Apollo Mission Patch',    ExhibitName: 'Space Wing',      EntryDate: '2026-02-10' },
  ]

  const defaultExhibits = [
    { ExhibitID: 1, ExhibitName: 'Space Wing',      Description: 'Explore the cosmos and the history of space exploration.' },
    { ExhibitID: 2, ExhibitName: 'Natural History', Description: 'Discover ancient life and the natural world.' },
    { ExhibitID: 3, ExhibitName: 'Ancient Gallery', Description: 'Artifacts from ancient civilizations.' },
  ]

  const displayExhibits = exhibits.length > 0 ? exhibits : defaultExhibits
  const displayArtifacts = artifacts.length > 0 ? artifacts : mockArtifacts

  const fetchReport = async () => {
    setRptLoading(true); setRptError('')
    try {
      const p = new URLSearchParams()
      if (rptFilters.dateFrom) p.set('dateFrom', rptFilters.dateFrom)
      if (rptFilters.dateTo)   p.set('dateTo',   rptFilters.dateTo)
      if (rptFilters.sortBy)   p.set('sortBy',   rptFilters.sortBy)
      const res  = await fetch(`${apiBase}/api/curator/exhibit-report?${p}`)
      const data = await res.json()
      if (!res.ok) { setRptError(data.error || 'Report failed.'); return }
      setRptRows(data.rows || [])
    } catch { setRptError('Network error.') }
    finally { setRptLoading(false) }
  }

  const exportRptCsv = () => {
    if (!rptRows?.length) return
    const headers = ['Exhibit', 'Status', 'Artifacts', 'Tickets Sold', 'Revenue ($)', 'Avg Ticket Price ($)']
    const body = rptRows.map(r => [
      r.ExhibitName,
      r.Status,
      r.ArtifactCount,
      r.TicketsSold,
      parseFloat(r.Revenue || 0).toFixed(2),
      r.TicketsSold > 0 ? (parseFloat(r.Revenue || 0) / r.TicketsSold).toFixed(2) : '',
    ])
    const csv = [headers, ...body].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `exhibit-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const openModal = (exhibitId, exhibitName) => {
    setForm({ name: '', description: '', entryDate: '', exhibitId: String(exhibitId) })
    setPreselectedExhibit(exhibitName || null)
    setFormError('')
    setFormSuccess('')
    setAddModal(true)
  }

  const handleAddArtifact = async (e) => {
    e.preventDefault()
    if (!form.name || !form.exhibitId) { setFormError('Artifact name is required.'); return }
    setSubmitting(true); setFormError('')
    try {
      const uid = user?.userId || user?.UserID || user?.id
      const res = await fetch(`${apiBase}/api/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: uid }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to add artifact.'); setSubmitting(false); return }
      if (data.artifact) setArtifacts(prev => [data.artifact, ...prev])
      setFormSuccess(`"${form.name}" added successfully!`)
      setTimeout(() => { setAddModal(false); setFormSuccess('') }, 2000)
    } catch { setFormError('Network error.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="home-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/exhibits/space">Space</Link>
          <Link className="nav-link" to="/exhibits/natural">Natural</Link>
          <Link className="nav-link" to="/exhibits/ancient">Ancient</Link>
          <div style={{ marginLeft: 12 }}><ProfileMenu /></div>
        </nav>
      </header>

      <main className="curator-portal-main">

        {/* Hero banner */}
        <div className="curator-hero">
          <div className="curator-hero-text">
            <span className="section-eyebrow">Staff Portal</span>
            <h1 className="curator-hero-title">Curator Portal</h1>
            <p className="curator-hero-sub">Manage exhibits and artifacts across the museum.</p>
          </div>
          <div className="curator-hero-stats">
            <div className="curator-stat">
              <span className="curator-stat-num">{displayExhibits.length}</span>
              <span className="curator-stat-label">Exhibits</span>
            </div>
            <div className="curator-stat-div" />
            <div className="curator-stat">
              <span className="curator-stat-num">{displayArtifacts.length}</span>
              <span className="curator-stat-label">Artifacts</span>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="curator-metrics">
          <div className="curator-metric">
            <div className="curator-metric-icon">🏛️</div>
            <div>
              <div className="curator-metric-value">{displayExhibits.length}</div>
              <div className="curator-metric-label">Active Exhibits</div>
            </div>
          </div>
          <div className="curator-metric">
            <div className="curator-metric-icon">🪨</div>
            <div>
              <div className="curator-metric-value">{displayArtifacts.length}</div>
              <div className="curator-metric-label">Total Artifacts</div>
            </div>
          </div>
          <div className="curator-metric">
            <div className="curator-metric-icon">📅</div>
            <div>
              <div className="curator-metric-value">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="curator-metric-label">Today</div>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="curator-tab-nav">
          <button className={`curator-tab-btn${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setActiveTab('overview')}>
            🏛️ Exhibits &amp; Artifacts
          </button>
          <button className={`curator-tab-btn${activeTab === 'report' ? ' active' : ''}`} onClick={() => setActiveTab('report')}>
            📊 Exhibit Report
          </button>
        </div>

        {/* ═══ Overview tab ═══ */}
        {activeTab === 'overview' && (
        <div className="curator-panels">

          {/* Exhibits panel */}
          <div className="curator-panel">
            <div className="curator-panel-header">
              <div>
                <div className="curator-panel-title">Exhibits</div>
                <div className="curator-panel-subtitle">Select an exhibit to add an artifact to it</div>
              </div>
            </div>
            <div className="exhibit-list">
              {displayExhibits.map((ex, i) => (
                <div key={ex.ExhibitID} className="exhibit-card" style={{ '--accent-color': ACCENT_COLORS[i % ACCENT_COLORS.length] }}>
                  <div className="exhibit-card-icon">{EXHIBIT_ICONS[i % EXHIBIT_ICONS.length]}</div>
                  <div className="exhibit-card-body">
                    <div className="ex-name">{ex.ExhibitName}</div>
                    {ex.Description && (
                      <div className="ex-desc">{ex.Description.slice(0, 65)}{ex.Description.length > 65 ? '…' : ''}</div>
                    )}
                  </div>
                  <button
                    className="add-artifact-btn"
                    onClick={() => openModal(ex.ExhibitID, ex.ExhibitName)}
                  >
                    + Artifact
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Artifacts panel */}
          <div className="curator-panel">
            <div className="curator-panel-header">
              <div>
                <div className="curator-panel-title">Recent Artifacts</div>
                <div className="curator-panel-subtitle">Latest additions to the collection</div>
              </div>
            </div>
            <table className="artifacts-table">
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Exhibit</th>
                  <th>Date Added</th>
                </tr>
              </thead>
              <tbody>
                {displayArtifacts.map((a, i) => (
                  <tr key={a.ArtifactID} className={i % 2 === 0 ? 'row-even' : ''}>
                    <td><span className="artifact-name">{a.Name}</span></td>
                    <td><span className="exhibit-tag">{a.ExhibitName || '—'}</span></td>
                    <td className="date-cell">{a.EntryDate ? String(a.EntryDate).slice(0, 10) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
        )} {/* end overview tab */}

        {/* ═══ Report tab ═══ */}
        {activeTab === 'report' && (
          <div className="curator-panel">
            <div className="curator-panel-header">
              <div>
                <div className="curator-panel-title">Exhibit Performance Report</div>
                <div className="curator-panel-subtitle">Artifact distribution vs. visitor demand — identify content gaps and promotional opportunities</div>
              </div>
              {rptRows?.length > 0 && (
                <button className="curator-csv-btn" onClick={exportRptCsv}>Export CSV</button>
              )}
            </div>

            <div className="curator-rpt-filters">
              <label className="curator-filter-label">
                Visit Date From
                <input type="date" className="curator-filter-input" value={rptFilters.dateFrom} onChange={e => setRf('dateFrom', e.target.value)} />
              </label>
              <label className="curator-filter-label">
                Visit Date To
                <input type="date" className="curator-filter-input" value={rptFilters.dateTo} onChange={e => setRf('dateTo', e.target.value)} />
              </label>
              <label className="curator-filter-label">
                Sort By
                <select className="curator-filter-input" value={rptFilters.sortBy} onChange={e => setRf('sortBy', e.target.value)}>
                  <option value="revenue_desc">Highest Revenue</option>
                  <option value="revenue_asc">Lowest Revenue</option>
                  <option value="tickets_desc">Most Tickets Sold</option>
                  <option value="tickets_asc">Fewest Tickets Sold</option>
                  <option value="artifacts_desc">Most Artifacts</option>
                  <option value="name_asc">Name A–Z</option>
                </select>
              </label>
              <div className="curator-filter-actions">
                <button className="curator-generate-btn" onClick={fetchReport} disabled={rptLoading}>
                  {rptLoading ? 'Loading…' : 'Generate Report'}
                </button>
                <button className="curator-reset-btn" onClick={() => { setRptFilters({ dateFrom: '', dateTo: '', sortBy: 'revenue_desc' }); setRptRows(null) }}>
                  Reset
                </button>
              </div>
            </div>

            {rptError && <p className="curator-rpt-error">{rptError}</p>}

            <div className="curator-rpt-output">
              {rptRows === null ? (
                <div className="curator-rpt-placeholder">
                  <div className="curator-rpt-icon">📊</div>
                  <p>Click <strong>Generate Report</strong> to see exhibit performance data.</p>
                </div>
              ) : rptLoading ? (
                <div className="curator-rpt-placeholder"><p>Loading…</p></div>
              ) : rptRows.length === 0 ? (
                <div className="curator-rpt-placeholder"><p>No exhibits found.</p></div>
              ) : (
                <table className="curator-rpt-table">
                  <thead>
                    <tr>
                      <th>Exhibit</th>
                      <th>Status</th>
                      <th>Artifacts</th>
                      <th>Tickets Sold</th>
                      <th>Revenue</th>
                      <th>Avg Ticket Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rptRows.map((r, i) => (
                      <tr key={r.ExhibitID} className={i % 2 === 0 ? 'row-even' : ''}>
                        <td><span className="curator-ex-name">{r.ExhibitName}</span></td>
                        <td>
                          <span className={`curator-status-badge ${r.Status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                            {r.Status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{r.ArtifactCount}</td>
                        <td style={{ textAlign: 'center' }}>{r.TicketsSold}</td>
                        <td><span className="curator-revenue-tag">${parseFloat(r.Revenue || 0).toFixed(2)}</span></td>
                        <td className="date-cell">
                          {r.TicketsSold > 0 ? `$${(parseFloat(r.Revenue || 0) / r.TicketsSold).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Curator Portal</footer>

      {addModal && (
        <div className="artifact-modal-overlay" onClick={() => setAddModal(false)}>
          <div className="artifact-modal" onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <div>
                <h2 className="artifact-modal-title">Add Artifact</h2>
                {preselectedExhibit && (
                  <div className="artifact-exhibit-badge">
                    <span className="badge-dot" />
                    {preselectedExhibit}
                  </div>
                )}
              </div>
              <button className="artifact-modal-close" onClick={() => setAddModal(false)}>✕</button>
            </div>
            <form className="artifact-form" onSubmit={handleAddArtifact}>
              <label className="artifact-label">
                Artifact Name <span className="artifact-required">*</span>
                <input
                  className="artifact-input"
                  type="text"
                  placeholder="e.g. Iron Meteorite Fragment"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="artifact-label">
                Description
                <textarea
                  className="artifact-input artifact-textarea"
                  placeholder="Brief description of the artifact…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </label>
              <label className="artifact-label">
                Entry Date
                <input
                  className="artifact-input"
                  type="date"
                  value={form.entryDate}
                  onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
                />
              </label>
              {formError && <p className="artifact-form-error">{formError}</p>}
              {formSuccess && <p className="artifact-form-success">{formSuccess}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={() => setAddModal(false)}>Cancel</button>
                <button type="submit" className="btn primary" disabled={submitting}>{submitting ? 'Adding…' : 'Add Artifact'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
