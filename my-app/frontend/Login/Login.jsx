import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import "./Login.css";
import CreateAccountModal from './CreateAccountModal';
import { useAuth } from '../../src/AuthContext.jsx'

export default function Login() {
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState('')
  const { login } = useAuth()

  // ✅ MUST be async
  const handleSubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    const data = {
      username: form.username.value,
      password: form.password.value,
    };

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Login failed")
        return;
      }

      // persist via AuthContext
      try { login(result) } catch(e){ console.warn('login set failed', e) }

      // Log result for debugging and default to Home for all users
      console.log('[login] result:', result);
      navigate('/');

    } catch (err) {
      console.error(err);
      setError("Server error")
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-visual">
          <div className="museum-name">City Museum</div>
        </div>

        <form className="login-form" onSubmit={handleSubmit} aria-label="login form">
          <div className="back-row">
            <Link to="/" className="back-home">Back to home</Link>
          </div>

          <h2 className="login-title">Welcome back</h2>
          <p className="login-sub">Sign in to access curator tools and exhibits.</p>

          <label className="field">
            <span className="field-label">Username</span>
            <input name="username" required placeholder="your-username" />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input name="password" type="password" required placeholder="••••••••" />
          </label>

          {error && <div className="login-error">{error}</div>}

          <div className="row between">
            <div />
            <a className="forgot" href="#">Forgot?</a>
          </div>

          <button className="btn primary" type="submit">Sign in</button>

          <p className="signup">
            New to City Museum?{" "}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="create-link"
            >
              Create an account
            </button>
          </p>
        </form>
      </div>

      {showCreate && (
        <CreateAccountModal
          onClose={(created) => {
            setShowCreate(false);
            if (created) {
              // optional success message
            }
          }}
        />
      )}
    </div>
  );
}