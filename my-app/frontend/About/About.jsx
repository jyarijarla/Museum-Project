import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './About.css'
import { useAuth } from '../../src/AuthContext.jsx'

export default function About(){
	const navigate = useNavigate()
	const { user, logout } = useAuth()
	const displayName = user?.Username || user?.username || null
	const handleLogout = ()=>{ logout(); navigate('/') }

	return (
		<div className="home-root about-root">
			<header className="home-header">
				<div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
				<nav>
					<Link className="nav-link" to="/">Home</Link>
					<Link className="nav-link" to="/exhibits">Exhibits</Link>
					  <Link className="nav-link" to="/membership">Membership</Link>
					  <Link className="nav-link" to="/giftshop">Gift Shop</Link>
					  <Link className="nav-link" to="/about">About</Link>
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
					<h1 className="hero-title">About the Museum</h1>
					<p className="hero-sub">We collect, preserve, and share the stories of our city and the wider world.</p>
					<p style={{color:'rgba(2,6,23,0.6)'}}>Our mission is to inspire curiosity through exhibits, education, and community programs. Visit us for rotating exhibits, family programs, and research resources.</p>
				</div>
				<div className="hero-image" aria-hidden="true" />
			</section>

			<main style={{padding:36}}>
				<div style={{maxWidth:980,margin:'0 auto'}}>
					<h2>Mission & History</h2>
					<p style={{color:'rgba(2,6,23,0.6)'}}>Founded in 1924, the City Museum has grown from a small collection of artifacts to a vibrant cultural institution. We care for diverse collections and provide learning opportunities for visitors of all ages.</p>

					<h3>Visit & Support</h3>
					<p style={{color:'rgba(2,6,23,0.6)'}}>Plan your visit on the Hours & Admission page, or consider joining our membership program to support exhibitions and programs.</p>
				</div>
			</main>

			<footer className="home-footer">© {new Date().getFullYear()} City Museum</footer>
		</div>
	)
}
