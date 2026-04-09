import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AncientExhibit.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

const API_BASE = () =>
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : '')

export default function AncientExhibit(){
  const navigate = useNavigate()
  const { user } = useAuth()
  const [artifacts, setArtifacts] = useState([])
  const [loadingArtifacts, setLoadingArtifacts] = useState(true)
  const [artifactsError, setArtifactsError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE()}/api/exhibits/3/artifacts`)
      .then(r => r.json())
      .then(d => setArtifacts(d.artifacts || []))
      .catch(e => setArtifactsError(e.message))
      .finally(() => setLoadingArtifacts(false))
  }, [])

  return (
    <div className="home-root exhibit-root ancient-root">
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

      <section className="ex-hero ancient-hero">
        <div className="ex-hero-content">
          <div className="ex-hero-eyebrow">🏛️ History & Culture</div>
          <h1 className="ex-hero-title">Ancient Civilizations</h1>
          <p className="ex-hero-sub">Step back thousands of years and walk among the empires that shaped humanity. From Mesopotamian city-states to classical Greece and Rome, explore the art, architecture, language, and artifacts that define our origins.</p>
          <div className="hero-cta">
            <a className="btn primary" href="#db-artifacts">View Artifacts</a>
            <Link className="btn ghost" to="/tickets">Book Tickets</Link>
          </div>
        </div>
        <div className="ex-hero-visual ancient-visual" aria-hidden="true">
          <div className="ancient-deco deco-1">🏺</div>
          <div className="ancient-deco deco-2">⚱️</div>
          <div className="ancient-deco deco-3">🗿</div>
        </div>
      </section>

      <main className="exhibit-main">

        {/* About strip */}
        <section className="ex-about-strip ancient-about">
          <div className="ex-about-inner">
            <div className="ex-about-text">
              <h2>About This Exhibit</h2>
              <p>The Ancient Civilizations Exhibit brings together rare artifacts, reconstructed environments, and scholarly research to paint a vivid picture of the ancient world. From the fertile crescent of Mesopotamia to the grand temples of Egypt and the philosophical academies of Athens, our collection spans 5,000 years of human achievement.</p>
              <p>Examine inscribed tablets, ceramic vessels, bronze tools, and monumental sculpture — each object a direct connection to the people who first built cities, wrote laws, and asked questions about the nature of the universe.</p>
            </div>
            <div className="ex-stats-grid">
              <div className="ex-stat"><span className="ex-stat-num">5,000</span><span className="ex-stat-label">Years of Recorded History</span></div>
              <div className="ex-stat"><span className="ex-stat-num">3,200</span><span className="ex-stat-label">BCE — First Written Language</span></div>
              <div className="ex-stat"><span className="ex-stat-num">7</span><span className="ex-stat-label">Wonders of the Ancient World</span></div>
              <div className="ex-stat"><span className="ex-stat-num">50+</span><span className="ex-stat-label">Ancient Civilizations Studied</span></div>
            </div>
          </div>
        </section>

        {/* Fun facts */}
        <section className="exhibit-section">
          <h2 className="ex-section-title">Did You Know?</h2>
          <div className="ex-facts-grid">
            <div className="ex-fact ancient-fact">
              <div className="ex-fact-icon">📜</div>
              <h3>Writing's Origins</h3>
              <p>The earliest writing — cuneiform — was invented around 3200 BCE in ancient Sumer, primarily to track grain and livestock, not for literature or religion.</p>
            </div>
            <div className="ex-fact ancient-fact">
              <div className="ex-fact-icon">🏗️</div>
              <h3>The Great Pyramid</h3>
              <p>The Great Pyramid of Giza was the world's tallest man-made structure for over 3,800 years. It contains an estimated 2.3 million stone blocks, each averaging 2.5 tons.</p>
            </div>
            <div className="ex-fact ancient-fact">
              <div className="ex-fact-icon">⚖️</div>
              <h3>Code of Hammurabi</h3>
              <p>One of the earliest legal codes, written in Babylon around 1754 BCE, contained 282 laws covering everything from wages and property to family life and trade.</p>
            </div>
            <div className="ex-fact ancient-fact">
              <div className="ex-fact-icon">🔥</div>
              <h3>Greek Fire</h3>
              <p>Byzantine engineers created a mysterious incendiary weapon — "Greek fire" — that burned even on water. Its exact formula has been lost to history.</p>
            </div>
          </div>
        </section>

        <section className="exhibit-section" id="db-artifacts">
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
              <div className="artifact-empty-icon">🏺</div>
              <p>No artifacts on record for this exhibit yet.</p>
            </div>
          )}
          {artifacts.length > 0 && (
            <div className="artifact-grid">
              {artifacts.map((a, idx) => (
                <div key={a.ArtifactID} className="artifact-card ancient-artifact">
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

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Ancient Civilizations</footer>
    </div>
  )
}
