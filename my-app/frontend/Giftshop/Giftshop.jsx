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
  const { addItem } = useCart()
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(()=>{
    const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')
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

  const onAdd = (it)=>{
    if(!user){
      navigate('/login')
      return
    }
    const price = Number(it.RetailPrice || it.price || 0)
    addItem({ id: it.ProductID || it.id, type: 'product', title: it.Name || it.title, price, desc: it.Description || it.desc })
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

  // cycle through a palette so each card has a distinct illustration colour
  const cardPalettes = [
    'linear-gradient(135deg,#dbeafe,#bfdbfe)',
    'linear-gradient(135deg,#dcfce7,#bbf7d0)',
    'linear-gradient(135deg,#fef9c3,#fde68a)',
    'linear-gradient(135deg,#fce7f3,#fbcfe8)',
    'linear-gradient(135deg,#ede9fe,#ddd6fe)',
    'linear-gradient(135deg,#ffedd5,#fed7aa)',
  ]

  return (
    <div className="home-root gift-root">
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

      {/* ── Hero ── */}
      <section className="gift-hero">
        <div className="gift-hero-content">
          <div className="section-eyebrow">Museum Store</div>
          <h1 className="hero-title">Gift Shop</h1>
          <p className="hero-sub">Take a piece of the museum home — curated prints, replicas, books, and more.</p>
        </div>
        <div className="gift-hero-img">
          <img
            src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=700&auto=format&fit=crop&q=80"
            alt="Museum gift shop"
            onError={(e)=>{ e.target.style.display='none' }}
          />
        </div>
      </section>

      {/* ── Products ── */}
      <main className="gift-main">
        {products.length === 0 ? (
          <div className="gift-empty">
            <span className="gift-empty-icon">🛍️</span>
            <p>No products available right now — check back soon!</p>
          </div>
        ) : (
          <div className="gift-grid">
            {products.map((it, idx) => (
              <article key={it.ProductID} className="gift-card">
                <div className="gift-image" style={{background: cardPalettes[idx % cardPalettes.length]}}>
                  <span className="gift-image-icon">🎁</span>
                </div>
                <div className="gift-details">
                  <h3 className="gift-name">{it.Name}</h3>
                  <p className="gift-desc">{it.Description}</p>
                </div>
                <div className="gift-footer">
                  <span className="gift-price">${Number(it.RetailPrice).toFixed(2)}</span>
                  <button className="gift-add-btn" onClick={()=> onAdd(it)}>
                    + Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* ── Toast ── */}
      {toast ? (
        <div className="gift-toast" role="status" key={toast.id}>
          <span className="gift-toast-icon">✓</span>
          {toast.text}
          <div className="gift-toast-bar" aria-hidden="true" />
        </div>
      ) : null}

      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">City Museum</div>
          <div className="footer-copy">© {new Date().getFullYear()} City Museum — All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
