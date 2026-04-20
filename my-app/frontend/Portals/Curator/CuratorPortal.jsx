import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './CuratorPortal.css'
import ProfileMenu from '../../components/ProfileMenu.jsx'
import { useAuth } from '../../../src/AuthContext.jsx'
import { API_BASE } from '../../../src/api.js'

const EXHIBIT_ICONS = ['🚀', '🦕', '🏛️', '🔭', '🌿', '⚗️']
const ACCENT_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#dc2626']

export default function CuratorPortal() {
  const { user } = useAuth()
  const apiBase = API_BASE()

  const [activeTab, setActiveTab] = useState('overview')

  const [exhibits, setExhibits] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [artifactsLoading, setArtifactsLoading] = useState(false)

  // ── Add Artifact ──
  const BLANK_FORM = { name: '', description: '', entryDate: '', exhibitId: '', imageURL: '' }
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [preselectedExhibit, setPreselectedExhibit] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // ── Edit Artifact ──
  const [editModal,   setEditModal]   = useState(false)
  const [editForm,    setEditForm]    = useState(BLANK_FORM)
  const [editId,      setEditId]      = useState(null)
  const [editSaving,  setEditSaving]  = useState(false)
  const [editError,   setEditError]   = useState('')

  // ── Delete Artifact ──
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleteSaving,  setDeleteSaving]  = useState(false)
  const [deleteError,   setDeleteError]   = useState('')

  // ── Artifact filters / pagination ──
  const [artSearch, setArtSearch] = useState('')
  const [artExhibitFilter, setArtExhibitFilter] = useState('')
  const [artDateFrom, setArtDateFrom] = useState('')
  const [artDateTo, setArtDateTo] = useState('')
  const [artPage, setArtPage] = useState(1)
  const ART_PER_PAGE = 10

  // ── Cancel Exhibit ──
  const [cancelExhibitTarget, setCancelExhibitTarget] = useState(null) // exhibit object
  const [cancelExhibitState, setCancelExhibitState] = useState('idle') // idle | loading | success | error
  const [cancelExhibitError, setCancelExhibitError] = useState('')
  const [cancelExhibitDate, setCancelExhibitDate] = useState('')

  const openCancelExhibit = (ex) => {
    setCancelExhibitTarget(ex)
    setCancelExhibitState('idle')
    setCancelExhibitError('')
    // Default to the exhibit's scheduled date, or empty if none
    setCancelExhibitDate(ex.ExhibitOffDate ? String(ex.ExhibitOffDate).slice(0, 10) : '')
  }
  const closeCancelExhibit = () => {
    if (cancelExhibitState === 'loading') return
    setCancelExhibitTarget(null)
    setCancelExhibitState('idle')
    setCancelExhibitError('')
    setCancelExhibitDate('')
  }
  // ── Restore Exhibit ──
  const [restoringExhibitId, setRestoringExhibitId] = useState(null)
  const handleRestoreExhibit = async (ex) => {
    setRestoringExhibitId(ex.ExhibitID)
    try {
      const uid = user?.userId || user?.UserID || user?.id
      const res = await fetch(`${apiBase}/api/curator/exhibit/${ex.ExhibitID}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to restore exhibit.'); return }
      setExhibits(prev => prev.map(e =>
        e.ExhibitID === ex.ExhibitID ? { ...e, Status: 'Active', ExhibitOffDate: null } : e
      ))
    } catch { alert('Network error.') }
    finally { setRestoringExhibitId(null) }
  }

  const handleCancelExhibit = async () => {
    if (!cancelExhibitTarget) return
    if (!cancelExhibitDate) {
      setCancelExhibitError('Please select the date to cancel.')
      return
    }
    setCancelExhibitState('loading')
    setCancelExhibitError('')
    try {
      const uid = user?.userId || user?.UserID || user?.id
      const res = await fetch(`${apiBase}/api/curator/exhibit/${cancelExhibitTarget.ExhibitID}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, cancelDate: cancelExhibitDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCancelExhibitError(data.error || 'Failed to cancel exhibit.')
        setCancelExhibitState('error')
        return
      }
      // Update local state so card reflects new status + date immediately
      setExhibits(prev => prev.map(ex =>
        ex.ExhibitID === cancelExhibitTarget.ExhibitID
          ? { ...ex, Status: 'Cancelled', ExhibitOffDate: cancelExhibitDate }
          : ex
      ))
      setCancelExhibitState('success')
      // Dispatch so ProfileMenu bell re-fetches curator notification
      window.dispatchEvent(new CustomEvent('exhibit-cancelled'))
      setTimeout(() => { closeCancelExhibit() }, 2000)
    } catch {
      setCancelExhibitError('Network error.')
      setCancelExhibitState('error')
    }
  }

  // ── Exhibit Report ──
  const [rptFilters, setRptFilters] = useState({ dateFrom: '', dateTo: '', sortBy: 'revenue_desc' })
  const [rptRows,    setRptRows]    = useState(null)
  const [rptLoading, setRptLoading] = useState(false)
  const [rptError,   setRptError]   = useState('')
  const setRf = (key, val) => setRptFilters(prev => ({ ...prev, [key]: val }))

  const fetchArtifacts = async () => {
    setArtifactsLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/curator/artifacts`)
      const data = await res.json()
      if (data.artifacts) setArtifacts(data.artifacts)
    } catch {}
    finally { setArtifactsLoading(false) }
  }

  useEffect(() => {
    fetch(`${apiBase}/api/exhibits`)
      .then(r => r.json())
      .then(d => { if (d.exhibits) setExhibits(d.exhibits) })
      .catch(() => {})
    fetchArtifacts()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const displayExhibits = exhibits

  // ── Filtered + paginated artifacts ──
  const filteredArtifacts = artifacts.filter(a => {
    if (artExhibitFilter && String(a.ExhibitID) !== artExhibitFilter) return false
    if (artSearch) {
      const q = artSearch.toLowerCase()
      if (!(a.Name || '').toLowerCase().includes(q) && !(a.Description || '').toLowerCase().includes(q)) return false
    }
    if (artDateFrom) {
      const d = (a.EntryDate || '').slice(0, 10)
      if (!d || d < artDateFrom) return false
    }
    if (artDateTo) {
      const d = (a.EntryDate || '').slice(0, 10)
      if (!d || d > artDateTo) return false
    }
    return true
  })
  const artTotalPages = Math.max(1, Math.ceil(filteredArtifacts.length / ART_PER_PAGE))
  const safePage = Math.min(artPage, artTotalPages)
  const pagedArtifacts = filteredArtifacts.slice((safePage - 1) * ART_PER_PAGE, safePage * ART_PER_PAGE)

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
    setForm({ name: '', description: '', entryDate: '', exhibitId: String(exhibitId), imageURL: '' })
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
      await fetchArtifacts()
      setFormSuccess(`"${form.name}" added successfully!`)
      setTimeout(() => { setAddModal(false); setFormSuccess('') }, 1500)
    } catch { setFormError('Network error.') }
    finally { setSubmitting(false) }
  }

  const openEditArtifact = (a) => {
    setEditId(a.ArtifactID)
    setEditForm({
      name:        a.Name || '',
      description: a.Description || '',
      entryDate:   a.EntryDate ? String(a.EntryDate).slice(0, 10) : '',
      exhibitId:   String(a.ExhibitID || ''),
      imageURL:    a.ImageURL || '',
    })
    setEditError('')
    setEditModal(true)
  }
  const closeEditArtifact = () => { setEditModal(false); setEditError('') }
  const handleEditArtifact = async (e) => {
    e.preventDefault()
    if (!editForm.name || !editForm.exhibitId) { setEditError('Name and exhibit are required.'); return }
    setEditSaving(true); setEditError('')
    try {
      const uid = user?.userId || user?.UserID || user?.id
      const res = await fetch(`${apiBase}/api/curator/artifacts/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, userId: uid }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || 'Failed to update artifact.'); return }
      setArtifacts(prev => prev.map(a => a.ArtifactID === editId ? data.artifact : a))
      closeEditArtifact()
    } catch { setEditError('Network error.') }
    finally { setEditSaving(false) }
  }

  const openDeleteArtifact = (a) => { setDeleteTarget(a); setDeleteError('') }
  const closeDeleteArtifact = () => { setDeleteTarget(null); setDeleteError('') }
  const handleDeleteArtifact = async () => {
    if (!deleteTarget) return
    setDeleteSaving(true); setDeleteError('')
    try {
      const uid = user?.userId || user?.UserID || user?.id
      const res = await fetch(`${apiBase}/api/curator/artifacts/${deleteTarget.ArtifactID}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error || 'Failed to delete artifact.'); return }
      setArtifacts(prev => prev.filter(a => a.ArtifactID !== deleteTarget.ArtifactID))
      closeDeleteArtifact()
    } catch { setDeleteError('Network error.') }
    finally { setDeleteSaving(false) }
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
              <span className="curator-stat-num">{artifacts.length}</span>
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
              <div className="curator-metric-value">{artifacts.length}</div>
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
                <div key={ex.ExhibitID} className={`exhibit-card${ex.Status === 'Cancelled' ? ' exhibit-card--cancelled' : ''}`} style={{ '--accent-color': ACCENT_COLORS[i % ACCENT_COLORS.length] }}>
                  <div className="exhibit-card-icon">{EXHIBIT_ICONS[i % EXHIBIT_ICONS.length]}</div>
                  <div className="exhibit-card-body">
                    <div className="ex-name">
                      {ex.ExhibitName}
                      {ex.Status === 'Cancelled' && <span className="exhibit-cancelled-badge">Cancelled</span>}
                    </div>
                    {ex.Description && (
                      <div className="ex-desc">{ex.Description.slice(0, 65)}{ex.Description.length > 65 ? '…' : ''}</div>
                    )}
                    {ex.ExhibitOffDate && (
                      <div className="ex-date">📅 {new Date(ex.ExhibitOffDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    )}
                  </div>
                  <div className="exhibit-card-actions">
                    <button
                      className="add-artifact-btn"
                      onClick={() => openModal(ex.ExhibitID, ex.ExhibitName)}
                    >
                      + Artifact
                    </button>
                    {ex.Status !== 'Cancelled' ? (
                      <button
                        className="cancel-exhibit-btn"
                        onClick={() => openCancelExhibit(ex)}
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        className="restore-exhibit-btn"
                        onClick={() => handleRestoreExhibit(ex)}
                        disabled={restoringExhibitId === ex.ExhibitID}
                      >
                        {restoringExhibitId === ex.ExhibitID ? 'Restoring…' : '↩ Restore'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Artifacts panel */}
          <div className="curator-panel">
            <div className="curator-panel-header">
              <div>
                <div className="curator-panel-title">Artifacts</div>
                <div className="curator-panel-subtitle">All artifacts in the collection — edit or remove entries</div>
              </div>
              <button className="curator-csv-btn" onClick={fetchArtifacts} disabled={artifactsLoading} style={{fontSize:13}}>
                {artifactsLoading ? 'Loading…' : '↻ Refresh'}
              </button>
            </div>

            {/* Filters row */}
            <div className="curator-art-filters">
              <div className="curator-art-search-wrap">
                <span className="curator-art-search-icon">🔍</span>
                <input
                  className="curator-art-search"
                  type="text"
                  placeholder="Search artifacts…"
                  value={artSearch}
                  onChange={e => { setArtSearch(e.target.value); setArtPage(1) }}
                />
              </div>
              <select
                className="curator-art-filter-select"
                value={artExhibitFilter}
                onChange={e => { setArtExhibitFilter(e.target.value); setArtPage(1) }}
              >
                <option value="">All Exhibits</option>
                {displayExhibits.map(ex => (
                  <option key={ex.ExhibitID} value={String(ex.ExhibitID)}>{ex.ExhibitName}</option>
                ))}
              </select>
              <input
                className="curator-art-filter-date"
                type="date"
                title="Date added from"
                value={artDateFrom}
                onChange={e => { setArtDateFrom(e.target.value); setArtPage(1) }}
              />
              <input
                className="curator-art-filter-date"
                type="date"
                title="Date added to"
                value={artDateTo}
                onChange={e => { setArtDateTo(e.target.value); setArtPage(1) }}
              />
              {(artSearch || artExhibitFilter || artDateFrom || artDateTo) && (
                <button className="curator-art-filter-clear" onClick={() => { setArtSearch(''); setArtExhibitFilter(''); setArtDateFrom(''); setArtDateTo(''); setArtPage(1) }}>
                  Clear
                </button>
              )}
            </div>

            {filteredArtifacts.length === 0 && !artifactsLoading ? (
              <div style={{padding:'24px',textAlign:'center',color:'rgba(2,6,23,0.45)'}}>
                {artifacts.length === 0 ? 'No artifacts found.' : 'No artifacts match your filters.'}
              </div>
            ) : (
            <>
            <table className="artifacts-table">
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Exhibit</th>
                  <th>Date Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedArtifacts.map((a, i) => (
                  <tr key={a.ArtifactID} className={i % 2 === 0 ? 'row-even' : ''}>
                    <td><span className="artifact-name">{a.Name}</span></td>
                    <td><span className="exhibit-tag">{a.ExhibitName || '—'}</span></td>
                    <td className="date-cell">{a.EntryDate ? String(a.EntryDate).slice(0, 10) : '—'}</td>
                    <td>
                      <div className="curator-action-btns">
                        <button className="curator-edit-btn" onClick={() => openEditArtifact(a)}>✎ Edit</button>
                        <button className="curator-delete-btn" onClick={() => openDeleteArtifact(a)}>🗑 Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="curator-art-pagination">
              <span className="curator-art-page-info">
                {filteredArtifacts.length} artifact{filteredArtifacts.length !== 1 ? 's' : ''}
                {' · '}Page {safePage} of {artTotalPages}
              </span>
              <div className="curator-art-page-btns">
                <button disabled={safePage <= 1} onClick={() => setArtPage(1)}>«</button>
                <button disabled={safePage <= 1} onClick={() => setArtPage(p => Math.max(1, p - 1))}>‹</button>
                <button disabled={safePage >= artTotalPages} onClick={() => setArtPage(p => Math.min(artTotalPages, p + 1))}>›</button>
                <button disabled={safePage >= artTotalPages} onClick={() => setArtPage(artTotalPages)}>»</button>
              </div>
            </div>
            </>
            )}
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

      {/* ── Cancel Exhibit modal ── */}
      {cancelExhibitTarget && (
        <div className="artifact-modal-overlay" onClick={closeCancelExhibit}>
          <div className="artifact-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            {cancelExhibitState === 'success' ? (
              <div className="artifact-form" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h2 style={{ marginBottom: 8 }}>Exhibit Cancelled</h2>
                <p style={{ color: 'rgba(2,6,23,0.6)' }}>
                  All affected tickets have been cancelled and visitors have been notified.
                </p>
              </div>
            ) : (
              <>
                <div className="artifact-modal-header">
                  <h2 className="artifact-modal-title">Cancel Exhibit</h2>
                  <button className="artifact-modal-close" onClick={closeCancelExhibit} disabled={cancelExhibitState === 'loading'}>✕</button>
                </div>
                <div className="artifact-form">
                  <div className="cancel-exhibit-warning">
                    ⚠️ You are about to cancel <strong>{cancelExhibitTarget.ExhibitName}</strong>.
                  </div>
                  <label className="artifact-label" style={{ marginBottom: 16 }}>
                    Cancellation Date <span className="artifact-required">*</span>
                    <input
                      className="artifact-input"
                      type="date"
                      value={cancelExhibitDate}
                      onChange={e => setCancelExhibitDate(e.target.value)}
                      disabled={cancelExhibitState === 'loading'}
                    />
                    <span style={{ fontSize: 12, color: 'rgba(2,6,23,0.45)', marginTop: 4, display: 'block' }}>
                      Visitors with tickets on this date will be notified and this date will be blocked for new bookings.
                    </span>
                  </label>
                  <p style={{ marginBottom: 8, fontSize: 14, color: 'rgba(2,6,23,0.7)' }}>
                    This will:
                  </p>
                  <ul className="cancel-exhibit-list">
                    <li>Mark the exhibit as <strong>Cancelled</strong> on the selected date</li>
                    <li>Automatically cancel all visitor tickets on that date</li>
                    <li>Send a notification to each affected visitor</li>
                    <li>Block new ticket purchases for this exhibit on that date</li>
                    <li>Visitors can reschedule <strong>free of charge</strong></li>
                  </ul>
                  <p className="cancel-exhibit-irreversible">This action cannot be undone.</p>
                  {cancelExhibitError && <p className="artifact-form-error">{cancelExhibitError}</p>}
                  <div className="artifact-form-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={closeCancelExhibit}
                      disabled={cancelExhibitState === 'loading'}
                    >
                      Keep Exhibit
                    </button>
                    <button
                      type="button"
                      className="btn curator-btn-danger"
                      onClick={handleCancelExhibit}
                      disabled={cancelExhibitState === 'loading'}
                    >
                      {cancelExhibitState === 'loading' ? 'Cancelling…' : 'Yes, Cancel Exhibit'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Artifact modal ── */}
      {editModal && (
        <div className="artifact-modal-overlay" onClick={closeEditArtifact}>
          <div className="artifact-modal" onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <h2 className="artifact-modal-title">Edit Artifact</h2>
              <button className="artifact-modal-close" onClick={closeEditArtifact}>✕</button>
            </div>
            <form className="artifact-form" onSubmit={handleEditArtifact}>
              <label className="artifact-label">
                Exhibit <span className="artifact-required">*</span>
                <select className="artifact-input" value={editForm.exhibitId} onChange={e => setEditForm(f => ({ ...f, exhibitId: e.target.value }))}>
                  <option value="">— Select exhibit —</option>
                  {displayExhibits.map(ex => (
                    <option key={ex.ExhibitID} value={String(ex.ExhibitID)}>{ex.ExhibitName}</option>
                  ))}
                </select>
              </label>
              <label className="artifact-label">
                Artifact Name <span className="artifact-required">*</span>
                <input className="artifact-input" type="text" placeholder="e.g. Iron Meteorite Fragment"
                  value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </label>
              <label className="artifact-label">
                Description
                <textarea className="artifact-input artifact-textarea" rows={3} placeholder="Brief description…"
                  value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              </label>
              <label className="artifact-label">
                Entry Date
                <input className="artifact-input" type="date" value={editForm.entryDate}
                  onChange={e => setEditForm(f => ({ ...f, entryDate: e.target.value }))} />
              </label>
              <label className="artifact-label">
                Image URL
                <input className="artifact-input" type="url" placeholder="https://…"
                  value={editForm.imageURL} onChange={e => setEditForm(f => ({ ...f, imageURL: e.target.value }))} />
              </label>
              {editForm.imageURL?.trim() && (
                <div style={{marginBottom:12}}>
                  <img src={editForm.imageURL} alt="preview" style={{maxHeight:120,borderRadius:8,objectFit:'cover',border:'1px solid rgba(0,0,0,0.08)'}}
                    onError={e => { e.target.style.display='none' }} />
                </div>
              )}
              {editError && <p className="artifact-form-error">{editError}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={closeEditArtifact}>Cancel</button>
                <button type="submit" className="btn primary" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm modal ── */}
      {deleteTarget && (
        <div className="artifact-modal-overlay" onClick={closeDeleteArtifact}>
          <div className="artifact-modal" style={{maxWidth:420}} onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <h2 className="artifact-modal-title">Delete Artifact</h2>
              <button className="artifact-modal-close" onClick={closeDeleteArtifact}>✕</button>
            </div>
            <div className="artifact-form">
              <p style={{marginBottom:16}}>Are you sure you want to delete <strong>{deleteTarget.Name}</strong>? This cannot be undone.</p>
              {deleteError && <p className="artifact-form-error">{deleteError}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={closeDeleteArtifact}>Cancel</button>
                <button type="button" className="btn curator-btn-danger" onClick={handleDeleteArtifact} disabled={deleteSaving}>
                  {deleteSaving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <label className="artifact-label">
                Image URL
                <input
                  className="artifact-input"
                  type="url"
                  placeholder="https://…"
                  value={form.imageURL}
                  onChange={e => setForm(f => ({ ...f, imageURL: e.target.value }))}
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
