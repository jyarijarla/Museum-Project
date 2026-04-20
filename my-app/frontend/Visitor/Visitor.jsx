import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Visitor.css'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { useAuth } from '../../src/AuthContext.jsx'
import { API_BASE } from '../../src/api.js'

export default function Visitor(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const role = user?.role || user?.Role || 'Visitor'
  const isStaff = ['Admin', 'Curator', 'Gift_Shop_Manager'].includes(role)
  const profileTitle = role === 'Admin' ? 'Admin Profile'
    : role === 'Curator' ? 'Curator Profile'
    : role === 'Gift_Shop_Manager' ? 'Staff Profile'
    : 'Visitor Profile'
  const [visitor, setVisitor] = useState(null)
  const [profile, setProfile] = useState(null)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editProfileSaving, setEditProfileSaving] = useState(false)
  const [editProfileError, setEditProfileError] = useState('')
  const [editProfileForm, setEditProfileForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    hireDate: '',
  })
  const [membership, setMembership] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [historyItems, setHistoryItems] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ticketPurchases, setTicketPurchases] = useState([])
  const [cancelModal, setCancelModal] = useState(null) // null | 'confirm' | 'loading' | 'success' | 'error'
  const [cancelError, setCancelError] = useState('')
  const [rescheduleModal, setRescheduleModal] = useState(null) // null | ticket-purchase object
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleAvail, setRescheduleAvail] = useState({ loading: false, items: [], error: null })
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleResult, setRescheduleResult] = useState(null) // null | 'success' | 'error'
  const [rescheduleError, setRescheduleError] = useState('')

  useEffect(()=>{
    if(!user){
      navigate('/login')
      return
    }

    const apiBase = API_BASE()
    const uid = user.userId || user.UserID || user.id || user.userID
    if(!uid) {
      setError('No user id available')
      setLoading(false)
      return
    }

    const fetchData = async ()=>{
      setLoading(true)
      try{
        const pRes = await fetch(`${apiBase}/api/profile/${uid}`)
        if (pRes.ok) {
          const pJson = await pRes.json()
          const p = pJson.profile || null
          setProfile(p)
          if (p?.IsVisitor) {
            setVisitor({
              FirstName: p.FirstName,
              LastName: p.LastName,
              Email: p.Email,
              PhoneNumber: p.PhoneNumber,
              DateOfBirth: p.DateOfBirth,
              Address: p.Address,
            })
          } else {
            setVisitor(null)
          }
        }
        // membership may 404 if none
        try{
          const mRes = await fetch(`${apiBase}/api/visitor/${uid}/membership`)
          if(mRes.ok){
            const mJson = await mRes.json()
            setMembership(mJson.membership)
          } else {
            setMembership(null)
          }
        } catch(e){
          setMembership(null)
        }
        // fetch transactions (product purchase history)
        try{
          const tRes = await fetch(`${apiBase}/api/visitor/${uid}/transactions`)
          if(tRes.ok){
            const tj = await tRes.json()
            const trs = tj.transactions || []
            setTransactions(trs)
            // flatten items into history items with date and total price
            const flat = []
            for(const tr of trs){
              // Parse as local noon to avoid UTC-midnight shifting date back 1 day in US timezones
              const date = tr.Date ? new Date(String(tr.Date).slice(0,10) + 'T12:00:00') : null
              for(const it of (tr.items||[])){
                flat.push({ TransactionID: tr.TransactionID, Date: date, ProductID: it.ProductID, Name: it.Name, Quantity: it.Quantity, Price: Number(it.Price || it.RetailPrice || 0) })
              }
            }
            setHistoryItems(flat)
          }
        }catch(e){
          console.warn('Failed to load transactions', e)
        }
        // Fetch ticket purchase history
        try {
          const tpRes = await fetch(`${apiBase}/api/visitor/${uid}/ticket-purchases`)
          if (tpRes.ok) {
            const tpJson = await tpRes.json()
            setTicketPurchases(tpJson.ticketPurchases || [])
          }
        } catch (e) {
          console.warn('Failed to load ticket purchases', e)
        }
      }catch(e){
        console.error('Dashboard fetch failed', e)
        setError('Failed to load account data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  },[user, navigate])

  const handleLogout = ()=>{ logout(); navigate('/') }

  const openEditProfile = () => {
    const p = profile || {}
    setEditProfileError('')
    setEditProfileForm({
      username: p.Username || user?.username || user?.Username || '',
      firstName: p.FirstName || user?.firstName || user?.FirstName || '',
      lastName: p.LastName || user?.lastName || user?.LastName || '',
      email: p.Email || user?.email || user?.Email || '',
      phoneNumber: p.PhoneNumber || user?.phone || '',
      dateOfBirth: p.DateOfBirth || '',
      address: p.Address || '',
      hireDate: p.HireDate || user?.hireDate || '',
    })
    setEditProfileOpen(true)
  }

  const saveProfile = async () => {
    const uid = user?.userId || user?.UserID || user?.id || user?.userID
    if (!uid) return
    setEditProfileSaving(true)
    setEditProfileError('')
    try {
      const apiBase = API_BASE()
      const res = await fetch(`${apiBase}/api/profile/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProfileForm),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        setEditProfileError(json?.error || 'Failed to update profile.')
        return
      }
      const p = json.profile || null
      setProfile(p)
      if (p?.IsVisitor) {
        setVisitor({
          FirstName: p.FirstName,
          LastName: p.LastName,
          Email: p.Email,
          PhoneNumber: p.PhoneNumber,
          DateOfBirth: p.DateOfBirth,
          Address: p.Address,
        })
      }
      setEditProfileOpen(false)
    } catch {
      setEditProfileError('Network error. Please try again.')
    } finally {
      setEditProfileSaving(false)
    }
  }

  const displayName = user?.Username || user?.username || 'Visitor'

  const memberStatusColor = membership?.computedStatus === 'Active'
    ? '#16a34a' : membership?.computedStatus === 'Canceled' ? '#6b7280' : '#dc2626'

  const memberStatusBg = membership?.computedStatus === 'Active'
    ? 'rgba(22,163,74,0.08)' : membership?.computedStatus === 'Canceled' ? 'rgba(107,114,128,0.08)' : 'rgba(220,38,38,0.08)'
  const handleCancelTicket = async (ticketPurchaseId) => {
  if (!confirm('Are you sure you want to cancel this ticket purchase?')) return
  try {
    const apiBase = API_BASE()
    const resp = await fetch(`${apiBase}/api/visitor/ticket-purchases/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketPurchaseId })
    })
    if (!resp.ok) { alert('Cancel failed: ' + await resp.text()); return }
    const js = await resp.json()
    if (js?.success) {
      // Update to reflect cancellation
      setTicketPurchases(prev => prev.map(tp =>
        tp.TicketPurchaseID === ticketPurchaseId
          ? { ...tp, PurchaseStatus: 'Cancelled', TicketStatus: 'Cancelled' }
          : tp
      ))
        alert('Ticket purchase cancelled successfully')
      } else {
        alert('Cancel failed')
      }
    } catch (e) {
      console.error(e)
      alert('Cancel failed')
    }
  }
  const handleCancelMembership = async () => {
    setCancelModal('loading')
    try{
      const apiBase = API_BASE()
      const mid = membership?.MembershipID || membership?.MembershipId
      const uid = user?.userId || user?.UserID || user?.id || user?.userID
      const resp = await fetch(`${apiBase}/api/membership/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId: mid, userId: uid })
      })
      if(!resp.ok){ setCancelError('Cancel failed: ' + await resp.text()); setCancelModal('error'); return }
      const js = await resp.json()
      if(js?.success){
        const updated = js.membership || null
        setMembership(updated ? { ...updated, computedStatus: 'Canceled' } : null)
        window.dispatchEvent(new CustomEvent('membership-cancelled'))
        setCancelModal('success')
      } else {
        setCancelError('Cancel failed')
        setCancelModal('error')
      }
    } catch(e){
      console.error(e)
      setCancelError('Cancel failed')
      setCancelModal('error')
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10)

  const openRescheduleModal = (tp) => {
    setRescheduleModal(tp)
    setRescheduleDate('')
    setRescheduleAvail({ loading: false, items: [], error: null })
    setRescheduleSubmitting(false)
    setRescheduleResult(null)
    setRescheduleError('')
  }

  const closeRescheduleModal = () => {
    if (rescheduleSubmitting) return
    setRescheduleModal(null)
  }

  // Check capacity for each exhibit in the selected ticket on the chosen date
  const checkRescheduleAvailability = async (date, tp) => {
    if (!date || !tp) return
    setRescheduleAvail({ loading: true, items: [], error: null })
    try {
      const uid = user?.userId || user?.UserID || user?.id || user?.userID
      const apiBase = API_BASE()
      const res = await fetch(`${apiBase}/api/tickets/pricing?visitDate=${date}&userId=${uid}`)
      if (!res.ok) { setRescheduleAvail({ loading: false, items: [], error: 'Could not check availability.' }); return }
      const json = await res.json()
      const allExhibits = json.exhibits || []
      // Only care about exhibits that are in this ticket
      const exhibitIds = new Set(tp.items.map(it => it.ExhibitID || it.exhibitId))
      // items from pricing endpoint keyed by ExhibitID
      const relevant = allExhibits
        .filter(e => exhibitIds.has(e.ExhibitID))
        .map(e => {
          const ticketItem = tp.items.find(it => (it.ExhibitID || it.exhibitId) === e.ExhibitID)
          const needed = ticketItem?.Quantity || 1
          const available = typeof e.available === 'number' ? e.available : e.Available
          const isSoldOut = typeof available === 'number' && available < needed
          const isLimited = typeof available === 'number' && !isSoldOut && available < needed * 2
          return { ...e, needed, available, isSoldOut, isLimited }
        })
      setRescheduleAvail({ loading: false, items: relevant, error: null })
    } catch (e) {
      setRescheduleAvail({ loading: false, items: [], error: 'Could not check availability.' })
    }
  }

  const handleRescheduleSubmit = async () => {
    if (!rescheduleModal || !rescheduleDate) return
    setRescheduleSubmitting(true)
    setRescheduleError('')
    try {
      const apiBase = API_BASE()
      const uid = user?.userId || user?.UserID || user?.id || user?.userID
      const resp = await fetch(`${apiBase}/api/visitor/ticket-purchases/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, ticketPurchaseId: rescheduleModal.TicketPurchaseID, newVisitDate: rescheduleDate })
      })
      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok || !payload?.success) {
        setRescheduleError(payload?.error || 'Reschedule failed. Please try again.')
        setRescheduleResult('error')
      } else {
        setTicketPurchases(prev => prev.map(tp =>
          tp.TicketPurchaseID === rescheduleModal.TicketPurchaseID
            ? { ...tp, VisitDate: rescheduleDate, PurchaseStatus: 'Active', HasOffDateConflict: false }
            : tp
        ))
        window.dispatchEvent(new CustomEvent('ticket-rescheduled'))
        setRescheduleResult('success')
      }
    } catch {
      setRescheduleError('Network error. Please try again.')
      setRescheduleResult('error')
    } finally {
      setRescheduleSubmitting(false)
    }
  }


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
          <div style={{marginRight:8}}><ProfileMenu/></div>
        </nav>
      </header>

      {/* ── Dashboard hero banner ── */}
      <section className="dash-hero">
        <div className="dash-hero-left">
          <div className="dash-avatar">{(displayName)[0].toUpperCase()}</div>
          <div>
            <div className="section-eyebrow">My Account</div>
            <h1 className="dash-welcome">Welcome back, {displayName}</h1>
            <p className="dash-welcome-sub">Manage your profile, membership, and purchase history.</p>
          </div>
        </div>
        <div className="dash-quick-actions">
          <Link to="/tickets" className="dqa-btn dqa-primary">🎟 Buy Tickets</Link>
          <Link to="/membership" className="dqa-btn dqa-ghost">💳 Membership</Link>
          <button className="dqa-btn dqa-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </section>

      <main className="dash-main">
        {loading ? (
          <div className="dash-loading">Loading account information…</div>
        ) : error ? (
          <div className="dash-error">{error}</div>
        ) : (
          <div className="dash-grid">

            {/* ── Left column ── */}
            <div className="dash-col-main">

              {/* Profile card */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <div className="dash-card-icon-wrap">👤</div>
                  <h2 className="dash-card-title">{profileTitle}</h2>
                </div>
                {isStaff ? (
                  <dl className="dash-dl">
                    <div className="dash-dl-row"><dt>Name</dt><dd>{profile?.FirstName || user?.firstName || user?.FirstName || '—'} {profile?.LastName || user?.lastName || user?.LastName || ''}</dd></div>
                    <div className="dash-dl-row"><dt>Username</dt><dd>{profile?.Username || user?.username || user?.Username || '—'}</dd></div>
                    <div className="dash-dl-row"><dt>Email</dt><dd>{profile?.Email || user?.email || user?.Email || '—'}</dd></div>
                    <div className="dash-dl-row"><dt>Role</dt><dd>{role.replace('_', ' ')}</dd></div>
                    {(profile?.PhoneNumber || user?.phone) && <div className="dash-dl-row"><dt>Phone</dt><dd>{profile?.PhoneNumber || user?.phone}</dd></div>}
                    {(profile?.DateOfBirth) && <div className="dash-dl-row"><dt>Date of Birth</dt><dd>{new Date(profile.DateOfBirth + 'T12:00:00').toLocaleDateString()}</dd></div>}
                    {(profile?.Address) && <div className="dash-dl-row"><dt>Address</dt><dd>{profile.Address}</dd></div>}
                    {(profile?.HireDate || user?.hireDate) && <div className="dash-dl-row"><dt>Hire Date</dt><dd>{new Date((profile?.HireDate || user?.hireDate) + 'T12:00:00').toLocaleDateString()}</dd></div>}
                  </dl>
                ) : visitor ? (
                  <dl className="dash-dl">
                    <div className="dash-dl-row"><dt>Name</dt><dd>{visitor.FirstName} {visitor.LastName}</dd></div>
                    <div className="dash-dl-row"><dt>Phone</dt><dd>{visitor.PhoneNumber || '—'}</dd></div>
                    <div className="dash-dl-row"><dt>Email</dt><dd>{visitor.Email || user?.email || user?.Email || '—'}</dd></div>
                    <div className="dash-dl-row"><dt>Date of Birth</dt><dd>{visitor.DateOfBirth ? new Date(visitor.DateOfBirth).toLocaleDateString() : '—'}</dd></div>
                    <div className="dash-dl-row"><dt>Address</dt><dd>{visitor.Address || '—'}</dd></div>
                  </dl>
                ) : (
                  <p className="dash-empty-note">No visitor profile found.</p>
                )}
                <div className="dash-card-actions">
                  <button className="dqa-btn dqa-ghost" onClick={openEditProfile}>Edit information</button>
                </div>
              </div>

              {/* Membership card — visitors only */}
              {!isStaff && <div className="dash-card">
                <div className="dash-card-header">
                  <div className="dash-card-icon-wrap">💳</div>
                  <h2 className="dash-card-title">Membership</h2>
                </div>
                {membership ? (
                  <>
                    <dl className="dash-dl">
                      <div className="dash-dl-row">
                        <dt>Plan</dt>
                        <dd><span className="dash-plan-badge">{membership.TypeName || `Plan ${membership.MembershipTypeID}`}</span></dd>
                      </div>
                      <div className="dash-dl-row"><dt>Start</dt><dd>{membership.StartDate ? new Date(membership.StartDate).toLocaleDateString() : '—'}</dd></div>
                      <div className="dash-dl-row"><dt>Expires</dt><dd>{membership.ExpirationDate ? new Date(membership.ExpirationDate).toLocaleDateString() : '—'}</dd></div>
                      <div className="dash-dl-row">
                        <dt>Status</dt>
                        <dd>
                          <span className="dash-status-chip" style={{color: memberStatusColor, background: memberStatusBg}}>
                            {membership.computedStatus || 'Active'}
                          </span>
                        </dd>
                      </div>
                      {membership.CancelledDate && (
                        <div className="dash-dl-row"><dt>Cancelled</dt><dd>{new Date(membership.CancelledDate).toLocaleDateString()}</dd></div>
                      )}
                    </dl>
                    <div className="dash-card-actions">
                      <button
                        className="dqa-btn dqa-danger"
                        disabled={membership.computedStatus === 'Canceled' || membership.computedStatus === 'Expired'}
                        onClick={() => setCancelModal('confirm')}
                      >Cancel membership</button>
                    </div>
                  </>
                ) : (
                  <p className="dash-empty-note">No active membership. <Link to="/membership">View plans →</Link></p>
                )}
              </div>}

              {/* Ticket Purchase History card — visitors only */}
              {!isStaff && <div className="dash-card">
                <div className="dash-card-header">
                  <div className="dash-card-icon-wrap">🎟️</div>
                  <h2 className="dash-card-title">Ticket Purchase History</h2>
                </div>
                <div className="dash-history-list">
                  {ticketPurchases.length > 0 ? (
                    ticketPurchases.map(tp => (
                      <div key={tp.TicketPurchaseID} className="dash-history-row">
                        <div className="dash-history-info">
                          <span className="dash-history-name">
                            Visit: {tp.VisitDate 
                              ? new Date(String(tp.VisitDate).slice(0,10) + 'T12:00:00').toLocaleDateString() 
                              : '—'}
                          </span>
                          <span className="dash-history-meta">
                            Purchased: {tp.PurchaseDate 
                              ? new Date(String(tp.PurchaseDate).slice(0,10) + 'T12:00:00').toLocaleDateString() 
                              : '—'} ·{' '}
                            {tp.items.map(it => 
                              `${it.ExhibitName} x${it.Quantity}`
                            ).join(', ')} ·{' '}
                            <span style={{
                              color: tp.PurchaseStatus === 'Active' 
                                ? '#16a34a' 
                                : tp.PurchaseStatus === 'Cancelled' 
                                  ? '#dc2626' 
                                  : '#6b7280',
                              fontWeight: 700
                            }}>
                              {tp.PurchaseStatus}
                            </span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span className="dash-history-price">
                            ${Number(tp.TotalAmount || 0).toFixed(2)}
                          </span>
                          {tp.VisitDate && new Date(String(tp.VisitDate).slice(0,10) + 'T12:00:00') >= new Date(new Date().toDateString()) && (
                            <div className="dash-ticket-actions">
                              {(tp.PurchaseStatus === 'Active' || (tp.PurchaseStatus === 'Cancelled' && tp.HasOffDateConflict)) && (
                                <button
                                  className="dqa-btn dqa-ghost"
                                  style={{ fontSize: 11, padding: '3px 10px' }}
                                  onClick={() => openRescheduleModal(tp)}
                                >
                                  📅 Reschedule
                                </button>
                              )}
                              {tp.PurchaseStatus === 'Active' && (
                                <button
                                  className="dqa-btn dqa-danger"
                                  style={{ fontSize: 11, padding: '3px 10px' }}
                                  onClick={() => handleCancelTicket(tp.TicketPurchaseID)}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="dash-empty-note">
                      No ticket purchases found.{' '}
                      <Link to="/tickets">Buy tickets →</Link>
                    </p>
                  )}
                </div>
              </div>}
              {/* Purchase history card — visitors only */}
              {!isStaff && <div className="dash-card">
                <div className="dash-card-header">
                  <div className="dash-card-icon-wrap">🛍️</div>
                  <h2 className="dash-card-title">Purchase History</h2>
                </div>
                <div className="dash-history-controls">
                  <input
                    className="dash-input"
                    value={search}
                    onChange={e=>setSearch(e.target.value)}
                    placeholder="Search product…"
                  />
                  <select className="dash-select" value={sort} onChange={e=>setSort(e.target.value)}>
                    <option value="recent">Recently bought</option>
                    <option value="oldest">Oldest first</option>
                    <option value="price_desc">Price: high → low</option>
                    <option value="price_asc">Price: low → high</option>
                  </select>
                </div>
                <div className="dash-history-list">
                  {historyItems
                    .filter(it=> it.Name?.toLowerCase().includes(search.toLowerCase()))
                    .sort((a,b)=>{
                      if(sort==='recent') return (b.Date?.getTime()||0)-(a.Date?.getTime()||0)
                      if(sort==='oldest') return (a.Date?.getTime()||0)-(b.Date?.getTime()||0)
                      if(sort==='price_desc') return (b.Price||0)-(a.Price||0)
                      if(sort==='price_asc') return (a.Price||0)-(b.Price||0)
                      return 0
                    })
                    .map(it=>(
                      <div key={`${it.TransactionID}-${it.ProductID}`} className="dash-history-row">
                        <div className="dash-history-info">
                          <span className="dash-history-name">{it.Name}</span>
                          <span className="dash-history-meta">Qty {it.Quantity} · {it.Date ? it.Date.toLocaleDateString() : '—'}</span>
                        </div>
                        <span className="dash-history-price">${(Number(it.Price)||0).toFixed(2)}</span>
                      </div>
                    ))
                  }
                  {historyItems.length === 0 && <p className="dash-empty-note">No purchases yet. <Link to="/giftshop">Visit the gift shop →</Link></p>}
                </div>
              </div>}
            </div>

            {/* ── Right sidebar ── */}
            <aside className="dash-col-side">
              <div className="dash-card dash-account-card">
                <div className="dash-sidebar-avatar">{(displayName)[0].toUpperCase()}</div>
                <div className="dash-sidebar-name">{displayName}</div>
                <div className="dash-sidebar-role">{user?.role || user?.Role || 'Visitor'}</div>
                <div className="dash-sidebar-email">{user?.email || user?.Email || '—'}</div>
              </div>

              <div className="dash-card">
                <h3 className="dash-card-title" style={{marginBottom:12}}>Quick Actions</h3>
                <div className="dash-side-actions">
                  <Link to="/tickets" className="dqa-btn dqa-primary" style={{textAlign:'center'}}>🎟 Buy Tickets</Link>
                  <Link to="/membership" className="dqa-btn dqa-ghost" style={{textAlign:'center'}}>💳 Membership</Link>
                  <Link to="/giftshop" className="dqa-btn dqa-ghost" style={{textAlign:'center'}}>🛍️ Gift Shop</Link>
                  <button className="dqa-btn dqa-ghost" style={{textAlign:'center'}} onClick={handleLogout}>Log out</button>
                </div>
              </div>
            </aside>

          </div>
        )}
      </main>

      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">City Museum</div>
          <div className="footer-copy">© {new Date().getFullYear()} City Museum — All rights reserved.</div>
        </div>
      </footer>

      {editProfileOpen && (
        <div className="modal-overlay" onClick={() => { if (!editProfileSaving) setEditProfileOpen(false) }}>
          <div className="modal-card ep-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Edit Profile</h3>
            <div className="ep-form">
              <label className="ep-field ep-field-full">
                <span>Username</span>
                <input className="ep-input" value={editProfileForm.username} onChange={e => setEditProfileForm(s => ({ ...s, username: e.target.value }))} />
              </label>
              <label className="ep-field">
                <span>First name</span>
                <input className="ep-input" value={editProfileForm.firstName} onChange={e => setEditProfileForm(s => ({ ...s, firstName: e.target.value }))} />
              </label>
              <label className="ep-field">
                <span>Last name</span>
                <input className="ep-input" value={editProfileForm.lastName} onChange={e => setEditProfileForm(s => ({ ...s, lastName: e.target.value }))} />
              </label>
              <label className="ep-field ep-field-full">
                <span>Email</span>
                <input className="ep-input" value={editProfileForm.email} onChange={e => setEditProfileForm(s => ({ ...s, email: e.target.value }))} />
              </label>
              <label className="ep-field">
                <span>Phone number</span>
                <input className="ep-input" value={editProfileForm.phoneNumber} onChange={e => setEditProfileForm(s => ({ ...s, phoneNumber: e.target.value }))} />
              </label>
              <label className="ep-field">
                <span>Date of birth</span>
                <input className="ep-input" type="date" value={editProfileForm.dateOfBirth || ''} onChange={e => setEditProfileForm(s => ({ ...s, dateOfBirth: e.target.value }))} />
              </label>
              <label className="ep-field ep-field-full">
                <span>Address</span>
                <input className="ep-input" value={editProfileForm.address} onChange={e => setEditProfileForm(s => ({ ...s, address: e.target.value }))} />
              </label>
              {isStaff && (
                <label className="ep-field">
                  <span>Hire date</span>
                  <input className="ep-input" type="date" value={editProfileForm.hireDate || ''} onChange={e => setEditProfileForm(s => ({ ...s, hireDate: e.target.value }))} />
                </label>
              )}
            </div>
            {editProfileError && <div className="rs-submit-error">⚠️ {editProfileError}</div>}
            <div className="modal-actions">
              <button className="modal-btn modal-btn-ghost" disabled={editProfileSaving} onClick={() => setEditProfileOpen(false)}>Cancel</button>
              <button className="modal-btn modal-btn-primary" disabled={editProfileSaving} onClick={saveProfile}>{editProfileSaving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Membership cancel modal ── */}
      {cancelModal && (
        <div className="modal-overlay" onClick={() => { if(cancelModal !== 'loading') setCancelModal(null) }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            {cancelModal === 'confirm' && (<>
              <div className="modal-icon modal-icon-warn">⚠️</div>
              <h3 className="modal-title">Cancel Membership?</h3>
              <p className="modal-body">Your membership will be marked as cancelled and benefits will end effectively at the expiration date. This cannot be undone.</p>
              <div className="modal-actions">
                <button className="modal-btn modal-btn-ghost" onClick={() => setCancelModal(null)}>Keep it</button>
                <button className="modal-btn modal-btn-danger" onClick={handleCancelMembership}>Yes, cancel</button>
              </div>
            </>)}
            {cancelModal === 'loading' && (<>
              <div className="modal-icon">⏳</div>
              <h3 className="modal-title">Cancelling…</h3>
              <p className="modal-body">Please wait a moment.</p>
            </>)}
            {cancelModal === 'success' && (<>
              <div className="modal-icon modal-icon-success">✓</div>
              <h3 className="modal-title">Membership Cancelled</h3>
              <p className="modal-body">Your membership has been successfully cancelled. We hope to see you again!</p>
              <div className="modal-actions">
                <button className="modal-btn modal-btn-primary" onClick={() => setCancelModal(null)}>Close</button>
              </div>
            </>)}
            {cancelModal === 'error' && (<>
              <div className="modal-icon modal-icon-error">✕</div>
              <h3 className="modal-title">Something went wrong</h3>
              <p className="modal-body">{cancelError || 'An error occurred. Please try again.'}</p>
              <div className="modal-actions">
                <button className="modal-btn modal-btn-ghost" onClick={() => setCancelModal(null)}>Close</button>
                <button className="modal-btn modal-btn-danger" onClick={handleCancelMembership}>Try again</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* ── Reschedule ticket modal ── */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={closeRescheduleModal}>
          <div className="modal-card rs-modal" onClick={e => e.stopPropagation()}>

            {/* ── success state ── */}
            {rescheduleResult === 'success' ? (<>
              <div className="modal-icon modal-icon-success">✓</div>
              <h3 className="modal-title">Visit Rescheduled!</h3>
              <p className="modal-body">
                Your visit has been moved to{' '}
                <strong>{new Date(rescheduleDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
              </p>
              <div className="modal-actions">
                <button className="modal-btn modal-btn-primary" onClick={closeRescheduleModal}>Done</button>
              </div>
            </>) : (<>

              <h3 className="modal-title">Reschedule Visit</h3>

              {/* Current ticket summary */}
              <div className="rs-current">
                <div className="rs-section-label">Current booking</div>
                <div className="rs-booking-card">
                  <div className="rs-booking-date">
                    📅 {rescheduleModal.VisitDate
                      ? new Date(String(rescheduleModal.VisitDate).slice(0,10) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </div>
                  <div className="rs-booking-items">
                    {rescheduleModal.items && rescheduleModal.items.map((it, i) => (
                      <span key={i} className="rs-exhibit-chip">{it.ExhibitName} ×{it.Quantity}</span>
                    ))}
                  </div>
                  <div className="rs-booking-total">${Number(rescheduleModal.TotalAmount || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* New date picker */}
              <div className="rs-date-section">
                <div className="rs-section-label">Choose a new date</div>
                <input
                  type="date"
                  className="rs-date-input"
                  min={todayISO}
                  value={rescheduleDate}
                  onChange={e => {
                    setRescheduleDate(e.target.value)
                    setRescheduleResult(null)
                    setRescheduleError('')
                    if (e.target.value) checkRescheduleAvailability(e.target.value, rescheduleModal)
                  }}
                />
              </div>

              {/* Availability feedback */}
              {rescheduleDate && (
                <div className="rs-avail-section">
                  {rescheduleAvail.loading && (
                    <div className="rs-avail-checking">Checking availability…</div>
                  )}
                  {!rescheduleAvail.loading && rescheduleAvail.error && (
                    <div className="rs-avail-error">⚠️ {rescheduleAvail.error}</div>
                  )}
                  {!rescheduleAvail.loading && !rescheduleAvail.error && rescheduleAvail.items.length > 0 && (
                    <div className="rs-avail-list">
                      {rescheduleAvail.items.map((e, i) => (
                        <div
                          key={i}
                          className={`rs-avail-row ${e.isSoldOut ? 'rs-avail-soldout' : e.isLimited ? 'rs-avail-limited' : 'rs-avail-ok'}`}
                        >
                          <span className="rs-avail-name">{e.ExhibitName}</span>
                          <span className="rs-avail-badge">
                            {e.isSoldOut
                              ? '✗ Sold out'
                              : e.isLimited
                                ? `⚠ Only ${e.available} left`
                                : `✓ Available`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Error from submit */}
              {rescheduleResult === 'error' && rescheduleError && (
                <div className="rs-submit-error">⚠️ {rescheduleError}</div>
              )}

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  className="modal-btn modal-btn-ghost"
                  disabled={rescheduleSubmitting}
                  onClick={closeRescheduleModal}
                >
                  Cancel
                </button>
                <button
                  className="modal-btn modal-btn-primary"
                  disabled={
                    !rescheduleDate ||
                    rescheduleSubmitting ||
                    rescheduleAvail.loading ||
                    rescheduleAvail.items.some(e => e.isSoldOut)
                  }
                  onClick={handleRescheduleSubmit}
                >
                  {rescheduleSubmitting ? 'Saving…' : 'Confirm Reschedule'}
                </button>
              </div>

            </>)}
          </div>
        </div>
      )}
    </div>
  )
}
