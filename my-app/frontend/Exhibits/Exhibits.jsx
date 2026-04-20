import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Exhibits.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { API_BASE } from '../../src/api.js'

// Map existing exhibit IDs to their custom route + hardcoded card data
const HARDCODED = {
  1: { path: '/exhibits/space', badge: '🔭 Science & Astronomy', img: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=700&auto=format&fit=crop&q=80', name: 'Space Exhibit', desc: 'Journey through the cosmos — explore planets, space missions, and cutting-edge astronomy through artifacts collected from around the world.', imgClass: '' },
  2: { path: '/exhibits/natural', badge: '🦕 Natural World', img: 'https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?w=700&auto=format&fit=crop&q=80', name: 'Natural History', desc: 'Walk through billions of years of Earth\'s story — from ancient fossils and dinosaur remains to rare specimens from diverse ecosystems.', imgClass: 'exhibit-card-image--natural' },
  3: { path: '/exhibits/ancient', badge: '🏛️ History & Culture', img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=700&auto=format&fit=crop&q=80', name: 'Ancient Civilizations', desc: 'Uncover the secrets of the ancient world through pottery, inscriptions, sculpture, and artifacts spanning thousands of years of human history.', imgClass: 'exhibit-card-image--ancient' },
}

export default function Exhibits(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [exhibits, setExhibits] = useState([])

  useEffect(() => {
    fetch(`${API_BASE()}/api/exhibits`)
      .then(r => r.json())
      .then(d => setExhibits(d.exhibits || []))
      .catch(console.error)
  }, [])

  return (
    <div className="home-root exhibits-root">
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

      <section className="exhibits-hero">
        <div className="exhibits-hero-content">
          <div className="section-eyebrow" style={{color:'var(--accent-2)'}}>All Collections</div>
          <h1 className="hero-title">Our Exhibits</h1>
          <p className="hero-sub">Explore our permanent galleries and special exhibitions. Click any exhibit to discover artifacts from our live collection.</p>
          <Link className="btn primary exhibits-hero-btn" to="/tickets">Ready to Experience It? Get Tickets →</Link>
        </div>
      </section>

      <main className="exhibits-main">
        <div className="exhibit-cards">

          {exhibits.filter(e => e.Status !== 'Cancelled').map(ex => {
            const hc = HARDCODED[ex.ExhibitID]
            if (hc) {
              // Render the hardcoded card for original 3 exhibits
              return (
                <Link key={ex.ExhibitID} to={hc.path} className="exhibit-card-link">
                  <article className="exhibit-card">
                    <div className={`exhibit-card-image ${hc.imgClass}`}>
                      <img src={hc.img} alt={hc.name} />
                      <div className="exhibit-card-overlay" />
                      <div className="exhibit-card-badge">{hc.badge}</div>
                    </div>
                    <div className="exhibit-card-body">
                      <h3>{hc.name}</h3>
                      <p>{hc.desc}</p>
                      <div className="exhibit-card-meta"><span className="exhibit-card-tag">Permanent</span><span className="exhibit-card-cta">Explore →</span></div>
                    </div>
                  </article>
                </Link>
              )
            }
            // Dynamic card for new exhibits — same structure as hardcoded cards
            return (
              <Link key={ex.ExhibitID} to={`/exhibits/${ex.ExhibitID}`} className="exhibit-card-link">
                <article className="exhibit-card">
                  <div className="exhibit-card-image exhibit-card-image--dynamic">
                    <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt={ex.ExhibitName} />
                    <div className="exhibit-card-overlay" />
                    <div className="exhibit-card-badge">🏛️ {ex.ExhibitName}</div>
                  </div>
                  <div className="exhibit-card-body">
                    <h3>{ex.ExhibitName}</h3>
                    <p>{ex.Description || 'Explore this exhibit and its collection of artifacts.'}</p>
                    <div className="exhibit-card-meta"><span className="exhibit-card-tag">{ex.regularPrice ? `From $${Number(ex.regularPrice).toFixed(2)}` : 'Exhibition'}</span><span className="exhibit-card-cta">Explore →</span></div>
                  </div>
                </article>
              </Link>
            )
          })}

        </div>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum</footer>
    </div>
  )
}
