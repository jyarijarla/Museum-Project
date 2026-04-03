import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AncientExhibit.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function AncientExhibit(){
  const navigate = useNavigate()
  const { user } = useAuth()
  const displayName = user?.Username || user?.username || null

  return (
    <div className="home-root exhibit-root ancient-root">
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

      <section className="hero ancient-hero">
        <div className="hero-inner">
          <h1 className="hero-title">Ancient Civilizations</h1>
          <p className="hero-sub">Artifacts, timelines, and stories from the ancient world.</p>
          <div className="hero-cta">
            <a className="btn primary" href="#artifacts">View Artifacts</a>
            <a className="btn ghost" href="#timeline">Timeline</a>
          </div>
        </div>
        <div className="hero-image ancient-visual" aria-hidden="true" />
      </section>

      <main className="exhibit-main">
        <section id="artifacts" className="exhibit-section">
          <h2>Key Artifacts</h2>
          <div className="card-grid">
            <div className="exhibit-card">
              <div className="card-image artifact pottery" />
              <h3>Ancient Pottery</h3>
              <p>Handcrafted ceramics that reveal daily life, trade, and art.</p>
            </div>

            <div className="exhibit-card">
              <div className="card-image artifact sculpture" />
              <h3>Sculptures</h3>
              <p>Stone and bronze works representing leaders, gods, and myth.</p>
            </div>

            <div className="exhibit-card">
              <div className="card-image artifact inscription" />
              <h3>Inscriptions</h3>
              <p>Written records that unlock languages, laws, and histories.</p>
            </div>
          </div>
        </section>

        <section id="timeline" className="exhibit-section">
          <h2>Civilizations Timeline</h2>
          <ol className="timeline">
            <li><strong>3000 BCE</strong> — Early Bronze Age city-states.</li>
            <li><strong>1200 BCE</strong> — Rise of classical kingdoms and trade networks.</li>
            <li><strong>500 BCE</strong> — Philosophies, written laws, and empires expand.</li>
            <li><strong>200 CE</strong> — Cultural exchange across continents.</li>
          </ol>
        </section>

        <section className="exhibit-section gallery">
          <h2>Artifact Gallery</h2>
          <div className="gallery-grid">
            <div className="gallery-item" />
            <div className="gallery-item" />
            <div className="gallery-item" />
          </div>
        </section>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Ancient Civilizations</footer>
    </div>
  )
}
