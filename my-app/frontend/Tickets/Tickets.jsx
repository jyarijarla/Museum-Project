import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Tickets.css'
import { useAuth } from '../../src/AuthContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'
import { API_BASE } from '../../src/api.js'

const TODAY = new Date().toISOString().split('T')[0]

const EXHIBIT_CONFIG = {
  1: {
    gradient: 'linear-gradient(160deg,#0b0c2a 0%,#1a237e 45%,#1565c0 100%)',
    accent: '#60a5fa',
    icon: '🔭',
    tag: 'Science & Astronomy',
  },
  2: {
    gradient: 'linear-gradient(160deg,#0a1f0b 0%,#1b5e20 45%,#33691e 100%)',
    accent: '#4ade80',
    icon: '🦕',
    tag: 'Natural World',
  },
  3: {
    gradient: 'linear-gradient(160deg,#1a0900 0%,#7f1d1d 45%,#9a3412 100%)',
    accent: '#fb923c',
    icon: '🏛️',
    tag: 'History & Culture',
  },
}

export default function Tickets() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [visitDate, setVisitDate] = useState(TODAY)
  const [exhibits, setExhibits] = useState([])
  const [isMember, setIsMember] = useState(false)
  const [ticketDiscount, setTicketDiscount] = useState(0)
  const [quantities, setQuantities] = useState({})   // { exhibitId: qty }
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)  // receipt after purchase
  const [purchaseError, setPurchaseError] = useState(null)

  const uid = user?.userId || user?.UserID || user?.id || user?.userID

  // Fetch pricing whenever visitDate or user changes
  const fetchPricing = useCallback(async () => {
    if (!visitDate) return
    setPricingLoading(true)
    setPricingError(null)
    try {
      const params = new URLSearchParams({ visitDate })
      if (uid) params.set('userId', uid)
      const res = await fetch(`${API_BASE()}/api/tickets/pricing?${params}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `Server error ${res.status}`)
      }
      const data = await res.json()
      setExhibits(data.exhibits || [])
      setIsMember(!!data.isMember)
      setTicketDiscount(data.ticketDiscountPercent || 0)
      // Reset quantities when date/pricing changes
      setQuantities({})
    } catch (e) {
      setPricingError(e.message)
    } finally {
      setPricingLoading(false)
    }
  }, [visitDate, uid])

  useEffect(() => { fetchPricing() }, [fetchPricing])

  const setQty = (exhibitId, val) => {
    const n = Math.max(0, Number(val) || 0)
    setQuantities(prev => ({ ...prev, [exhibitId]: n }))
  }

  const cartItems = exhibits
    .map(e => ({ ...e, qty: quantities[e.ExhibitID] || 0 }))
    .filter(e => e.qty > 0)

  const orderTotal = cartItems.reduce((s, e) => s + e.Price * e.qty, 0)

  const handlePurchase = async () => {
    if (!user) { navigate('/login'); return }
    if (cartItems.length === 0) return
    setPurchaseError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE()}/api/tickets/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          visitDate,
          items: cartItems.map(e => ({ exhibitId: e.ExhibitID, qty: e.qty })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`)
      }
      setConfirmation({ ...data, visitDate, items: cartItems })
      setQuantities({})
    } catch (e) {
      setPurchaseError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <div className="tickets-root">
        <Header user={user} />
        <main className="tickets-confirm-wrap">
          <div className="confirmation-card">
            <div className="confirm-glow" />
            <div className="confirm-icon">✓</div>
            <h2 className="confirm-heading">Booking Confirmed!</h2>
            <p className="confirm-sub">
              Order <strong>#{confirmation.ticketPurchaseId}</strong>
            </p>
            <div className="confirm-date-chip">
              📅 {new Date(confirmation.visitDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            {confirmation.isMember && (
              <div className="member-badge">
                ⭐ Member pricing applied
                {confirmation.ticketDiscountPercent > 0 && ` (${confirmation.ticketDiscountPercent >= 100 ? 'free admission' : `${confirmation.ticketDiscountPercent}% off`})`}
              </div>
            )}
            <div className="confirm-items">
              {confirmation.items.map(it => {
                const cfg = EXHIBIT_CONFIG[it.ExhibitID] || {}
                return (
                  <div key={it.ExhibitID} className="confirm-row">
                    <span className="confirm-row-name">
                      <span className="confirm-icon-small">{cfg.icon || '🎟'}</span>
                      {it.ExhibitName} <span className="confirm-qty">× {it.qty}</span>
                    </span>
                    <span className="confirm-row-price">${(it.Price * it.qty).toFixed(2)}</span>
                  </div>
                )
              })}
              <div className="confirm-total-row">
                <span>Total Paid</span>
                <span>${Number(confirmation.totalAmount).toFixed(2)}</span>
              </div>
            </div>
            <div className="confirm-actions">
              <button className="tkt-btn tkt-btn-primary" onClick={() => { setConfirmation(null); fetchPricing() }}>
                Buy More Tickets
              </button>
              <Link to="/dashboard" className="tkt-btn tkt-btn-ghost">My Account</Link>
            </div>
          </div>
        </main>
        <footer className="home-footer">© {new Date().getFullYear()} City Museum</footer>
      </div>
    )
  }

  return (
    <div className="tickets-root">
      <Header user={user} />

      {/* ── Cinematic Hero ── */}
      <section className="tkt-hero">
        <div className="tkt-hero-bg" />
        <div className="tkt-hero-orb tkt-hero-orb-1" />
        <div className="tkt-hero-orb tkt-hero-orb-2" />
        <div className="tkt-hero-content">
          <div className="tkt-hero-eyebrow">🎟 Plan Your Visit</div>
          <h1 className="tkt-hero-title">Experience the Museum</h1>
          <p className="tkt-hero-sub">
            Select your visit date, choose your exhibits, and step into another world.
          </p>
          {isMember
            ? <div className="member-badge hero-badge">
                ⭐ Member — {ticketDiscount >= 100 ? 'free admission' : `${ticketDiscount}% discount`} applied automatically
              </div>
            : <Link to="/membership" className="tkt-hero-cta">Become a member for up exclusive perks →</Link>}
        </div>
      </section>

      <main className="tickets-main">

        {/* ── Step 1: Visit Date ── */}
        <div className="step-section">
          <div className="step-header">
            <div className="step-num">1</div>
            <div>
              <div className="step-title">Choose Your Visit Date</div>
              <div className="step-sub">Prices and availability update automatically</div>
            </div>
          </div>
          <div className="date-picker-wrap">
            <span className="date-icon">📅</span>
            <input
              id="visit-date"
              type="date"
              min={TODAY}
              value={visitDate}
              onChange={e => setVisitDate(e.target.value)}
              className="date-input"
            />
            <span className="date-display">
              {new Date(visitDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {pricingLoading && (
          <div className="loading-shimmer">
            {[1,2,3].map(i => <div key={i} className="shimmer-card" />)}
          </div>
        )}
        {pricingError && <div className="error-msg">{pricingError}</div>}

        {!pricingLoading && exhibits.length > 0 && (
          <>
            {/* ── Step 2: Select Exhibits ── */}
            <div className="step-section">
              <div className="step-header">
                <div className="step-num">2</div>
                <div>
                  <div className="step-title">Select Exhibits</div>
                  <div className="step-sub">Add as many tickets as you need per exhibit</div>
                </div>
              </div>
            </div>

            <div className="tickets-layout">
              <div className="exhibits-grid">
                {exhibits.map(exhibit => {
                  const qty = quantities[exhibit.ExhibitID] || 0
                  const isClosed = !!exhibit.IsClosedOnVisitDate
                  const soldOut = exhibit.Available <= 0
                  const isUnavailable = isClosed || soldOut
                  const cfg = EXHIBIT_CONFIG[exhibit.ExhibitID] || { gradient: 'linear-gradient(160deg,#1e293b,#334155)', accent: '#94a3b8', icon: '🎭', tag: 'Exhibition' }
                  const capacityPct = Math.max(0, Math.min(100, (exhibit.Available / exhibit.MaxCapacity) * 100))
                  const isSelected = qty > 0
                  return (
                    <div
                      key={exhibit.ExhibitID}
                      className={`exhibit-card${isUnavailable ? ' sold-out' : ''}${isSelected ? ' selected' : ''}`}
                      style={{ '--accent': cfg.accent }}
                    >
                      {/* Art panel */}
                      <div className="exhibit-art" style={{ background: cfg.gradient }}>
                        <div className="exhibit-art-overlay" />
                        <div className="exhibit-art-top">
                          <span className="exhibit-type-tag">{cfg.tag}</span>
                          {isSelected && <span className="exhibit-selected-badge">{qty} selected</span>}
                        </div>
                        <div className="exhibit-art-bottom">
                          <div className="exhibit-icon">{cfg.icon}</div>
                          <h3 className="exhibit-name">{exhibit.ExhibitName}</h3>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="exhibit-body">
                        <p className="exhibit-desc">{exhibit.Description}</p>

                        {/* Capacity bar */}
                        <div className="cap-row">
                          <div className="cap-bar">
                            <div
                              className={`cap-fill${capacityPct < 15 ? ' cap-fill-low' : capacityPct < 50 ? ' cap-fill-mid' : ''}`}
                              style={{ width: `${capacityPct}%` }}
                            />
                          </div>
                          <span className={`cap-label${exhibit.Available < 10 ? ' cap-label-low' : ''}`}>
                            {isClosed
                              ? '🚫 Closed on selected date'
                              : soldOut
                                ? '🔴 Sold out'
                                : exhibit.Available < 10
                                  ? `⚠️ Only ${exhibit.Available} left`
                                  : `${exhibit.Available} spots`}
                          </span>
                        </div>

                        {isClosed && (
                          <div className="error-msg" style={{ marginBottom: 8, fontSize: 12 }}>
                            {exhibit.ClosedMessage || 'This exhibit is closed on the selected date.'}
                          </div>
                        )}

                        {/* Price row */}
                        <div className="price-row">
                          {isMember ? (
                            <div className="price-stack">
                              <span className="price-main price-green">${exhibit.Price.toFixed(2)}</span>
                              <span className="price-was">${exhibit.RegularPrice.toFixed(2)}</span>
                              <span className="price-save">Save ${(exhibit.RegularPrice - exhibit.MemberPrice).toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="price-main">${exhibit.Price.toFixed(2)}</span>
                          )}
                          <span className="price-per">per person</span>
                        </div>

                        {/* Qty controls */}
                        <div className="qty-row">
                          <button className="qty-btn" disabled={qty <= 0} onClick={() => setQty(exhibit.ExhibitID, qty - 1)}>−</button>
                          <span className="qty-num">{qty}</span>
                          <button className="qty-btn" disabled={isUnavailable || qty >= exhibit.Available} onClick={() => setQty(exhibit.ExhibitID, qty + 1)}>+</button>
                          {qty > 0 && <span className="qty-subtotal">${(exhibit.Price * qty).toFixed(2)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Order Summary ── */}
              <aside className="order-summary">
                <div className="summary-heading">
                  <span className="step-num step-num-sm">3</span>
                  <span>Order Summary</span>
                </div>

                <div className="summary-date-chip">
                  📅 {new Date(visitDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                {cartItems.length === 0 ? (
                  <div className="summary-empty">
                    <div className="summary-empty-icon">🎟</div>
                    <div>Add exhibits above<br/>to build your order</div>
                  </div>
                ) : (
                  <div className="summary-items">
                    {cartItems.map(e => (
                      <div key={e.ExhibitID} className="summary-row">
                        <span className="summary-row-name">
                          {EXHIBIT_CONFIG[e.ExhibitID]?.icon} {e.ExhibitName}
                          <span className="summary-row-qty"> × {e.qty}</span>
                        </span>
                        <span className="summary-row-price">${(e.Price * e.qty).toFixed(2)}</span>
                      </div>
                    ))}
                    {isMember && (() => {
                      const saved = cartItems.reduce((s, e) => s + (e.RegularPrice - e.MemberPrice) * e.qty, 0)
                      return saved > 0 ? (
                        <div className="summary-savings-row">⭐ Member savings −${saved.toFixed(2)}</div>
                      ) : null
                    })()}
                    <div className="summary-total-row">
                      <span>Total</span>
                      <span>${orderTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {purchaseError && <div className="error-msg" style={{ marginTop: 12, fontSize: 13 }}>{purchaseError}</div>}

                <button
                  className={`checkout-btn${cartItems.length === 0 || submitting ? ' disabled' : ''}`}
                  disabled={cartItems.length === 0 || submitting}
                  onClick={handlePurchase}
                >
                  {submitting
                    ? <><span className="spinner" /> Processing…</>
                    : user
                      ? <>Confirm Purchase · ${orderTotal.toFixed(2)}</>
                      : 'Log in to Purchase'}
                </button>

                {!user && (
                  <p className="summary-login-hint">You'll be redirected to log in before completing your order.</p>
                )}
              </aside>
            </div>
          </>
        )}
      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Tickets</footer>
    </div>
  )
}

function Header({ user }) {
  return (
    <header className="tkt-header">
      <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
      <nav>
        <Link className="nav-link" to="/">Home</Link>
        <Link className="nav-link" to="/exhibits">Exhibits</Link>
        <Link className="nav-link tkt-nav-active" to="/tickets">Tickets</Link>
        <Link className="nav-link" to="/membership">Membership</Link>
        <Link className="nav-link" to="/giftshop">Gift Shop</Link>
        {user
          ? <div style={{ marginRight: 8 }}><ProfileMenu /></div>
          : <Link className="btn-login" to="/login">Login</Link>}
      </nav>
    </header>
  )
}
