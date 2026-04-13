import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './_SpaceExhibit.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { API_BASE } from '../../src/api.js'

export default function SpaceExhibit(){
  const navigate = useNavigate()
  const { user } = useAuth()
  const [artifacts, setArtifacts] = useState([])
  const [loadingArtifacts, setLoadingArtifacts] = useState(true)
  const [artifactsError, setArtifactsError] = useState(null)

  const isAdmin = user?.role === 'Admin' || user?.Role === 'Admin'
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', entryDate: new Date().toISOString().slice(0,10) })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const openModal = () => { setForm({ name: '', description: '', entryDate: new Date().toISOString().slice(0,10) }); setFormError(''); setFormSuccess(''); setModal(true) }
  const closeModal = () => setModal(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    setSubmitting(true); setFormError('')
    try {
      const res = await fetch(`${API_BASE()}/api/artifacts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || null, entryDate: form.entryDate || null, exhibitId: 1, userId: user?.userId || user?.UserID || user?.id })
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to add artifact.'); setSubmitting(false); return }
      setFormSuccess(`“${data.artifact.Name}” added!`)
      setArtifacts(prev => [data.artifact, ...prev])
      setForm({ name: '', description: '', entryDate: new Date().toISOString().slice(0,10) })
      setTimeout(() => { closeModal(); setFormSuccess('') }, 1600)
    } catch { setFormError('Network error.') } finally { setSubmitting(false) }
  }

  useEffect(() => {
    fetch(`${API_BASE()}/api/exhibits/1/artifacts`)
      .then(r => r.json())
      .then(d => setArtifacts(d.artifacts || []))
      .catch(e => setArtifactsError(e.message))
      .finally(() => setLoadingArtifacts(false))
  }, [])

  return (
    <div className="home-root exhibit-root space-root">
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

      <section className="ex-hero space-hero">
        <div className="ex-hero-content">
          <div className="ex-hero-eyebrow">🔭 Science & Astronomy</div>
          <h1 className="ex-hero-title">Space Exhibit</h1>
          <p className="ex-hero-sub">Journey through the cosmos — from our solar system to the farthest reaches of the universe. Explore real mission artifacts, astronomy wonders, and the science that drives human exploration.</p>
          <div className="hero-cta">
            <a className="btn primary" href="#artifacts">View Artifacts</a>
            <Link className="btn ghost" to="/tickets">Book Tickets</Link>
          </div>
        </div>
        <div className="ex-hero-visual space-visual" aria-hidden="true">
          <div className="space-orb orb-1" />
          <div className="space-orb orb-2" />
          <div className="space-orb orb-3" />
        </div>
      </section>

      <main className="exhibit-main">

        {/* About strip */}
        <section className="ex-about-strip space-about">
          <div className="ex-about-inner">
            <div className="ex-about-text">
              <h2>About This Exhibit</h2>
              <p>The Space Exhibit takes you on an immersive voyage through the universe. From the first satellites to the latest Mars rovers, our collection spans over 60 years of human spaceflight history. Discover the physics of black holes, the possibility of life on other worlds, and what it takes to leave Earth behind.</p>
              <p>Our curated artifacts include authentic mission equipment, scale models, and interactive displays designed to inspire the next generation of explorers.</p>
            </div>
            <div className="ex-stats-grid">
              <div className="ex-stat"><span className="ex-stat-num">8</span><span className="ex-stat-label">Planets in Our Solar System</span></div>
              <div className="ex-stat"><span className="ex-stat-num">565+</span><span className="ex-stat-label">Human Spaceflights to Date</span></div>
              <div className="ex-stat"><span className="ex-stat-num">5,000+</span><span className="ex-stat-label">Confirmed Exoplanets</span></div>
              <div className="ex-stat"><span className="ex-stat-num">13.8B</span><span className="ex-stat-label">Years Since the Big Bang</span></div>
            </div>
          </div>
        </section>

        {/* Fun facts */}
        <section className="exhibit-section">
          <h2 className="ex-section-title">Did You Know?</h2>
          <div className="ex-facts-grid">
            <div className="ex-fact space-fact">
              <div className="ex-fact-icon">🌙</div>
              <h3>Moonlight Delay</h3>
              <p>Light from the Moon takes about 1.3 seconds to reach Earth — yet some stars are so distant their light has traveled for billions of years to reach us.</p>
            </div>
            <div className="ex-fact space-fact">
              <div className="ex-fact-icon">☀️</div>
              <h3>The Sun's Core</h3>
              <p>At 15 million °C, the Sun's core is hot enough to fuse hydrogen into helium — releasing the energy that powers all life on Earth.</p>
            </div>
            <div className="ex-fact space-fact">
              <div className="ex-fact-icon">🪐</div>
              <h3>Saturn's Rings</h3>
              <p>Saturn's iconic rings are mostly made of ice and rock. They are incredibly wide — spanning 280,000 km — yet less than 1 km thick in most places.</p>
            </div>
            <div className="ex-fact space-fact">
              <div className="ex-fact-icon">🚀</div>
              <h3>Escape Velocity</h3>
              <p>To escape Earth's gravity, a spacecraft must reach 11.2 km/s — about 33 times the speed of sound at sea level.</p>
            </div>
          </div>
        </section>

        <section className="exhibit-section" id="artifacts">
          <div className="ex-section-header">
            <h2 className="ex-section-title">Collection Artifacts</h2>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span className="ex-artifact-count">{loadingArtifacts ? '…' : `${artifacts.length} items`}</span>
              {isAdmin && <button className="btn primary" style={{fontSize:13,padding:'7px 16px'}} onClick={openModal}>＋ Add Artifact</button>}
            </div>
          </div>
          {loadingArtifacts && (
            <div className="artifact-shimmer-grid">
              {[1,2,3].map(i => <div key={i} className="artifact-shimmer" />)}
            </div>
          )}
          {artifactsError && <p className="artifact-error">{artifactsError}</p>}
          {!loadingArtifacts && !artifactsError && artifacts.length === 0 && (
            <div className="artifact-empty-state">
              <div className="artifact-empty-icon">🔭</div>
              <p>No artifacts on record for this exhibit yet.</p>
            </div>
          )}
          {artifacts.length > 0 && (
            <div className="artifact-grid">
              {artifacts.map((a, idx) => (
                <div key={a.ArtifactID} className="artifact-card space-artifact">
                  {a.ImageURL && (
                    <div className="artifact-card-image">
                      <img src={a.ImageURL} alt={a.Name} onError={e => { e.target.parentElement.style.display='none' }} />
                    </div>
                  )}
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

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Space Exhibit</footer>

      {modal && (
        <div className="artifact-modal-overlay" onClick={closeModal}>
          <div className="artifact-modal" onClick={e => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <h2>Add Artifact — Space</h2>
              <button className="artifact-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="artifact-form" onSubmit={handleSubmit}>
              <label className="artifact-label">Name <span className="artifact-required">*</span>
                <input className="artifact-input" type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} maxLength={120} placeholder="e.g. Apollo 11 Mission Patch" />
              </label>
              <label className="artifact-label">Description
                <textarea className="artifact-input artifact-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} maxLength={400} rows={3} placeholder="Brief description…" />
              </label>
              <label className="artifact-label">Entry Date
                <input className="artifact-input" type="date" value={form.entryDate} onChange={e => setForm(f => ({...f, entryDate: e.target.value}))} />
              </label>
              {formError && <p className="artifact-form-error">{formError}</p>}
              {formSuccess && <p className="artifact-form-success">{formSuccess}</p>}
              <div className="artifact-form-actions">
                <button type="button" className="btn ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn primary" disabled={submitting}>{submitting ? 'Adding…' : 'Add Artifact'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
