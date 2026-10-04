import { useEffect, useState } from 'react'
import { authAPI } from '../../services/api'
import { AuthLoadingButton } from './AuthLoadingButton'
import './OtpVerification.css'

export default function OtpVerification({ pending, onPending, onVerify, onCancel }) {
  const [code, setCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const seconds = Math.max(0, Math.ceil((new Date(pending.expiresAt) - now) / 1000))
  const cooldown = Math.max(0, Math.ceil((new Date(pending.resendAt) - now) / 1000))
  const run = async action => {
    if (busy) return
    setBusy(true); setError('')
    try { await action() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="auth-form-wrap otp-verification">
    <div className="auth-heading">
      <div className="otp-mail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg></div>
      <span className="otp-eyebrow">Email verification</span>
      <h2>Check your email</h2><p>Enter the 6-digit sign-in code sent to your registered email address.</p>
    </div>
    <form className="auth-form" aria-busy={busy} onSubmit={event => { event.preventDefault(); run(() => onVerify({ challenge: pending.challenge, code, rememberDevice })) }}>
      <div className="otp-code-group">
      <label className="auth-field compact-field"><span>Verification code</span>
        <input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required aria-describedby={`otp-expiry${error ? ' otp-error' : ''}`} aria-invalid={Boolean(error)} />
      </label>
      <p id="otp-expiry" className={`otp-expiry${!seconds ? ' is-expired' : ''}`}>{seconds ? <>Code expires in <strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong></> : 'Code expired. Request a new code.'}</p>
      </div>
      <div className="otp-device">
        <label><input type="checkbox" checked={rememberDevice} onChange={event => setRememberDevice(event.target.checked)} /><span>Remember this device <small>30 days</small></span></label>
      </div>
      {error && <p id="otp-error" className="otp-error" role="alert">{error}</p>}
      <AuthLoadingButton className="auth-submit" loading={busy} disabled={!seconds || code.length !== 6} loadingText="Please wait...">Verify and continue <span aria-hidden="true">&rarr;</span></AuthLoadingButton>
      <div className="otp-resend"><span>Didn’t receive a code?</span><button type="button" disabled={busy || cooldown > 0} onClick={() => run(async () => { onPending(await authAPI.resendMfa(pending.challenge)); setCode(''); setNow(Date.now()) })}>{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button></div>
      <div className="otp-footer"><button type="button" disabled={busy} onClick={onCancel}><span aria-hidden="true">&larr;</span> Back to login</button></div>
    </form>
  </div>
}
