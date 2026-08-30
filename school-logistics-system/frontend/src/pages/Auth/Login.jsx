import { useState } from 'react'


export function LoginPage({ onLogin, onChangeMode, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')

  const submit = event => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail) return setValidationError('Enter your email address.')
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return setValidationError('Enter a valid email address.')
    if (!password) return setValidationError('Enter your password.')
    setValidationError('')
    onLogin(normalizedEmail, password)
  }

  const openForgotPassword = () => {
    setForgotEmail(email.trim())
    setForgotMessage('')
    setForgotOpen(true)
  }

  const submitForgotPassword = event => {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail.trim())) return setForgotMessage('Enter a valid email address.')
    setForgotMessage('Your request was recorded. Please contact an administrator to complete the password reset.')
  }

  return (
    <div className="auth-form-wrap">
      <div className="auth-heading">
        <h2>Login</h2>
        <p>Welcome back. Please enter your details.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field compact-field">
          <span>Email address</span>
          <input className={validationError && !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'input-invalid' : ''} type="email" placeholder="Email Address" value={email} onChange={event => { setEmail(event.target.value); setValidationError('') }} autoComplete="email" required aria-invalid={Boolean(validationError && !/^\S+@\S+\.\S+$/.test(email.trim()))} />
        </label>
        <label className="auth-field compact-field">
          <span>Password</span>
          <span className="password-control">
            <input className={validationError && !password ? 'input-invalid' : ''} type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={event => { setPassword(event.target.value); setValidationError('') }} autoComplete="current-password" required aria-invalid={Boolean(validationError && !password)} />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
              {showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.9 10.9 0 0 1 12 4c5.4 0 9.2 5.1 9.8 6-.3.5-1.5 2.2-3.4 3.6M6.2 6.2C3.8 7.8 2.4 10.2 2.2 10.6c.6.9 4.4 5.4 9.8 5.4 1.3 0 2.5-.3 3.6-.8" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12S5.8 5 12 5s9.8 7 9.8 7-3.6 7-9.8 7-9.8-7-9.8-7Z" /><circle cx="12" cy="12" r="2.7" /></svg>}
            </button>
          </span>
        </label>
        <div className="auth-options">
          <label><input type="checkbox" /> Remember me</label>
          <button type="button" onClick={openForgotPassword}>Forgot password?</button>
        </div>
        <button className="auth-submit" type="submit">Login</button>
        {(validationError || error) && <p className={`auth-error ${error?.includes('successfully') ? 'auth-success' : ''}`} role="alert">{validationError || error}</p>}
      </form>
      <p className="auth-footer">Don't have an account? <button type="button" onClick={() => onChangeMode('signup')}>Register</button></p>
      {forgotOpen && <div className="forgot-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setForgotOpen(false)}>
        <section className="forgot-modal" role="dialog" aria-modal="true" aria-labelledby="forgot-title">
          <button className="forgot-modal-close" type="button" aria-label="Close password recovery" onClick={() => setForgotOpen(false)}>×</button>
          <div className="forgot-modal-icon" aria-hidden="true">?</div>
          <h3 id="forgot-title">Forgot your password?</h3>
          <p>Enter your account email so an administrator can help you recover access.</p>
          <form onSubmit={submitForgotPassword}>
            <label className="auth-field compact-field"><span>Email address</span><input type="email" value={forgotEmail} onChange={event => { setForgotEmail(event.target.value); setForgotMessage('') }} placeholder="you@example.com" autoComplete="email" required /></label>
            <button className="auth-submit" type="submit">Request help</button>
            {forgotMessage && <p className="forgot-message" role="status">{forgotMessage}</p>}
          </form>
        </section>
      </div>}
    </div>
  )
}

export default LoginPage


