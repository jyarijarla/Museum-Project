import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Membership.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function Membership(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const displayName = user?.Username || user?.username || null

  const handleLogout = ()=>{ logout(); navigate('/') }

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
          <article className="membership-card">
            <div className="card-top">
              <h3>Individual</h3>
              <div className="price">$45</div>
            </div>
            <ul className="benefits">
              <li>Free general admission</li>
              <li>10% gift shop discount</li>
              <li>Invitation to member events</li>
            </ul>
            <div className="card-actions">
              <button className="btn primary">Choose</button>
            </div>
          </article>

          <article className="membership-card featured">
            <div className="card-top">
              <h3>Family</h3>
              <div className="price">$120</div>
            </div>
            <ul className="benefits">
              <li>Up to 4 members</li>
              <li>Free workshops</li>
              <li>15% gift shop discount</li>
            </ul>
            <div className="card-actions">
              <button className="btn primary">Choose</button>
            </div>
          </article>

          <article className="membership-card">
            <div className="card-top">
              <h3>Patron</h3>
              <div className="price">$350</div>
            </div>
            <ul className="benefits">
              <li>All family benefits</li>
              <li>Private tours</li>
              <li>Special recognition</li>
            </ul>
            <div className="card-actions">
              <button className="btn primary">Choose</button>
            </div>
          </article>
        </div>
      </main>

      <footer className="home-footer">
        © {new Date().getFullYear()} City Museum — Memberships
      </footer>
    </div>
  )
}
