import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

export default function CreateAccountPage(){
  const navigate = useNavigate()
  const [form,setForm] = useState({username:'',firstName:'',lastName:'',phone:'',email:'',dob:'',password:'',confirm:''})
  const [error,setError] = useState('')

  const handleChange = (e) => setForm(f=>({...f,[e.target.name]:e.target.value}))

  const handleSubmit = (e)=>{
    e.preventDefault(); setError('')
    const {username,email,password,confirm} = form
    if(!username||!email||!password||!confirm){ setError('Please fill the required fields'); return }
    if(password !== confirm){ setError('Passwords do not match'); return }

    const users = JSON.parse(localStorage.getItem('users')|| '[]')
    if(users.find(u=>u.email===email)){ setError('Email already registered'); return }
    if(users.find(u=>u.username===username)){ setError('Username already taken'); return }

    users.push({...form,createdAt:new Date().toISOString()})
    localStorage.setItem('users', JSON.stringify(users))

    // navigate back to login after creation
    navigate('/login')
  }

  return (
    <div className="create-page">
      <div className="create-container">
        <h2>Create your account</h2>
        <p className="login-sub">Fill the form to create a curator account.</p>
        {error && <div className="modal-error">{error}</div>}
        <form className="create-form" onSubmit={handleSubmit}>
          <label>Username<input name="username" value={form.username} onChange={handleChange} required /></label>
          <label>First name<input name="firstName" value={form.firstName} onChange={handleChange} /></label>
          <label>Last name<input name="lastName" value={form.lastName} onChange={handleChange} /></label>
          <label>Phone<input name="phone" value={form.phone} onChange={handleChange} /></label>
          <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
          <label>DOB<input name="dob" type="date" value={form.dob} onChange={handleChange} /></label>
          <label>Password<input name="password" type="password" value={form.password} onChange={handleChange} required /></label>
          <label>Confirm password<input name="confirm" type="password" value={form.confirm} onChange={handleChange} required /></label>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={()=>navigate(-1)}>Cancel</button>
            <button type="submit" className="btn primary">Create account</button>
          </div>
        </form>
      </div>
    </div>
  )
}
