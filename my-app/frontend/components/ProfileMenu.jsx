import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../src/AuthContext.jsx'
import { useCart } from '../../src/CartContext.jsx'
import { API_BASE } from '../../src/api.js'
import './ProfileMenu.css'

export default function ProfileMenu(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const ref = useRef()
  const notifRef = useRef()

  const unreadCount = notifications.filter(n => !n.IsRead).length

  // fetch notifications whenever user changes
  const fetchNotifications = () => {
    if (!user) { setNotifications([]); return }
    const uid = user.userId || user.UserID || user.id || user.userID
    if (!uid) return
    fetch(`${API_BASE()}/api/notifications/${uid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.notifications) setNotifications(d.notifications.filter(n => !n.IsRead)) })
      .catch(() => {})
  }

  useEffect(() => { fetchNotifications() }, [user])

  useEffect(() => {
    if (!user) return
    const id = window.setInterval(fetchNotifications, 30000)
    return () => window.clearInterval(id)
  }, [user])

  useEffect(() => {
    window.addEventListener('membership-cancelled', fetchNotifications)
    window.addEventListener('membership-renewed', fetchNotifications)
    window.addEventListener('ticket-rescheduled', fetchNotifications)
    return () => {
      window.removeEventListener('membership-cancelled', fetchNotifications)
      window.removeEventListener('membership-renewed', fetchNotifications)
      window.removeEventListener('ticket-rescheduled', fetchNotifications)
    }
  }, [user])

  const dismissNotification = async (notifId) => {
    const uid = user?.userId || user?.UserID || user?.id || user?.userID
    await fetch(`${API_BASE()}/api/notifications/mark-read`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, notificationId: notifId })
    }).catch(() => {})
    setNotifications(prev => prev.filter(n => n.NotificationID !== notifId))
  }

  const displayName = (user?.firstName || user?.lastName)
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : (user?.username || user?.Username || 'Visitor')

  useEffect(()=>{
    function onDoc(e){
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
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
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      {/* Notification bell */}
      {user && (
        <div className="notif-wrap" ref={notifRef}>
          <button className="notif-btn" onClick={()=>setNotifOpen(v=>!v)} aria-label="Notifications">
            🔔
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-header">Notifications</div>
              {notifications.length === 0
                ? <p className="notif-empty">You're all caught up!</p>
                : notifications.map(n => (
                    <div key={n.NotificationID} className="notif-item notif-unread">
                      <div className="notif-title-row">
                        <span className="notif-title">{n.Title}</span>
                        <button className="notif-dismiss" onClick={()=>dismissNotification(n.NotificationID)} title="Dismiss">✕</button>
                      </div>
                      <div className="notif-msg">{n.Message}</div>
                      <div className="notif-time">{new Date(n.CreatedAt).toLocaleDateString()}</div>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      )}

      {/* Avatar / profile menu */}
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
            {/* show Curator Portal for curators */}
            {((user?.role || user?.Role || '') === 'Curator') && (
              <button className="btn" onClick={()=>{ setOpen(false); navigate('/curator-portal') }}>Curator Portal</button>
            )}
            {/* show Gift Shop Portal for gift shop managers */}
            {((user?.role || user?.Role || '') === 'Gift_Shop_Manager') && (
              <button className="btn" onClick={()=>{ setOpen(false); navigate('/giftshop-portal') }}>Gift Shop Portal</button>
            )}
            <button className="btn primary" onClick={()=>{ setOpen(false); navigate('/dashboard') }}>My Dashboard</button>
            <button className="logout-option" onClick={doLogout}>Log out</button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
