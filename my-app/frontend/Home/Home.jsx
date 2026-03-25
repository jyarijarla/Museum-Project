import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Home.css'
import { useAuth } from '../../src/AuthContext.jsx'

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

      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Discover the stories behind every artifact</h1>
          <p className="hero-sub">Explore rotating exhibits, collections, and curator resources at City Museum.</p>
          <div className="hero-cta">
            <Link className="btn primary" to="/login">Curator Login</Link>
            <a className="btn ghost" href="#exhibits">See Exhibits</a>
          </div>
        </div>
        <div className="hero-image" aria-hidden="true" />
      </section>

      <section id="about" className="about-section">
        <div className="about-grid">
          <div className="about-image" aria-hidden="true" />
          <div className="about-content">
            <h2>Our Museum</h2>
            <p className="muted">We collect, preserve, and share the stories of our city and the wider world. Our mission is to inspire curiosity through exhibits, education, and community programs.</p>
            <p className="muted">Founded in 1924, the City Museum has grown from a small collection of artifacts to a vibrant cultural institution. We care for diverse collections and provide learning opportunities for visitors of all ages.</p>

            <div className="about-cards">
              <div className="about-card">
                <h4>Mission</h4>
                <p className="muted">Inspire curiosity and foster discovery through exhibitions and programs for all ages.</p>
              </div>
              <div className="about-card">
                <h4>Visit</h4>
                <p className="muted">Open daily — plan your visit and explore membership options to support our work.</p>
              </div>
              <div className="about-card">
                <h4>Support</h4>
                <p className="muted">Memberships, donations, and volunteering help keep the museum accessible and inspiring.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      <section className="band band-exhibits">
        <div className="band-inner">
          <div className="band-content">
            <h3>Featured Exhibits</h3>
            <p className="muted">Planets, fossils, and artifacts — get a closer look at what's on display and what's coming next.</p>
            <div style={{marginTop:14}}>
              <Link className="btn ghost" to="/exhibits">Explore Exhibits</Link>
            </div>
          </div>
          <div className="band-media band-media-exhibits" aria-hidden="true" />
        </div>
      </section>

      <section className="band band-membership">
        <div className="band-inner reverse">
          <div className="band-content">
            <h3>Membership</h3>
            <p className="muted">Join our community to enjoy free admission, member-only events, and discounts in the gift shop.</p>
            <div style={{marginTop:14}}>
              <Link className="btn primary" to="/membership">Join Today</Link>
            </div>
          </div>
          <div className="band-media band-media-membership" aria-hidden="true" />
        </div>
      </section>

      <section className="band band-giftshop">
        <div className="band-inner">
          <div className="band-content">
            <h3>Gift Shop Highlights</h3>
            <p className="muted">Handpicked souvenirs, prints, and toys — perfect for visitors and supporters alike.</p>
            <div style={{marginTop:14}}>
              <Link className="btn ghost" to="/giftshop">Visit Gift Shop</Link>
            </div>
          </div>
          <div className="band-media band-media-giftshop" aria-hidden="true" />
        </div>
      </section>

      <footer className="home-footer">
        © {new Date().getFullYear()} City Museum — All rights reserved.
      </footer>
    </div>
  )
}
