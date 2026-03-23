import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './_NaturalExhibit.css'

export default function NaturalExhibit(){
  const navigate = useNavigate()
  let user = null
  try { user = JSON.parse(localStorage.getItem('user')) } catch(e){ user = null }
  const handleLogout = ()=>{ localStorage.removeItem('user'); navigate('/') }
  const displayName = user?.Username || user?.username || null

  return (
    <div className="home-root exhibit-root natural-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          {user ? (
            <>
              <div style={{marginRight:12,color:'var(--muted)',fontWeight:700}}>Hi, {displayName}</div>
              <button className="btn-login" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link className="btn-login" to="/login">Login</Link>
          )}
        </nav>
      </header>

      <section className="hero natural-hero">
        <div className="hero-inner">
          <h1 className="hero-title">Natural History Exhibit</h1>
          <p className="hero-sub">From ecosystems to fossils — discover the story of life on Earth.</p>
          <div className="hero-cta">
            <a className="btn primary" href="#ecosystems">Explore Ecosystems</a>
            <a className="btn ghost" href="#fossils">See Fossils</a>
          </div>
        </div>
        <div className="hero-image natural-visual" aria-hidden="true" />
      </section>

      <main className="exhibit-main">
        <section id="ecosystems" className="exhibit-section">
          <h2>Ecosystems on Display</h2>
          <div className="card-grid">
            <div className="exhibit-card">
              <div className="card-image biome rainforest" />
              <h3>Tropical Rainforest</h3>
              <p>Lush biodiversity, canopy life, and colorful species.</p>
            </div>

            <div className="exhibit-card">
              <div className="card-image biome desert" />
              <h3>Desert</h3>
              <p>Adaptations for extreme heat and scarce water.</p>
            </div>

            <div className="exhibit-card">
              <div className="card-image biome ocean" />
              <h3>Ocean</h3>
              <p>Marine ecosystems, coral reefs, and deep-sea wonders.</p>
            </div>
          </div>
        </section>

        <section id="fossils" className="exhibit-section">
          <h2>Fossil Highlights</h2>
          <div className="timeline">
            <div className="fossil-item"><strong>Triassic</strong> — Early reptiles and the dawn of dinosaurs.</div>
            <div className="fossil-item"><strong>Jurassic</strong> — Giant dinosaurs and diverse flora.</div>
            <div className="fossil-item"><strong>Cretaceous</strong> — Flowering plants and the end of the dinosaurs.</div>
          </div>
        </section>

        <section className="exhibit-section gallery">
          <h2>Specimen Gallery</h2>
          <div className="gallery-grid">
            <div className="gallery-item" />
            <div className="gallery-item" />
            <div className="gallery-item" />
          </div>
        </section>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Natural History</footer>
    </div>
  )
}
