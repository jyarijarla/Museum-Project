import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Giftshop.css'
import { useAuth } from '../../src/AuthContext.jsx'
import { useCart } from '../../src/CartContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function Giftshop(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const displayName = user?.Username || user?.username || null
  const handleLogout = ()=>{ logout(); navigate('/') }

  const [products, setProducts] = useState([])
  const [giftShopDiscount, setGiftShopDiscount] = useState(0) // % from MembershipType
  const { addItem } = useCart()
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')

  useEffect(()=>{
    const url = `${apiBase}/api/products`
    console.debug('[Giftshop] fetching products from', url)
    fetch(url).then(async r=>{
      const text = await r.text()
      try {
        const js = JSON.parse(text)
        if(js && js.products) setProducts(js.products)
        else setProducts([])
      } catch (parseErr) {
        console.error('[Giftshop] products fetch returned non-JSON', { status: r.status, url, contentType: r.headers.get('content-type'), bodyStart: text.slice(0,800) })
        setProducts([])
      }
    }).catch(e=>{
      console.error('[Giftshop] Failed to load products', e)
      setProducts([])
    })
  },[])

  // Fetch the logged-in user's active gift shop discount from their membership
  useEffect(()=>{
    if(!user) { setGiftShopDiscount(0); return }
    const uid = user.userId || user.UserID || user.id || user.userID
    if(!uid) return
    fetch(`${apiBase}/api/visitor/${uid}/membership`)
      .then(r => r.ok ? r.json() : null)
      .then(js => {
        if(js && js.membership && js.membership.computedStatus === 'Active'){
          setGiftShopDiscount(parseFloat(js.membership.GiftShopDiscountPercent || 0))
        } else {
          setGiftShopDiscount(0)
        }
      })
      .catch(()=> setGiftShopDiscount(0))
  },[user])

  const onAdd = (it)=>{
    if(!user){
      navigate('/login')
      return
    }
    const retailPrice = Number(it.RetailPrice || it.price || 0)
    const effectivePrice = giftShopDiscount > 0
      ? parseFloat((retailPrice * (1 - giftShopDiscount / 100)).toFixed(2))
      : retailPrice
    addItem({ id: it.ProductID || it.id, type: 'product', title: it.Name || it.title, price: effectivePrice, desc: it.Description || it.desc })
    // show toast with progress bar and clear any previous timer
    const title = it.Name || it.title || 'Item'
    if (toastTimer.current) clearTimeout(toastTimer.current)
    const tObj = { id: Date.now(), text: `${title} added to cart` }
    setToast(tObj)
    toastTimer.current = setTimeout(()=>{
      setToast(null)
      toastTimer.current = null
    }, 2200)
  }

  return (
    <div className="home-root gift-root">
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

      <section className="hero hero-fullbg" style={{backgroundImage:"url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&auto=format&fit=crop&q=80')"}}>
        <div className="hero-bg-overlay" />
        <div className="hero-inner">
          <h1 className="hero-title">Museum Giftshop</h1>
          <p className="hero-sub">Curated souvenirs, prints, and gifts to remember your visit.</p>
          {giftShopDiscount > 0 && (
            <div className="member-discount-badge">⭐ Member discount: {giftShopDiscount}% off all items</div>
          )}
        </div>
      </section>

      <main className="gift-main">
        <div className="gift-grid">
          {products.map(it=> {
            const retailPrice = Number(it.RetailPrice)
            const effectivePrice = giftShopDiscount > 0
              ? parseFloat((retailPrice * (1 - giftShopDiscount / 100)).toFixed(2))
              : retailPrice
            return (
            <article key={it.ProductID} className="gift-card">
              {it.ImageURL
                ? <img src={it.ImageURL} alt={it.Name} className="gift-image gift-image-real" onError={e=>{ e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex' }} />
                : null}
              <div
                className="gift-image gift-image-placeholder"
                style={it.ImageURL ? {display:'none'} : {}}
                data-initials={(it.Name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
              />
              <div className="gift-details">
                <h3>{it.Name}</h3>
                <p className="muted">{it.Description}</p>
              </div>
              <div className="gift-actions">
                <div className="price">
                  {giftShopDiscount > 0 ? (
                    <>
                      <span style={{textDecoration:'line-through',color:'#9ca3af',fontSize:'0.85em',marginRight:4}}>${retailPrice.toFixed(2)}</span>
                      <span style={{color:'#16a34a'}}>${effectivePrice.toFixed(2)}</span>
                    </>
                  ) : (
                    `$${retailPrice.toFixed(2)}`
                  )}
                </div>
                <button className="btn primary" onClick={()=> onAdd(it)}>Add</button>
              </div>
            </article>
            )
          })}
          {toast ? (
            <div className="gift-toast" role="status" key={toast.id}>
              {toast.text}
              <div className="gift-toast-bar" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Giftshop</footer>
    </div>
  )
}
