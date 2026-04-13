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
          <p className="hero-sub">Three permanent galleries spanning the cosmos, deep time, and the ancient world. Click any exhibit to explore artifacts from our live collection.</p>
          <Link className="btn primary exhibits-hero-btn" to="/tickets">Ready to Experience It? Get Tickets →</Link>
        </div>
      </section>

      <main className="exhibits-main">
        <div className="exhibit-cards">

          <Link to="/exhibits/space" className="exhibit-card-link">
            <article className="exhibit-card">
              <div className="exhibit-card-image">
                <img src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=700&auto=format&fit=crop&q=80" alt="Space exhibit" />
                <div className="exhibit-card-overlay" />
                <div className="exhibit-card-badge">🔭 Science & Astronomy</div>
              </div>
              <div className="exhibit-card-body">
                <h3>Space Exhibit</h3>
                <p>Journey through the cosmos — explore planets, space missions, and cutting-edge astronomy through artifacts collected from around the world.</p>
                <div className="exhibit-card-meta"><span className="exhibit-card-tag">Permanent</span><span className="exhibit-card-cta">Explore →</span></div>
              </div>
            </article>
          </Link>

          <Link to="/exhibits/natural" className="exhibit-card-link">
            <article className="exhibit-card">
              <div className="exhibit-card-image exhibit-card-image--natural">
                <img src="https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?w=700&auto=format&fit=crop&q=80" alt="Natural History exhibit" />
                <div className="exhibit-card-overlay" />
                <div className="exhibit-card-badge">🦕 Natural World</div>
              </div>
              <div className="exhibit-card-body">
                <h3>Natural History</h3>
                <p>Walk through billions of years of Earth's story — from ancient fossils and dinosaur remains to rare specimens from diverse ecosystems.</p>
                <div className="exhibit-card-meta"><span className="exhibit-card-tag">Permanent</span><span className="exhibit-card-cta">Explore →</span></div>
              </div>
            </article>
          </Link>

          <Link to="/exhibits/ancient" className="exhibit-card-link">
            <article className="exhibit-card">
              <div className="exhibit-card-image exhibit-card-image--ancient">
                <img src="https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=700&auto=format&fit=crop&q=80" alt="Ancient Civilizations exhibit" />
                <div className="exhibit-card-overlay" />
                <div className="exhibit-card-badge">🏛️ History & Culture</div>
              </div>
              <div className="exhibit-card-body">
                <h3>Ancient Civilizations</h3>
                <p>Uncover the secrets of the ancient world through pottery, inscriptions, sculpture, and artifacts spanning thousands of years of human history.</p>
                <div className="exhibit-card-meta"><span className="exhibit-card-tag">Permanent</span><span className="exhibit-card-cta">Explore →</span></div>
              </div>
            </article>
          </Link>

        </div>


      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum</footer>
    </div>
  )
}
