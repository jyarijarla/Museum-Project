import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import "./Login.css";
import CreateAccountModal from './CreateAccountModal';
import { useAuth } from '../../src/AuthContext.jsx'
import { API_BASE } from '../../src/api.js'

export default function Login() {
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1=form, 2=success
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    const data = {
      username: form.username.value,
      password: form.password.value,
    };

    try {
        const apiBase = API_BASE()
        console.log('[login] using apiBase=', apiBase)
        console.log("ENV:", import.meta.env)
        const res = await fetch(`${apiBase}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let result = await res.json();

      if (!res.ok) {
        setError(result.error || "Login failed")
        return;
      }

      // If backend didn't include first/last name, fetch visitor record
      if ((!result.firstName || !result.lastName) && result.userId) {
        try {
          const vRes = await fetch(`${apiBase}/api/visitor/${result.userId}`)
          if (vRes.ok) {
            const vJson = await vRes.json()
            if (vJson && vJson.visitor) {
              result = { ...result, firstName: vJson.visitor.FirstName || result.firstName, lastName: vJson.visitor.LastName || result.lastName, email: vJson.visitor.Email || result.email }
            }
          }
        } catch(e){ console.warn('visitor fetch failed', e) }
      }

      // persist via AuthContext
      try { login(result) } catch(e){ console.warn('login set failed', e) }

      console.log('[login] result:', result);
      navigate('/')

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
            <a className="forgot" href="#" onClick={(e) => { e.preventDefault(); setShowReset(true); setResetStep(1); setResetError(''); }}>Forgot?</a>
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

      {showReset && (
        <div className="modal-backdrop" onClick={() => setShowReset(false)}>
          <div className="reset-modal" onClick={e => e.stopPropagation()}>
            <div className="reset-modal-header">
              <h3>{resetStep === 1 ? 'Reset Password' : 'Password Reset!'}</h3>
              <button className="modal-close" onClick={() => setShowReset(false)}>&times;</button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setResetError('');
                setResetLoading(true);
                const form = e.target;
                try {
                  const res = await fetch(`${API_BASE()}/api/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      username: form.resetUsername.value,
                      email: form.resetEmail.value,
                      newPassword: form.resetNewPassword.value,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setResetError(data.error || 'Reset failed');
                  } else {
                    setResetStep(2);
                  }
                } catch {
                  setResetError('Server error');
                } finally {
                  setResetLoading(false);
                }
              }}>
                <p className="reset-sub">Enter your username and the email on file to set a new password.</p>

                <label className="field">
                  <span className="field-label">Username</span>
                  <input name="resetUsername" required placeholder="your-username" />
                </label>

                <label className="field">
                  <span className="field-label">Email on file</span>
                  <input name="resetEmail" type="email" required placeholder="you@example.com" />
                </label>

                <label className="field">
                  <span className="field-label">New Password</span>
                  <input name="resetNewPassword" type="password" required minLength={6} placeholder="Min 6 characters" />
                </label>

                {resetError && <div className="login-error">{resetError}</div>}

                <button className="btn primary" type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            ) : (
              <div className="reset-success">
                <p>Your password has been updated. You can now sign in with your new password.</p>
                <button className="btn primary" onClick={() => setShowReset(false)}>Back to Sign In</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}