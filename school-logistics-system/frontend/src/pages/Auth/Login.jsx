import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { authAPI } from '../../services/api'
import { AuthLoadingButton } from '../../components/auth/AuthLoadingButton'
import { useLoginLockout } from '../../hooks/useLoginLockout'
import { LoginLockoutNotice } from '../../components/auth/LoginLockoutNotice'
import { LoginFeedback } from '../../components/auth/LoginFeedback'
import './ForgotPassword.css'


export function LoginPage({ onLogin, onChangeMode, error, isSubmitting = false }) {
  const [rememberMe, setRememberMe] = useState(false)
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetStage, setResetStage] = useState(false)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const recoveryDialog = useRef(null)
  useEffect(() => {
    if (!forgotOpen) return
    const previousFocus = document.activeElement
    recoveryDialog.current?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [forgotOpen])
  const { secondsRemaining, hasExpired, recordLock } = useLoginLockout(email)
  const isLocked = secondsRemaining > 0

  const submit = async event => {
    event.preventDefault()
    if (isSubmitting || isLocked) return
    const normalizedEmail = email.trim()
    if (!normalizedEmail) return setValidationError('Enter your email address.')
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return setValidationError('Enter a valid email address.')
    if (!password) return setValidationError('Enter your password.')
    setValidationError('')
    const result = await onLogin(normalizedEmail, password, rememberMe)
    recordLock(normalizedEmail, result?.error)
  }

  const openForgotPassword = () => {
    setForgotEmail(email.trim())
    setForgotMessage('')
    setForgotError(false)
    setResetStage(false)
    setResetComplete(false)
    setResetCode('')
    setNewPassword('')
    setConfirmPassword('')
    setForgotOpen(true)
  }

  const submitForgotPassword = async event => {
    event.preventDefault()
    if (busy) return
    setForgotError(true)
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail.trim())) return setForgotMessage('Enter a valid email address.')
    if (resetStage && newPassword !== confirmPassword) return setForgotMessage('Passwords do not match.')
    setForgotMessage('')
    setBusy(true)
    try {
      const result = resetStage
        ? await authAPI.resetPassword({ email: forgotEmail.trim(), code: resetCode.trim(), password: newPassword })
        : await authAPI.forgotPassword(forgotEmail.trim())
      setForgotMessage(result.message)
      setForgotError(false)
      if (resetStage) setResetComplete(true)
      else setResetStage(true)
      setResetCode(''); setNewPassword(''); setConfirmPassword('')
    } catch (error) { setForgotError(true); setForgotMessage(error.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="auth-form-wrap">
      <div className="auth-heading">
        <h2>Login</h2>
        <p>Welcome back. Please enter your details.</p>
      </div>
      <form className="auth-form" onSubmit={submit} aria-busy={isSubmitting}>
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
          <label><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} /> Keep me signed in in this tab</label>
          <button type="button" onClick={openForgotPassword}>Forgot password?</button>
        </div>
        <AuthLoadingButton className="auth-submit" loading={isSubmitting} disabled={isLocked} loadingText="Signing in...">Login</AuthLoadingButton>
        <LoginLockoutNotice secondsRemaining={secondsRemaining} hasExpired={hasExpired && !error && !isSubmitting} />
        {!isLocked && !isSubmitting && <LoginFeedback key={validationError || error} message={validationError || error} isValidation={Boolean(validationError)} />}
      </form>
      <p className="auth-footer"><button type="button" onClick={() => { if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setValidationError('Enter your email address to resume verification.'); sessionStorage.setItem('srmsVerificationEmail', email.trim().toLowerCase()); onChangeMode('signup') }}>Resume email verification</button></p>
      {forgotOpen && createPortal(
        <dialog ref={recoveryDialog} className="recovery-dialog" aria-labelledby="forgot-title" aria-describedby="forgot-description" onCancel={event => { if (busy) event.preventDefault(); else setForgotOpen(false) }}>
          <button className="recovery-close" type="button" disabled={busy} aria-label="Close password recovery" onClick={() => setForgotOpen(false)}>×</button>
          <header className="recovery-heading">
            <div className="recovery-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{resetComplete ? <path d="m5 12 4 4L19 6" /> : resetStage ? <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></> : <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>}</svg></div>
            <span className="recovery-eyebrow">ACCOUNT RECOVERY</span>
            <h3 id="forgot-title">{resetComplete ? 'Password updated' : resetStage ? 'Create a new password' : 'Forgot your password?'}</h3>
            <p id="forgot-description">{resetComplete ? 'You can now sign in with your new password.' : resetStage ? 'Enter the code from your email and choose a new password.' : 'Enter your email and we’ll send you a code to reset your password.'}</p>
          </header>
          {!resetComplete && <ol className="recovery-steps" aria-label="Password recovery progress"><li aria-current={!resetStage ? 'step' : undefined} className={!resetStage ? 'active' : 'complete'}><span>1</span>Verify email</li><li aria-current={resetStage ? 'step' : undefined} className={resetStage ? 'active' : ''}><span>2</span>New password</li></ol>}
          {forgotMessage && <p className={`recovery-message ${forgotError ? 'is-error' : 'is-success'}`} role={forgotError ? 'alert' : 'status'}>{forgotMessage}</p>}
          {resetComplete ? <button className="recovery-primary" type="button" onClick={() => setForgotOpen(false)}>Back to login</button> : <form key={resetStage ? 'reset' : 'request'} className="recovery-form" onSubmit={submitForgotPassword} aria-busy={busy}>
            <fieldset disabled={busy}>
              <label className="recovery-field"><span>Email address</span><input type="email" value={forgotEmail} onChange={event => { setForgotEmail(event.target.value); setForgotMessage('') }} placeholder="you@example.com" autoComplete="email" required /></label>
              {resetStage && <>
                <label className="recovery-field"><span>Reset code</span><input className="recovery-code" value={resetCode} onChange={event => setResetCode(event.target.value)} placeholder="Enter your reset code" autoComplete="one-time-code" required /></label>
                <label className="recovery-field"><span>New password</span><input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Create a new password" minLength={8} autoComplete="new-password" aria-describedby="recovery-password-hint" required /><small id="recovery-password-hint">Use at least 8 characters.</small></label>
                <label className="recovery-field"><span>Confirm password</span><input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Re-enter your new password" minLength={8} autoComplete="new-password" required /></label>
              </>}
            </fieldset>
            <AuthLoadingButton className="recovery-primary" loading={busy} loadingText={resetStage ? 'Resetting password...' : 'Sending code...'}>{resetStage ? 'Reset password' : 'Send reset code'}</AuthLoadingButton>
            <button className="recovery-secondary" type="button" disabled={busy} onClick={() => { setResetStage(!resetStage); setForgotMessage('') }}>{resetStage ? 'Request a new code' : 'I already have a reset code'}</button>
          </form>}
          <p className="recovery-footer">{resetComplete ? 'Your account is ready to use.' : 'Check your spam folder if the email doesn’t arrive.'}</p>
        </dialog>, document.body)}
    </div>
  )
}

export default LoginPage


