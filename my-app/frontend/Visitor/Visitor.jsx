import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Visitor.css'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function Visitor(){
  const navigate = useNavigate()
    const { user, logout } = useAuth()

  useEffect(()=>{
      if(!user){
        navigate('/login')
      }
  },[user, navigate])

  const handleLogout = ()=>{
      logout()
    navigate('/')
  }

    const displayName = user?.Username || user?.username || 'Visitor'

  return (
    <div className="home-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          
          <div style={{marginRight:8}}><ProfileMenu/></div>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Welcome, {displayName}</h1>
          <p className="hero-sub">You are signed in — access curator tools and your dashboard here.</p>
          <div className="hero-cta">
            <Link className="btn primary" to="/login">Account Settings</Link>
            <a className="btn ghost" href="#exhibits">See Exhibits</a>
          </div>
        </div>
        <div className="hero-image" aria-hidden="true" />
      </section>

      <section className="features" id="exhibits">
        <div className="feature">
          <h3>Curated Collections</h3>
          <p>Deep dives into artifacts with high-resolution images and provenance.</p>
        </div>
        <div className="feature">
          <h3>Interactive Tours</h3>
          <p>Guided virtual tours and multimedia experiences for all ages.</p>
        </div>
        <div className="feature">
          <h3>Research Tools</h3>
          <p>Advanced search, notes, and curator-only workflows.</p>
        </div>
      </section>

      <footer className="home-footer">
        © {new Date().getFullYear()} City Museum — Logged in as {displayName}
      </footer>
    </div>
  )
}
