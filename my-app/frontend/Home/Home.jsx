import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Home.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function Home(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = ()=>{
    logout()
    navigate('/')
  }

  const displayName = user?.Username || user?.username || null

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
            <div style={{marginRight:8}}><ProfileMenu/></div>
          ) : (
            <Link className="btn-login" to="/login">Login</Link>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="hero hero-fullbg" style={{backgroundImage:'url(/museum-hero.jpg)'}}>
        <div className="hero-bg-overlay" />
        <div className="hero-inner">
          <div className="hero-eyebrow">Welcome to City Museum</div>
          <h1 className="hero-title">Discover the stories behind every artifact</h1>
          <p className="hero-sub">Explore inspiring exhibits, world-class collections, and immersive experiences for all ages.</p>
          <div className="hero-cta">
            <Link className="btn primary" to="/tickets">Buy Tickets</Link>
            <Link className="btn ghost" to="/exhibits">See Exhibits</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><span className="hero-stat-num">3</span><span className="hero-stat-label">Exhibits</span></div>
            <div className="hero-stat-div" />
            <div className="hero-stat"><span className="hero-stat-num">100+</span><span className="hero-stat-label">Artifacts</span></div>
            <div className="hero-stat-div" />
            <div className="hero-stat"><span className="hero-stat-num">1924</span><span className="hero-stat-label">Founded</span></div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="about-section">
        <div className="about-grid">
          <div className="about-image">
            <img
              src="https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=700&auto=format&fit=crop&q=80"
              alt="Museum gallery hall"
              className="about-photo"
              onError={(e)=>{ e.target.style.display='none' }}
            />
          </div>
          <div className="about-content">
            <div className="section-eyebrow">Our Story</div>
            <h2>A Century of Discovery</h2>
            <p className="muted">Founded in 2004, the City Museum has grown from a small collection of artifacts to a vibrant cultural institution. We collect, preserve, and share the stories of our city and the wider world.</p>
            <p className="muted">Our mission is to inspire curiosity through exhibits, education, and community programs — providing learning opportunities for visitors of all ages.</p>
            <div className="about-cards">
              <div className="about-card">
                <div className="about-card-icon">🎯</div>
                <h4>Mission</h4>
                <p className="muted">Inspire curiosity and foster discovery through exhibitions and programs for all ages.</p>
              </div>
              <div className="about-card">
                <div className="about-card-icon">🕐</div>
                <h4>Hours</h4>
                <p className="muted">Open daily 9am–6pm. Extended hours on weekends and holidays.</p>
              </div>
              <div className="about-card">
                <div className="about-card-icon">❤️</div>
                <h4>Support</h4>
                <p className="muted">Memberships, donations, and volunteering keep the museum accessible and inspiring.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Exhibit bands ── */}
      <section className="band band-exhibits">
        <div className="band-inner">
          <div className="band-content">
            <div className="section-eyebrow">On Display Now</div>
            <h3>Explore Our Exhibits</h3>
            <p className="muted">Journey through space, deep geological time, and ancient civilizations — all under one roof.</p>
            <div className="band-pills">
              <span className="band-pill">🔭 Space</span>
              <span className="band-pill">🦕 Natural History</span>
              <span className="band-pill">🏛️ Ancient Civilizations</span>
            </div>
            <div style={{marginTop:18}}>
              <Link className="btn primary" to="/exhibits">Browse All Exhibits</Link>
            </div>
          </div>
          <div className="band-media">
            <img
              src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=700&auto=format&fit=crop&q=80"
              alt="Space exhibit"
              className="band-photo"
              onError={(e)=>{ e.target.style.display='none' }}
            />
          </div>
        </div>
      </section>

      <section className="band band-membership">
        <div className="band-inner reverse">
          <div className="band-content">
            <div className="section-eyebrow">Members Save Up to 40%</div>
            <h3>Become a Member</h3>
            <p className="muted">Enjoy unlimited free admission, discounted ticket pricing, member-only events, and exclusive gift shop deals.</p>
            <div className="membership-tiers">
              <div className="tier-chip">Basic</div>
              <div className="tier-chip tier-premium">Premium</div>
              <div className="tier-chip tier-patron">Patron</div>
            </div>
            <div style={{marginTop:18}}>
              <Link className="btn primary" to="/membership">View Plans</Link>
            </div>
          </div>
          <div className="band-media">
            <img
              src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=700&auto=format&fit=crop&q=80"
              alt="Museum membership"
              className="band-photo"
            />
          </div>
        </div>
      </section>

      <section className="band band-giftshop">
        <div className="band-inner">
          <div className="band-content">
            <div className="section-eyebrow">Curated Souvenirs</div>
            <h3>Gift Shop</h3>
            <p className="muted">Handpicked books, prints, replicas, and toys — the perfect way to take a piece of the museum home.</p>
            <div style={{marginTop:18}}>
              <Link className="btn ghost" to="/giftshop">Shop Now</Link>
            </div>
          </div>
          <div className="band-media">
            <img
              src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=700&auto=format&fit=crop&q=80"
              alt="Gift shop"
              className="band-photo"
            />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">City Museum</div>
          <div className="footer-links">
            <Link to="/exhibits" className="footer-link">Exhibits</Link>
            <Link to="/tickets" className="footer-link">Tickets</Link>
            <Link to="/membership" className="footer-link">Membership</Link>
            <Link to="/giftshop" className="footer-link">Gift Shop</Link>
          </div>
          <div className="footer-copy">© {new Date().getFullYear()} City Museum — All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
