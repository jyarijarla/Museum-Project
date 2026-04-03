import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './_SpaceExhibit.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function SpaceExhibit(){
  const navigate = useNavigate()
  const { user } = useAuth()
  const displayName = user?.Username || user?.username || null

  return (
    <div className="home-root exhibit-root space-root">
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

      <section className="hero space-hero">
        <div className="hero-inner">
          <h1 className="hero-title">Space Exhibit</h1>
          <p className="hero-sub">Explore the cosmos: planets, missions, and the science of our universe.</p>
          <div className="hero-cta">
            <a className="btn primary" href="#planets">View Planets</a>
            <a className="btn ghost" href="#timeline">Mission Timeline</a>
          </div>
        </div>
        <div className="hero-image space-visual" aria-hidden="true" />
      </section>

      <main className="exhibit-main">
        <section id="planets" className="exhibit-section">
          <h2>Featured Planets & Objects</h2>
          <div className="card-grid">
            <div className="exhibit-card">
              <div className="card-image planet mercury" />
              <h3>Mercury</h3>
              <p>Closest planet to the Sun — small, heavily cratered, and fast-moving.</p>
            </div>

            <div className="exhibit-card">
              <div className="card-image planet jupiter" />
              <h3>Jupiter</h3>
              <p>The gas giant with a powerful magnetic field and many moons.</p>
            </div>

            <div className="exhibit-card">
              <div className="card-image planet exoplanet" />
              <h3>Exoplanets</h3>
              <p>Worlds beyond our solar system — discover habitability and detection methods.</p>
            </div>
          </div>
        </section>

        <section id="timeline" className="exhibit-section">
          <h2>Mission Timeline</h2>
          <ol className="timeline">
            <li><strong>1957</strong> — Sputnik 1, first artificial satellite.</li>
            <li><strong>1969</strong> — Apollo 11 lands humans on the Moon.</li>
            <li><strong>1977</strong> — Voyager probes launched, exploring outer planets.</li>
            <li><strong>1990</strong> — Hubble Space Telescope launched.</li>
            <li><strong>2004–2020s</strong> — Rovers on Mars, probes to asteroids and comets.</li>
          </ol>
        </section>

        <section className="exhibit-section gallery">
          <h2>Gallery</h2>
          <div className="gallery-grid">
            <div className="gallery-item" />
            <div className="gallery-item" />
            <div className="gallery-item" />
          </div>
        </section>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Space Exhibit</footer>
    </div>
  )
}
