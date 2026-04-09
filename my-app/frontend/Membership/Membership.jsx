import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Membership.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { useCart } from '../../src/CartContext.jsx'

export default function Membership(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { cart, addItem, removeItem } = useCart()
  const [currentPlanId, setCurrentPlanId] = useState(null)
  const [currentMembership, setCurrentMembership] = useState(null)
  const displayName = user?.Username || user?.username || null

  const handleLogout = ()=>{ logout(); navigate('/') }

  useEffect(()=>{
    if(!user) { setCurrentPlanId(null); setCurrentMembership(null); return }
    const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')
    const uid = user.userId || user.UserID || user.id || user.userID
    if(!uid) return
    fetch(`${apiBase}/api/visitor/${uid}/membership`).then(r=>{
      if(!r.ok) return null
      return r.json()
    }).then(js=>{
      if(js && js.membership){
        const plan = js.membership.MembershipTypeID || js.membership.PlanID || null
        setCurrentPlanId(plan)
        setCurrentMembership(js.membership)
      } else {
        setCurrentPlanId(null)
        setCurrentMembership(null)
      }
    }).catch(()=>{
      setCurrentPlanId(null)
      setCurrentMembership(null)
    })
  },[user])

  return (
    <div className="home-root membership-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/tickets">Tickets</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          
          {user ? (
            <div style={{marginRight:8}}><ProfileMenu/></div>
          ) : (
            <Link className="btn-login" to="/login">Login</Link>
          )}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Membership Plans</h1>
          <p className="hero-sub">Support the museum and enjoy exclusive benefits. Choose the plan that fits you.</p>
        </div>
        <div className="hero-image" aria-hidden="true" />
      </section>

      <main className="membership-main">
        <div className="membership-grid">
          {[ 
            { id: 1, title: 'Basic', price: 45, benefits: ['Free general admission','10% gift shop discount','Invitation to member events'] },
            { id: 2, title: 'Premium', price: 120, featured: true, benefits: ['Up to 4 members','Free workshops','15% gift shop discount'] },
            { id: 3, title: 'Patron', price: 350, benefits: ['All family benefits','Private tours','Special recognition'] }
          ].map(plan=>{
            const existing = cart.find(i=> i.type === 'membership')
            // Only treat as current if the DB record is Active for this plan
            const isActiveMembership = currentMembership && currentMembership.computedStatus === 'Active'
            const isCurrent = (isActiveMembership && Number(currentPlanId) === Number(plan.id)) || (!!existing && existing.id === plan.id && !currentMembership)
            // Whether this plan was previously held but is now expired/canceled
            const isPrevious = currentMembership && currentMembership.computedStatus !== 'Active' && Number(currentPlanId) === Number(plan.id)

            const onChoose = async ()=>{
              if(!user){
                navigate('/login')
                return
              }
              if(isCurrent){
                // cancel plan: call backend to mark membership canceled
                try{
                  const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')
                  const userId = user.userId || user.UserID || user.id || user.userID
                  const resp = await fetch(`${apiBase}/api/membership/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
                  if(!resp.ok){
                    const txt = await resp.text()
                    alert('Cancel failed: ' + txt)
                    return
                  }
                  const js = await resp.json()
                  if(js && js.success){
                    setCurrentPlanId(null)
                    setCurrentMembership(null)
                    removeItem(plan.id,'membership')
                    alert('Membership canceled')
                  } else {
                    alert('Cancel failed')
                  }
                }catch(e){
                  console.error('Cancel error', e)
                  alert('Cancel failed')
                }
                return
              }
              // if another membership exists, replace it (enforce single membership)
              if(existing && existing.id !== plan.id){
                removeItem(existing.id,'membership')
              }
              addItem({ id: plan.id, type: 'membership', title: plan.title, price: plan.price, desc: plan.benefits.join(', ') })
            }

            return (
              <article key={plan.id} className={`membership-card ${plan.featured? 'featured':''} ${isCurrent? 'current':''} ${isPrevious? 'previous':''}`}>
                <div className="card-top">
                  <h3>{plan.title}</h3>
                  <div className="price">${plan.price}<span style={{fontSize:'0.55em',fontWeight:400}}>/yr</span></div>
                </div>
                <ul className="benefits">
                  {plan.benefits.map((b,idx)=>(<li key={idx}>{b}</li>))}
                </ul>
                {isCurrent && currentMembership && (
                  <div className="membership-meta">
                    <span>Active since {new Date(currentMembership.StartDate).toLocaleDateString()}</span>
                    <span>Renews {new Date(currentMembership.ExpirationDate).toLocaleDateString()}</span>
                  </div>
                )}
                {isPrevious && currentMembership && (
                  <div className="membership-meta" style={{color:'#e07b39'}}>
                    <span style={{fontWeight:600}}>{currentMembership.computedStatus}</span>
                    {currentMembership.ExpirationDate && <span>Expired {new Date(currentMembership.ExpirationDate).toLocaleDateString()}</span>}
                  </div>
                )}
                <div className="card-actions">
                  <button className={`btn ${isCurrent? 'ghost':'primary'}`} onClick={onChoose}>
                    {isCurrent ? 'Cancel Plan' : isPrevious ? 'Renew Plan' : 'Choose'}
                  </button>
                </div>
                {isCurrent && <div className="current-badge">Current</div>}
                {isPrevious && <div className="current-badge" style={{background:'#e07b39'}}>{currentMembership.computedStatus}</div>}
              </article>
            )
          })}
        </div>
      </main>

      <footer className="home-footer">
        © {new Date().getFullYear()} City Museum — Memberships
      </footer>
    </div>
  )
}
