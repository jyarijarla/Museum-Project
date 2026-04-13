import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import { API_BASE } from '../../src/api.js'

export default function CreateAccountPage(){
  const navigate = useNavigate()
  const [form,setForm] = useState({
    username:'',firstName:'',lastName:'',phone:'',email:'',dob:'',password:'',confirm:''
  })
  const [error,setError] = useState('')

  const handleChange = (e) => setForm(f=>({...f,[e.target.name]:e.target.value}))

  const handleSubmit = async (e)=>{
    e.preventDefault()
    setError('')

    const {username,email,password,confirm} = form

    if(!username||!email||!password||!confirm){
      setError('Please fill the required fields')
      return
    }

    if(password !== confirm){
      setError('Passwords do not match')
      return
    }

    try {
      const apiBase = API_BASE()
      const res = await fetch(`${apiBase}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Signup failed")
        return
      }

      navigate('/login')

    } catch (err) {
      console.error(err)
      setError("Server error")
    }
  }

  return (
    <div className="create-page">
      <div className="create-container">
        <h2>Create your account</h2>
        <p className="login-sub">Fill the form to create a curator account.</p>

        {error && <div className="modal-error">{error}</div>}

        <form className="create-form" onSubmit={handleSubmit}>
          <label>Username<input name="username" value={form.username} onChange={handleChange} required /></label>
          <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
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