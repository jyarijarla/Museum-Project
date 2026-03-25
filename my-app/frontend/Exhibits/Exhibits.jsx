import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Exhibits.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function Exhibits(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const displayName = user?.Username || user?.username || null

  const handleLogout = ()=>{ logout(); navigate('/') }

  return (
    <div className="home-root exhibits-root">
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
          <h1 className="hero-title">Exhibits</h1>
          <p className="hero-sub">Browse our curated exhibits — click a card to view details.</p>
        </div>
        <div className="hero-image" aria-hidden="true" />
      </section>

      <main className="exhibits-main">
        <div className="exhibit-cards">
          <Link to="/exhibits/space" className="exhibit-card-link">
            <article className="exhibit-card">
              <div className="card-image exhibit-space" />
              <h3>Space Exhibit</h3>
              <p>Planets, missions, and the science of the cosmos.</p>
            </article>
          </Link>

          <Link to="/exhibits/natural" className="exhibit-card-link">
            <article className="exhibit-card">
              <div className="card-image exhibit-natural" />
              <h3>Natural History</h3>
              <p>Fossils, ecosystems, and the story of life on Earth.</p>
            </article>
          </Link>

          <Link to="/exhibits/ancient" className="exhibit-card-link">
            <article className="exhibit-card">
              <div className="card-image exhibit-ancient" />
              <h3>Ancient Civilizations</h3>
              <p>Artifacts, inscriptions, and cultural history.</p>
            </article>
          </Link>
        </div>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum</footer>
    </div>
  )
}
