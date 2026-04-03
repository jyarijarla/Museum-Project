import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../src/AuthContext.jsx'
import { useCart } from '../../src/CartContext.jsx'
import './ProfileMenu.css'

export default function ProfileMenu(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  const displayName = (user?.firstName || user?.lastName)
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : (user?.username || user?.Username || 'Visitor')

  useEffect(()=>{
    function onDoc(e){
      if (!ref.current) return
      if (!ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return ()=> document.removeEventListener('click', onDoc)
  },[])

  const doLogout = ()=>{
    try { logout() } catch(e){ console.warn(e) }
    setOpen(false)
    navigate('/')
  }

  const initials = displayName.split(' ').map(s=>s[0]||'').join('').slice(0,2).toUpperCase()
  const { cart } = useCart()
  const itemCount = cart.reduce((s,i)=> s + (i.qty||0), 0)

  return (
    <div className="profile-menu" ref={ref}>
      <div className="avatar-wrap">
        <button className="avatar-btn" onClick={()=>setOpen(v=>!v)} aria-label="Open profile menu">
          {initials}
        </button>
        {itemCount > 0 && (
          <div className="avatar-badge" aria-hidden="true">{itemCount}</div>
        )}
      </div>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-header">
            <div className="profile-avatar-large">{initials}</div>
            <div className="profile-meta">
              <div className="profile-name">{displayName}</div>
              <div className="profile-email">{user?.email || ''}</div>
            </div>
          </div>
          <div className="profile-actions">
            <button className="btn" onClick={()=>{ setOpen(false); navigate('/cart') }}>
              Cart
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </button>
            {/* show Admin Portal for admin users */}
            {((user?.role || user?.Role || '').toString().toLowerCase() === 'admin') && (
              <button className="btn" onClick={()=>{ setOpen(false); navigate('/admin') }}>Admin Portal</button>
            )}
            <button className="btn primary" onClick={()=>{ setOpen(false); navigate('/dashboard') }}>My Dashboard</button>
            <button className="logout-option" onClick={doLogout}>Log out</button>
          </div>
        </div>
      )}
    </div>
  )
}
