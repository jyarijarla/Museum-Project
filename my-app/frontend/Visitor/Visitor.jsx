import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Visitor.css'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { useAuth } from '../../src/AuthContext.jsx'
import { API_BASE } from '../../src/api.js'

export default function Visitor(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [visitor, setVisitor] = useState(null)
  const [membership, setMembership] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [historyItems, setHistoryItems] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ticketPurchases, setTicketPurchases] = useState([])

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
        const vRes = await fetch(`${apiBase}/api/visitor/${uid}`)
        if (vRes.ok){
          const vJson = await vRes.json()
          setVisitor(vJson.visitor)
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
              const date = tr.Date ? new Date(tr.Date) : null
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
                  <h2 className="dash-card-title">Visitor Profile</h2>
                </div>
                {visitor ? (
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
              </div>

              {/* Membership card */}
              <div className="dash-card">
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
                        onClick={async ()=>{
                          if(!confirm('Cancel membership? This will mark your membership as canceled.')) return
                          try{
                            const apiBase = API_BASE()
                            const mid = membership.MembershipID || membership.MembershipId
                            const resp = await fetch(`${apiBase}/api/membership/cancel`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ membershipId: mid }) })
                            if(!resp.ok){ alert('Cancel failed: ' + await resp.text()); return }
                            const js = await resp.json()
                            if(js?.success){
                              const updated = js.membership || null
                              setMembership(updated ? { ...updated, computedStatus:'Canceled' } : null)
                              alert('Membership cancelled')
                            } else { alert('Cancel failed') }
                          } catch(e){ console.error(e); alert('Cancel failed') }
                        }}
                      >Cancel membership</button>
                    </div>
                  </>
                ) : (
                  <p className="dash-empty-note">No active membership. <Link to="/membership">View plans →</Link></p>
                )}
              </div>
              {/* Ticket Purchase History card */}
              <div className="dash-card">
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
                              ? new Date(tp.VisitDate).toLocaleDateString() 
                              : '—'}
                          </span>
                          <span className="dash-history-meta">
                            Purchased: {tp.PurchaseDate 
                              ? new Date(tp.PurchaseDate).toLocaleDateString() 
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
                          {tp.PurchaseStatus === 'Active' && tp.VisitDate && new Date(tp.VisitDate) > new Date(new Date().toDateString()) && (
                            <button
                              className="dqa-btn dqa-danger"
                              style={{ fontSize: 11, padding: '3px 10px' }}
                              onClick={() => handleCancelTicket(tp.TicketPurchaseID)}
                            >
                              Cancel
                            </button>
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
              </div>
              {/* Purchase history card */}
              <div className="dash-card">
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
              </div>
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
    </div>
  )
}
