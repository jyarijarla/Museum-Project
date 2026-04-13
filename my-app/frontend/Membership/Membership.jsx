import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Membership.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { useCart } from '../../src/CartContext.jsx'

// Prices are not stored in the DB — kept here
const PLAN_PRICES = { 1: 45, 2: 120, 3: 350 }
const FEATURED_ID = 2

export default function Membership(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { cart, addItem, removeItem } = useCart()
  const [currentPlanId, setCurrentPlanId] = useState(null)
  const [currentMembership, setCurrentMembership] = useState(null)
  const [planTypes, setPlanTypes] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const displayName = user?.Username || user?.username || null

  const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')

  const showToast = (text, color = '#10b981') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text, color })
    toastTimer.current = setTimeout(() => { setToast(null); toastTimer.current = null }, 2400)
  }

  // Load membership types from DB
  useEffect(() => {
    fetch(`${apiBase}/api/membership/types`)
      .then(r => r.json())
      .then(d => setPlanTypes(d.types || []))
      .catch(() => setPlanTypes([]))
      .finally(() => setPlansLoading(false))
  }, [])

  const handleLogout = ()=>{ logout(); navigate('/') }

  useEffect(()=>{
    if(!user) { setCurrentPlanId(null); setCurrentMembership(null); return }
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

      <section className="hero hero-fullbg" style={{backgroundImage:"url('https://images.unsplash.com/photo-1588776814546-ec7e1b3c19c0?w=1400&auto=format&fit=crop&q=80')"}}>
        <div className="hero-bg-overlay" />
        <div className="hero-inner">
          <h1 className="hero-title">Membership Plans</h1>
          <p className="hero-sub">Support the museum and enjoy exclusive benefits. Choose the plan that fits you.</p>
        </div>
      </section>

      <main className="membership-main">
        <div className="membership-grid">
          {plansLoading ? (
            <div style={{gridColumn:'1/-1',textAlign:'center',padding:'2rem',color:'#6b7280'}}>Loading plans…</div>
          ) : planTypes.length === 0 ? (
            <div style={{gridColumn:'1/-1',textAlign:'center',padding:'2rem',color:'#6b7280'}}>Unable to load membership plans.</div>
          ) : planTypes.map(pt => {
            const plan = {
              id: pt.TypeID,
              title: pt.TypeName,
              price: PLAN_PRICES[pt.TypeID] ?? 99,
              featured: pt.TypeID === FEATURED_ID,
              discount: parseFloat(pt.DiscountPercent || 0),
              benefits: [
                pt.BenefitsDescription,
                `${parseFloat(pt.DiscountPercent || 0)}% discount on gift shop purchases`,
                'Free general admission to all exhibits',
                'Invitation to member-only events',
              ]
            }
            const existing = cart.find(i=> i.type === 'membership')
            const isActiveMembership = currentMembership && currentMembership.computedStatus === 'Active'
            const isCurrent = (isActiveMembership && Number(currentPlanId) === Number(plan.id)) || (!!existing && existing.id === plan.id && !currentMembership)
            // Blocked: an active membership for a DIFFERENT plan exists (must cancel first)
            const isBlockedByOtherActive = isActiveMembership && !isCurrent
            // Blocked: this plan was previously held but it hasn't expired yet (can't re‑choose same tier early)
            const isSamePlanSuspended = !isActiveMembership &&
              currentMembership &&
              Number(currentPlanId) === Number(plan.id) &&
              currentMembership.ExpirationDate &&
              new Date(currentMembership.ExpirationDate) > new Date()
            const isDisabled = isBlockedByOtherActive || isSamePlanSuspended

            const onChoose = async ()=>{
              if(!user){
                navigate('/login')
                return
              }
              if(isCurrent){
                // cancel plan: call backend to mark membership canceled
                try{
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
                    showToast('Membership canceled', '#e07b39')
                  } else {
                    alert('Cancel failed')
                  }
                }catch(e){
                  console.error('Cancel error', e)
                  alert('Cancel failed')
                }
                return
              }
              if(isDisabled) return
              // Add to cart for new purchase
              if(existing && existing.id !== plan.id){
                removeItem(existing.id,'membership')
              }
              addItem({ id: plan.id, type: 'membership', title: plan.title, price: plan.price, desc: plan.benefits.join(', ') })
              showToast(`${plan.title} added to cart`)
            }

            return (
              <article key={plan.id} className={`membership-card ${plan.featured? 'featured':''} ${isCurrent? 'current':''}`}>
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
                <div className="card-actions">
                  <button
                    className={`btn ${isCurrent? 'ghost': isDisabled? 'btn-disabled':'primary'}`}
                    onClick={onChoose}
                    disabled={isDisabled}
                    title={isBlockedByOtherActive ? 'Cancel your current membership first' : isSamePlanSuspended ? `Available after ${new Date(currentMembership.ExpirationDate).toLocaleDateString()}` : undefined}
                  >
                    {isCurrent ? 'Cancel Plan' : isBlockedByOtherActive ? 'Cancel First' : isSamePlanSuspended ? 'Not Available' : (cart.find(i=>i.type==='membership'&&i.id===plan.id) ? '✓ In Cart' : 'Choose')}
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

      {toast && (
        <div className="gift-toast" role="status" key={toast.id}>
          <span className="gift-toast-icon" style={{color: toast.color}}>✓</span>
          {toast.text}
          <div className="gift-toast-bar" aria-hidden="true" style={{background:`linear-gradient(90deg,${toast.color}99,${toast.color})`}} />
        </div>
      )}
    </div>
  )
}
