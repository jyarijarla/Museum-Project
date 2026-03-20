import React from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

export default function Home(){
  return (
    <div className="home-root">
      <header className="home-header">
        <div className="brand">City Museum</div>
        <nav>
          <Link className="nav-link" to="/">Exhibits</Link>
          <Link className="nav-link" to="/about">About</Link>
          <Link className="btn-login" to="/login">Login</Link>
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
        © {new Date().getFullYear()} City Museum — All rights reserved.
      </footer>
    </div>
  )
}
