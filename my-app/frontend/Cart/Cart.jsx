import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Cart.css'
import { useCart } from '../../src/CartContext.jsx'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { API_BASE } from '../../src/api.js'

export default function Cart(){
  const { cart, updateQty, removeItem, clearCart, total } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const apiBase = API_BASE()

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

      <main className="cart-main">
        <div className="container">
          {success && (
            <div className="cart-success-screen">
              <div className="cart-success-icon">✓</div>
              <h2 className="cart-success-title">Purchase Successful!</h2>
              <p className="cart-success-sub">Thank you for your order. Your items have been confirmed and are ready for your visit.</p>
              <div className="cart-success-actions">
                <Link className="btn primary" to="/">Back to Home</Link>
                <Link className="btn ghost" to="/tickets">Buy Tickets</Link>
              </div>
            </div>
          )}
          {!success && (<>
          <div className="hero-card">
            <div>
              <div className="title-hero">Your Selections</div>
              <div className="subtitle">A curated checkout experience — review items, adjust quantities, and complete your visit.</div>
            </div>
            <div style={{marginLeft:'auto'}}>
              <div style={{fontWeight:800,color:'#6b3b00'}}>Total</div>
              <div style={{fontSize:20,fontWeight:900,color:'#2b1500'}}>${total.toFixed(2)}</div>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="empty">Your cart is empty.</div>
          ) : (
            <div className="cart-list">
              {cart.map(item=> (
                <div className="cart-item" key={`${item.type}-${item.id}`}>
                  <div className="item-left">
                    <div className="thumb">{(item.title||'Item').split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase()}</div>
                    <div className="item-info">
                      <div className="title">{item.title}</div>
                      <div className="muted">{item.desc || ''}</div>
                    </div>
                  </div>
                  <div className="item-controls">
                    <div className="qty">
                      <button onClick={()=> updateQty(item.id,item.type, Math.max(1,(item.qty||1)-1))}>-</button>
                      <div className="num">{item.qty}</div>
                      <button onClick={()=> updateQty(item.id,item.type, (item.qty||1)+1)}>+</button>
                    </div>
                      <div className="price">
                        {item.originalPrice && (
                          <span style={{textDecoration:'line-through',opacity:.45,fontSize:'.85em',marginRight:4}}>
                            ${Number(item.originalPrice).toFixed(2)}
                          </span>
                        )}
                        ${(Number(item.price)||0).toFixed(2)}
                      </div>
                    <button className="remove" onClick={()=> removeItem(item.id,item.type)}>Remove</button>
                  </div>
                </div>
              ))}

              <div className="cart-summary">
                <div className="summary-left" />
                <div className="summary-right">
                  <div className="summary-card">
                    <div className="actions">
                      <button className="btn ghost" onClick={clearCart}>Clear Cart</button>
                      <button className="btn primary" onClick={async ()=>{
                        if(!user){
                          // require login
                          window.location.href = '/login'
                          return
                        }
                        setLoading(true)
                        try{
                          // attempt to find Visitor record for this user
                          const uid = user.userId || user.UserID || user.id || user.userID
                          let resp = await fetch(`${apiBase}/api/visitor/${uid}`)
                          let data = null

                          if (resp.ok) {
                            data = await resp.json()
                          } else {
                            // fallback: try debug user lookup by username to find UserID
                            console.warn('Visitor fetch returned', resp.status, resp.statusText)
                            const username = user.username || user.Username
                            if (username) {
                              const dbg = await fetch(`${apiBase}/api/debug/user/${encodeURIComponent(username)}`)
                              if (dbg.ok){
                                const dj = await dbg.json()
                                const rows = dj.rows || dj.rows || []
                                if (rows && rows.length > 0){
                                  const found = rows[0]
                                  const tryId = found.UserID || found.userID || found.UserId
                                  if (tryId) {
                                    resp = await fetch(`${apiBase}/api/visitor/${tryId}`)
                                    if (resp.ok) data = await resp.json()
                                    else console.warn('Retry visitor fetch returned', resp.status, resp.statusText)
                                  }
                                }
                              }
                                // log debug lookup failure body for diagnosis
                                const dbgText = await dbg.text().catch(()=>null)
                                console.warn('Debug user lookup failed:', dbg.status, dbg.statusText, dbgText)
                            }
                          }

                          const memberships = cart.filter(i=> i.type === 'membership')
                          const renewals = cart.filter(i=> i.type === 'membership-renewal')
                          let visitorId = null
                          let membershipFailed = false

                          if(!data){
                            console.warn('Visitor lookup failed for user', user)
                            // Fallback: call membership purchase endpoint with userId and let the backend resolve/create Visitor
                            for(const m of memberships){
                              const p = await fetch(`${apiBase}/api/membership/purchase`, {
                                method: 'POST',
                                headers: { 'Content-Type':'application/json' },
                                body: JSON.stringify({ userId: uid, membershipPlanId: m.id })
                              })
                              const pj = await p.json().catch(()=>null)
                              if(!p.ok){
                                console.error('purchase failed', { status: p.status, body: pj })
                                alert('Failed to create membership: ' + (pj?.error || p.statusText))
                                membershipFailed = true
                              } else {
                                removeItem(m.id, m.type)
                              }
                            }
                            if(membershipFailed){ setLoading(false); return }
                            if(memberships.length === 0){
                              alert('Visitor profile not found. Please complete your profile before purchasing membership.')
                              setLoading(false)
                              return
                            }
                          } else {
                            const visitor = data.visitor || data
                            visitorId = visitor.VisitorID || visitor.VisitorId || visitor.visitorId

                            // for any membership items in cart, call purchase endpoint
                            for(const m of memberships){
                              const p = await fetch(`${apiBase}/api/membership/purchase`, {
                                method: 'POST',
                                headers: { 'Content-Type':'application/json' },
                                body: JSON.stringify({ visitorId, membershipPlanId: m.id })
                              })
                              const pj = await p.json().catch(()=>null)
                              if(!p.ok){
                                console.error('purchase failed', pj)
                                alert('Failed to create membership: ' + (pj?.error || p.statusText))
                                membershipFailed = true
                              } else {
                                removeItem(m.id, m.type)
                              }
                            }
                            if(membershipFailed){ setLoading(false); return }
                          }

                          // Process renewal items
                          let renewalFailed = false
                          for(const r of renewals){
                            const p = await fetch(`${apiBase}/api/membership/renew`, {
                              method: 'POST',
                              headers: { 'Content-Type':'application/json' },
                              body: JSON.stringify({ userId: uid })
                            })
                            const pj = await p.json().catch(()=>null)
                            if(!p.ok){
                              console.error('renewal failed', pj)
                              alert('Failed to renew membership: ' + (pj?.error || p.statusText))
                              renewalFailed = true
                            } else {
                              removeItem(r.id, r.type)
                              window.dispatchEvent(new Event('membership-renewed'))
                            }
                          }
                          if(renewalFailed){ setLoading(false); return }

                          // Process non-membership product items via the transactions API
                          const products = cart.filter(i=> i.type === 'product')
                          if(products.length > 0){
                            try{
                              const payloadItems = products.map(p=>({ productId: p.id, quantity: p.qty || 1, price: p.price }))
                              const tResp = await fetch(`${apiBase}/api/transaction/create`, {
                                method: 'POST', headers: { 'Content-Type':'application/json' },
                                body: JSON.stringify({ visitorId: (visitorId || uid), items: payloadItems })
                              })
                              if(!tResp.ok){
                                const err = await tResp.text().catch(()=>null)
                                console.error('transaction create failed', err)
                                alert('Failed to submit product order')
                              } else {
                                for(const p of products) removeItem(p.id, p.type)
                              }
                            } catch(e){ console.error('Transaction error', e); alert('Checkout failed') }
                          }
                          clearCart()
                          setSuccess(true)
                        }catch(e){
                          console.error(e)
                          alert('Checkout failed')
                        } finally { setLoading(false) }
                      }} disabled={loading}>{loading? 'Processing...' : 'Checkout'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>)}
        </div>
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum</footer>
    </div>
  )
}
