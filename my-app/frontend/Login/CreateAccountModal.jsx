import React, { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../../src/api.js'

export default function CreateAccountModal({ onClose }){
  const [form, setForm] = useState({
    username:'', firstName:'', lastName:'', phone:'', email:'', dob:'', address:'', password:'', confirm:''
  })
  const [error, setError] = useState('')
  const backdropRef = useRef(null)

  const handleChange = (e) => setForm(f => ({...f,[e.target.name]: e.target.value}))

  const handleSubmit = async (e) =>{
    e.preventDefault()
    setError('')

    const { username, email, password, confirm } = form

    if(!username || !email || !password || !confirm){ 
      setError('Please fill required fields'); 
      return 
    }

    if(password !== confirm){ 
      setError('Passwords do not match'); 
      return 
    }

    if(password.length < 8){ 
      setError('Password must be at least 8 characters'); 
      return 
    }

    // ✅ REPLACED localStorage WITH BACKEND CALL
    try {
      const apiBase = API_BASE()
      const res = await fetch(`${apiBase}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Signup failed")
        return
      }

      if(onClose) onClose(true)

    } catch (err) {
      console.error(err)
      setError("Server error")
    }
  }

  useEffect(()=>{
    const onKey = (e)=>{ if(e.key==='Escape') onClose(false) }
    document.addEventListener('keydown', onKey)
    return ()=> document.removeEventListener('keydown', onKey)
  },[onClose])

  const onBackdropClick = (e) => {
    if(e.target === backdropRef.current) onClose(false)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" ref={backdropRef} onMouseDown={onBackdropClick}>
      <div className="modal">
        <div className="modal-visual">
          <div className="visual-decor">
            <div className="big-dot" />
            <div className="small-dot" />
          </div>
          <div className="visual-inner">
            <div className="museum-name">City Museum</div>
            <p className="visual-sub">Join our curator community — manage exhibits, upload artifacts, and collaborate.</p>
            <ul className="visual-features">
              <li>Curator tools</li>
              <li>Secure workflows</li>
              <li>Collection analytics</li>
            </ul>
          </div>
        </div>

        <div className="modal-content">
          <div className="modal-header">
            <div className="header-left">
              <div className="avatar" aria-hidden>CM</div>
              <div className='flex justify between'>
                <h3>Create account</h3>
              </div>
            </div>
            <button className="modal-close" onClick={()=>onClose(false)} aria-label="close">✕</button>
          </div>

          <form className="modal-body" onSubmit={handleSubmit}>
            {error && <div className="modal-error">{error}</div>}

            <div className="form-grid">
              <label>
                <span>Username</span>
                <input name="username" value={form.username} onChange={handleChange} required />
              </label>

              <label>
                <span>First name</span>
                <input name="firstName" value={form.firstName} onChange={handleChange} />
              </label>

              <label>
                <span>Last name</span>
                <input name="lastName" value={form.lastName} onChange={handleChange} />
              </label>

              <label>
                <span>Phone</span>
                <input name="phone" value={form.phone} onChange={handleChange} />
              </label>

              <label>
                <span>Email</span>
                <input name="email" type="email" value={form.email} onChange={handleChange} required />
              </label>

              <label>
                <span>DOB</span>
                <input name="dob" type="date" value={form.dob} onChange={handleChange} />
              </label>

              <label className="full-width">
                <span>Address</span>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Street, City, State, ZIP" />
              </label>
            </div>

            <div className="form-grid single">
              <label>
                <span>Password</span>
                <input name="password" type="password" value={form.password} onChange={handleChange} required />
              </label>

              <label>
                <span>Confirm password</span>
                <input name="confirm" type="password" value={form.confirm} onChange={handleChange} required />
              </label>
            </div>

            <div className="hint">Password must be at least 8 characters.</div>

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={()=>onClose(false)}>Cancel</button>
              <button type="submit" className="btn primary">Create account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}