import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Visitor.css'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { useAuth } from '../../src/AuthContext.jsx'

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

  useEffect(()=>{
    if(!user){
      navigate('/login')
      return
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')
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

  return (
    <div className="home-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          
          <div style={{marginRight:8}}><ProfileMenu/></div>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Welcome, {displayName}</h1>
          <p className="hero-sub">This is your account dashboard — view and manage your profile, membership, and settings.</p>
        </div>
        <div className="hero-image" aria-hidden="true" />
      </section>

      <main style={{padding:'28px 36px',flex:1}}>
        {loading ? (
          <div>Loading account information…</div>
        ) : error ? (
          <div style={{color:'crimson'}}>{error}</div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
            <div>
              <div className="card account-card">
                <div className="card-header">
                  <div className="avatar">{(user?.username||'V')[0].toUpperCase()}</div>
                  <div>
                    <h3 className="card-title">Account</h3>
                    <div className="card-sub">Signed in as <strong>{user?.username || user?.Username}</strong></div>
                  </div>
                </div>
                <div className="card-body">
                  <p><strong>Email:</strong> {user?.email || user?.Email || '—'}</p>
                  <p><strong>Role:</strong> {user?.role || user?.Role || 'Visitor'}</p>
                </div>
              </div>

              <div style={{height:16}} />

              <div className="card profile-card">
                <div className="card-header"><h3 className="card-title">Visitor Profile</h3></div>
                <div className="card-body">
                {visitor ? (
                  <div>
                    <p><strong>Name:</strong> {visitor.FirstName} {visitor.LastName}</p>
                    <p><strong>Phone:</strong> {visitor.PhoneNumber || '—'}</p>
                    <p><strong>Email:</strong> {visitor.Email || '—'}</p>
                    <p><strong>Date of Birth:</strong> {visitor.DateOfBirth ? new Date(visitor.DateOfBirth).toLocaleDateString() : '—'}</p>
                    <p><strong>Address:</strong> {visitor.Address || '—'}</p>
                  </div>
                ) : (
                  <div>No visitor profile found. You can create or update your profile in Account Settings.</div>
                )}
                </div>
              </div>

              <div style={{height:16}} />

              <div className="card membership-card">
                <div className="card-header"><h3 className="card-title">Membership</h3></div>
                <div className="card-body">
                {membership ? (
                  <div>
                    <p><strong>Type:</strong> {membership.MembershipTypeID || membership.PlanID || '—'}</p>
                    <p><strong>Start:</strong> {membership.StartDate ? new Date(membership.StartDate).toLocaleDateString() : '—'}</p>
                    <p><strong>Expires:</strong> {membership.ExpirationDate ? new Date(membership.ExpirationDate).toLocaleDateString() : '—'}</p>
                    <p><strong>Status:</strong> {membership.Status ? membership.Status : (membership.IsExpired && (membership.IsExpired[0] === 1 || membership.IsExpired === 1) ? 'Expired' : 'Active')}</p>
                    {membership.CancelledDate ? <p><strong>Cancelled:</strong> {new Date(membership.CancelledDate).toLocaleDateString()}</p> : null}
                    <div style={{marginTop:12}}>
                      <button className="btn ghost" disabled={membership.Status === 'Canceled' || (membership.IsExpired && (membership.IsExpired[0] === 1 || membership.IsExpired === 1))} onClick={async ()=>{
                        if(!confirm('Cancel membership? This will mark your membership as canceled.')) return
                        try{
                          const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')
                          const mid = membership.MembershipID || membership.MembershipId || membership.MembershipID
                          console.log('Cancelling membership id=', mid)
                          const resp = await fetch(`${apiBase}/api/membership/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ membershipId: mid }) })
                          console.log('Cancel resp status', resp.status)
                          if(!resp.ok) {
                            const txt = await resp.text()
                            console.error('Cancel failed response', txt)
                            alert('Cancel failed: ' + txt)
                            return
                          }
                          const js = await resp.json()
                          console.log('Cancel response json', js)
                          if(js && js.success){
                            setMembership(js.membership || null)
                            alert('Membership cancelled')
                          } else {
                            alert('Cancel failed')
                          }
                        } catch(e){
                          console.error(e); alert('Cancel failed')
                        }
                      }}>Cancel membership</button>
                    </div>
                  </div>
                ) : (
                  <div>You do not have an active membership. <Link to="/membership">View plans</Link></div>
                )}
                </div>
              </div>

              <div style={{height:16}} />

              <div className="card history-card">
                <h3>Purchase History</h3>
                <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product name" style={{flex:1,padding:'8px 10px',borderRadius:6,border:'1px solid #ddd'}} />
                  <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:'8px 10px',borderRadius:6}}>
                    <option value="recent">Recently bought</option>
                    <option value="oldest">Been a while</option>
                    <option value="price_desc">Price: high → low</option>
                    <option value="price_asc">Price: low → high</option>
                  </select>
                </div>

                <div style={{maxHeight:320,overflow:'auto'}}>
                  {historyItems.filter(it=> it.Name && it.Name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>{
                    if(sort === 'recent') return (b.Date?.getTime()||0) - (a.Date?.getTime()||0)
                    if(sort === 'oldest') return (a.Date?.getTime()||0) - (b.Date?.getTime()||0)
                    if(sort === 'price_desc') return (b.Price||0) - (a.Price||0)
                    if(sort === 'price_asc') return (a.Price||0) - (b.Price||0)
                    return 0
                  }).map(it=> (
                    <div key={`${it.TransactionID}-${it.ProductID}`} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f1f1f1'}}>
                      <div>
                        <div style={{fontWeight:700}}>{it.Name}</div>
                        <div className="muted">Qty: {it.Quantity} — Bought on: {it.Date ? it.Date.toLocaleDateString() : '—'}</div>
                      </div>
                      <div style={{fontWeight:800}}>${(Number(it.Price)||0).toFixed(2)}</div>
                    </div>
                  ))}
                  {historyItems.length === 0 ? <div className="muted">No purchases found.</div> : null}
                </div>
              </div>
            </div>

            <aside>
              <div className="card actions-card">
                <h4 className="card-title">Quick Actions</h4>
                <div className="card-body actions-body">
                  <Link to="/create-account" className="btn ghost">Edit Profile</Link>
                  <Link to="/membership" className="btn primary">Manage Membership</Link>
                  <button className="btn" onClick={handleLogout}>Log out</button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <footer className="home-footer">
        © {new Date().getFullYear()} City Museum — Logged in as {displayName}
      </footer>
    </div>
  )
}
