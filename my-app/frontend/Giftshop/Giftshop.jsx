import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Giftshop.css'
import { useAuth } from '../../src/AuthContext.jsx'
import { useCart } from '../../src/CartContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'


// Generic fallback image if a ProductID isn't in the map above
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&auto=format&fit=crop&q=80'

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
            {products.map((it) => {
              const imgSrc = it.ImageURL || it.imageURL || FALLBACK_IMAGE
              return (
                <article key={it.ProductID} className="gift-card">
                  <div className="gift-image">
                    <img
                      src={imgSrc}
                      alt={it.Name}
                      className="gift-image-photo"
                      onError={(e)=>{
                        // If Unsplash fails, swap to a reliable placeholder
                        e.target.src = `https://placehold.co/400x200/e2e8f0/64748b?text=${encodeURIComponent(it.Name)}`
                        e.target.onerror = null
                      }}
                    />
                  </div>
                  <div className="gift-details">
                    <h3 className="gift-name">{it.Name}</h3>
                    {/* <p className="gift-desc">{it.Description}</p> */}
                  </div>
                  <div className="gift-footer">
                    <span className="gift-price">${Number(it.RetailPrice).toFixed(2)}</span>
                    <button className="gift-add-btn" onClick={()=> onAdd(it)}>
                      + Add to cart
                    </button>
                  </div>
                </article>
              )
            })}
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