import React, { useEffect, useState } from 'react'
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

      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Museum Giftshop</h1>
          <p className="hero-sub">Curated souvenirs, prints, and gifts to remember your visit.</p>
        </div>
        <div className="hero-image" aria-hidden="true" />
      </section>

      <main className="gift-main">
        <div className="gift-grid">
          {products.map(it=> (
            <article key={it.ProductID} className="gift-card">
              <div className="gift-image" />
              <div className="gift-details">
                <h3>{it.Name}</h3>
                <p className="muted">{it.Description}</p>
              </div>
              <div className="gift-actions">
                <div className="price">${Number(it.RetailPrice).toFixed(2)}</div>
                <button className="btn primary" onClick={()=> onAdd(it)}>Add</button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Giftshop</footer>
    </div>
  )
}
