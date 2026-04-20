import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import './ExhibitDetail.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { API_BASE } from '../../src/api.js'

export default function ExhibitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const apiBase = API_BASE()

  const [exhibit, setExhibit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [artifacts, setArtifacts] = useState([])
  const [artLoading, setArtLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${apiBase}/api/admin/exhibits/${id}`)
      .then(r => r.json())
      .then(d => setExhibit(d.exhibit || null))
      .catch(() => setExhibit(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setArtLoading(true)
    fetch(`${apiBase}/api/exhibits/${id}/artifacts`)
      .then(r => r.json())
      .then(d => setArtifacts(d.artifacts || []))
      .catch(() => setArtifacts([]))
      .finally(() => setArtLoading(false))
  }, [id])

  if (loading) return <div className="gen-ex-loading">Loading exhibit…</div>
  if (!exhibit) return (
    <div className="gen-ex-loading">
      <p>Exhibit not found.</p>
      <Link to="/exhibits" className="btn primary" style={{ display: 'inline-block', marginTop: 16 }}>← Back to Exhibits</Link>
    </div>
  )

  const isCancelled = exhibit.Status === 'Cancelled'

  return (
    <div className="home-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/tickets">Tickets</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          {user ? (
            <div style={{ marginRight: 8 }}><ProfileMenu /></div>
          ) : (
            <Link className="btn-login" to="/login">Login</Link>
          )}
        </nav>
      </header>

      <div className="gen-ex-hero">
        <div className="gen-ex-hero-inner">
          <div className="gen-ex-badge">🏛️ Exhibit</div>
          <h1 className="gen-ex-title">{exhibit.ExhibitName}</h1>
          {exhibit.Description && <p className="gen-ex-desc">{exhibit.Description}</p>}
          <div className="gen-ex-meta">
            {exhibit.MaxCapacity && <span>Capacity: {exhibit.MaxCapacity}</span>}
            {exhibit.regularPrice && <span>From ${Number(exhibit.regularPrice).toFixed(2)}</span>}
          </div>
        </div>
      </div>

      {isCancelled && (
        <div className="gen-ex-cancelled">
          This exhibit is currently cancelled and not available for visits.
        </div>
      )}

      <main className="gen-ex-main">
        <div className="gen-ex-section-header">
          <h2 className="gen-ex-section-title">Artifacts</h2>
          <span className="gen-ex-artifact-count">{artifacts.length} item{artifacts.length !== 1 ? 's' : ''}</span>
        </div>

        {artLoading ? (
          <div className="gen-ex-empty">Loading artifacts…</div>
        ) : artifacts.length === 0 ? (
          <div className="gen-ex-empty">No artifacts have been added to this exhibit yet.</div>
        ) : (
          <div className="gen-ex-artifacts-grid">
            {artifacts.map(a => (
              <div key={a.ArtifactID} className="gen-ex-artifact-card">
                {a.ImageURL && <img className="gen-ex-artifact-img" src={a.ImageURL} alt={a.Name} />}
                <div className="gen-ex-artifact-body">
                  <h4>{a.Name}</h4>
                  {a.Description && <p>{a.Description}</p>}
                  {a.EntryDate && <div className="gen-ex-artifact-date">Added {new Date(a.EntryDate).toLocaleDateString()}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isCancelled && (
          <div className="gen-ex-ticket-cta">
            <h3>Visit This Exhibit</h3>
            <p>Get tickets for {exhibit.ExhibitName} starting at ${Number(exhibit.regularPrice || 0).toFixed(2)}</p>
            <Link to="/tickets" className="btn primary">Get Tickets →</Link>
          </div>
        )}
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum</footer>
    </div>
  )
}
