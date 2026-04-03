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
  const displayName = user?.Username || user?.username || null

  const handleLogout = ()=>{ logout(); navigate('/') }

  useEffect(()=>{
    if(!user) { setCurrentPlanId(null); return }
    const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')
    const uid = user.userId || user.UserID || user.id || user.userID
    if(!uid) return
    fetch(`${apiBase}/api/visitor/${uid}/membership`).then(r=>{
      if(!r.ok) return null
      return r.json()
    }).then(js=>{
      if(js && js.membership){
        const plan = js.membership.MembershipTypeID || js.membership.PlanID || js.membership.PlanId || js.membership.planId || null
        setCurrentPlanId(plan)
      } else {
        setCurrentPlanId(null)
      }
    }).catch(()=>{
      setCurrentPlanId(null)
    })
  },[user])

  return (
    <div className="home-root membership-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
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
            const isCurrent = (currentPlanId ? Number(currentPlanId) === Number(plan.id) : false) || (!!existing && existing.id === plan.id)

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
              <article key={plan.id} className={`membership-card ${plan.featured? 'featured':''} ${isCurrent? 'current':''}`}>
                <div className="card-top">
                  <h3>{plan.title}</h3>
                  <div className="price">${plan.price}</div>
                </div>
                <ul className="benefits">
                  {plan.benefits.map((b,idx)=>(<li key={idx}>{b}</li>))}
                </ul>
                <div className="card-actions">
                  <button className={`btn ${isCurrent? 'ghost':'primary'}`} onClick={onChoose}>
                    {isCurrent? 'Cancel Plan' : 'Choose'}
                  </button>
                </div>
                {isCurrent && <div className="current-badge">Current</div>}
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
