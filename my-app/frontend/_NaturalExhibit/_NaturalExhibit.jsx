import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './_NaturalExhibit.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

const API_BASE = () =>
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : '')

export default function NaturalExhibit(){
  const navigate = useNavigate()
  const { user } = useAuth()
  const [artifacts, setArtifacts] = useState([])
  const [loadingArtifacts, setLoadingArtifacts] = useState(true)
  const [artifactsError, setArtifactsError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE()}/api/exhibits/2/artifacts`)
      .then(r => r.json())
      .then(d => setArtifacts(d.artifacts || []))
      .catch(e => setArtifactsError(e.message))
      .finally(() => setLoadingArtifacts(false))
  }, [])

  return (
    <div className="home-root exhibit-root natural-root">
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

      <section className="ex-hero natural-hero">
        <div className="ex-hero-content">
          <div className="ex-hero-eyebrow">🦕 Natural World</div>
          <h1 className="ex-hero-title">Natural History Exhibit</h1>
          <p className="ex-hero-sub">Walk through billions of years of Earth's history — from ancient fossil beds to thriving modern ecosystems. Discover the creatures that shaped our world and the forces that drive life forward.</p>
          <div className="hero-cta">
            <a className="btn primary" href="#artifacts">View Artifacts</a>
            <Link className="btn ghost" to="/tickets">Book Tickets</Link>
          </div>
        </div>
        <div className="ex-hero-visual natural-visual" aria-hidden="true">
          <div className="nat-leaf leaf-1">🌿</div>
          <div className="nat-leaf leaf-2">🍃</div>
          <div className="nat-leaf leaf-3">🌱</div>
        </div>
      </section>

      <main className="exhibit-main">

        {/* About strip */}
        <section className="ex-about-strip natural-about">
          <div className="ex-about-inner">
            <div className="ex-about-text">
              <h2>About This Exhibit</h2>
              <p>The Natural History Exhibit is a celebration of life on Earth across four billion years. From the Cambrian explosion to the age of the dinosaurs and the rise of mammals, our displays trace the extraordinary journey of evolution. Explore fossil specimens, wildlife dioramas, and geological formations that tell the planet's story.</p>
              <p>Interactive stations let you compare fossil casts, examine mineral samples up close, and learn how paleontologists uncover the past from stone.</p>
            </div>
            <div className="ex-stats-grid">
              <div className="ex-stat"><span className="ex-stat-num">4B</span><span className="ex-stat-label">Years of Life on Earth</span></div>
              <div className="ex-stat"><span className="ex-stat-num">8.7M</span><span className="ex-stat-label">Estimated Species Today</span></div>
              <div className="ex-stat"><span className="ex-stat-num">1,000+</span><span className="ex-stat-label">Dinosaur Species Identified</span></div>
              <div className="ex-stat"><span className="ex-stat-num">99%</span><span className="ex-stat-label">All Species Ever Are Extinct</span></div>
            </div>
          </div>
        </section>

        {/* Fun facts */}
        <section className="exhibit-section">
          <h2 className="ex-section-title">Did You Know?</h2>
          <div className="ex-facts-grid">
            <div className="ex-fact natural-fact">
              <div className="ex-fact-icon">🦴</div>
              <h3>T-Rex Arms</h3>
              <p>Despite being the most feared predator of the Cretaceous, the T-Rex had arms just 1 meter long — too short to reach its own mouth.</p>
            </div>
            <div className="ex-fact natural-fact">
              <div className="ex-fact-icon">🌊</div>
              <h3>Ocean Origins</h3>
              <p>All complex life on Earth originated in the ocean. Even land-dwelling vertebrates carry evolutionary traces of their aquatic ancestors in their embryonic development.</p>
            </div>
            <div className="ex-fact natural-fact">
              <div className="ex-fact-icon">🌳</div>
              <h3>Trees Communicate</h3>
              <p>Forest trees share nutrients and distress signals through underground fungal networks — sometimes called the "Wood Wide Web."</p>
            </div>
            <div className="ex-fact natural-fact">
              <div className="ex-fact-icon">🦋</div>
              <h3>Mass Extinctions</h3>
              <p>Earth has experienced five major mass extinction events. The most recent, 66 million years ago, wiped out 75% of all species — including non-avian dinosaurs.</p>
            </div>
          </div>
        </section>

        <section className="exhibit-section" id="artifacts">
          <div className="ex-section-header">
            <h2 className="ex-section-title">Collection Artifacts</h2>
            <span className="ex-artifact-count">{loadingArtifacts ? '…' : `${artifacts.length} items`}</span>
          </div>
          {loadingArtifacts && (
            <div className="artifact-shimmer-grid">
              {[1,2,3].map(i => <div key={i} className="artifact-shimmer" />)}
            </div>
          )}
          {artifactsError && <p className="artifact-error">{artifactsError}</p>}
          {!loadingArtifacts && !artifactsError && artifacts.length === 0 && (
            <div className="artifact-empty-state">
              <div className="artifact-empty-icon">🦕</div>
              <p>No artifacts on record for this exhibit yet.</p>
            </div>
          )}
          {artifacts.length > 0 && (
            <div className="artifact-grid">
              {artifacts.map((a, idx) => (
                <div key={a.ArtifactID} className="artifact-card natural-artifact">
                  <div className="artifact-card-top">
                    <div className="artifact-accent-bar" />
                    <span className="artifact-index">#{String(idx + 1).padStart(2,'0')}</span>
                  </div>
                  <div className="artifact-card-body">
                    <h3 className="artifact-name">{a.Name || 'Unnamed Artifact'}</h3>
                    <p className="artifact-desc">{a.Description || '—'}</p>
                  </div>
                  <div className="artifact-card-footer">
                    <div className="artifact-id-pill">ID #{a.ArtifactID}</div>
                    {a.EntryDate && (
                      <div className="artifact-date">
                        📅 {new Date(a.EntryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Natural History</footer>
    </div>
  )
}
