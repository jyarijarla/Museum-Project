import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Giftshop.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function Giftshop(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const displayName = user?.Username || user?.username || null
  const handleLogout = ()=>{ logout(); navigate('/') }

  const sampleItems = [
    { id:1, title:'Museum Tote', price:'$24', desc:'Canvas tote with logo'},
    { id:2, title:'Space Poster', price:'$18', desc:'Limited edition print'},
    { id:3, title:'Dino Plush', price:'$32', desc:'Soft plush for all ages'},
    { id:4, title:'Membership Card', price:'$45', desc:'Annual membership - digital'},
  ]

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
          {sampleItems.map(it=> (
            <article key={it.id} className="gift-card">
              <div className="gift-image" />
              <div className="gift-details">
                <h3>{it.title}</h3>
                <p className="muted">{it.desc}</p>
              </div>
              <div className="gift-actions">
                <div className="price">{it.price}</div>
                <button className="btn primary">Add</button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Giftshop</footer>
    </div>
  )
}
