import React, { useState } from "react";
import { Link } from 'react-router-dom'
import "./Login.css";
import CreateAccountModal from './CreateAccountModal'

export default function Login({ onSubmit }) {
	const [showCreate, setShowCreate] = useState(false)
  

	const handleSubmit = (e) => {
		e.preventDefault();
		const form = e.target;
		const data = {
			email: form.email.value,
			password: form.password.value,
		};
		if (onSubmit) onSubmit(data);
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
						<span className="field-label">Email</span>
						<input name="email" type="email" required placeholder="you@museum.org" />
					</label>

					<label className="field">
						<span className="field-label">Password</span>
						<input name="password" type="password" required placeholder="••••••••" />
					</label>

					<div className="row between">
						<div />
						<a className="forgot" href="#">Forgot?</a>
					</div>

					<button className="btn primary" type="submit">Sign in</button>

					<p className="signup">New to City Museum? <button type="button" onClick={()=>setShowCreate(true)} className="create-link">Create an account</button></p>
				</form>
			</div>
			{showCreate && <CreateAccountModal onClose={(created)=>{ setShowCreate(false); if(created){ /* can show success toast */ } }} />}

		</div>
	);
}
