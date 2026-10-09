import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { authAPI } from '../../services/api'
import { validateActivation } from '../../utils/accountValidation'
import { AuthLoadingButton } from '../../components/auth/AuthLoadingButton'

export function ActivateAccount({ initialEmail, onClose, onActivated }) {
  const dialog = useRef(null)
  const [email, setEmail] = useState(initialEmail || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState({})
  const values = { email, code, password, confirmPassword }
  const errors = validateActivation(values)
  const setters = { email: setEmail, code: setCode, password: setPassword, confirmPassword: setConfirmPassword }
  const field = (name, label, props, hint) => {
    const error = touched[name] && errors[name]
    const id = `activation-${name}`
    return <label className="recovery-field" htmlFor={id}>
      <span>{label}</span>
      <input {...props} id={id} name={name} required value={values[name]}
        aria-invalid={Boolean(error)}
        aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined}
        onBlur={() => setTouched(previous => ({ ...previous, [name]: true }))}
        onChange={event => { setters[name](event.target.value); setMessage('') }} />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && <small className="activation-field-error" id={`${id}-error`} aria-live="polite">{error}</small>}
    </label>
  }
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    const focus = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    return () => { document.body.style.overflow = overflow; focus?.focus() }
  }, [])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  const perform = async resend => {
    if (busy || (resend && cooldown > 0)) return
    const validation = validateActivation(values, resend)
    setTouched(previous => ({ ...previous, ...(resend ? { email: true } : { email: true, code: true, password: true, confirmPassword: true }) }))
    setMessage('')
    if (Object.keys(validation).length) {
      dialog.current?.querySelector(`#activation-${Object.keys(validation)[0]}`)?.focus()
      return
    }
    setBusy(true); setMessage('')
    try {
      if (resend) {
        const result = await authAPI.resendVerificationCode(email.trim())
        setMessage(result.message); setIsError(false); setCooldown(60); setCode(''); setTouched(previous => ({ ...previous, code: false }))
      } else {
        await authAPI.activateAccount({ email: email.trim(), code: code.trim(), password, confirmPassword })
        onActivated(email.trim())
      }
    } catch (error) { setMessage(error.message); setIsError(true) }
    finally { setBusy(false) }
  }
  return createPortal(<dialog ref={dialog} className="recovery-dialog" aria-labelledby="activation-title" aria-describedby="activation-description" onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>
    <button type="button" className="recovery-close" aria-label="Close account activation" disabled={busy} onClick={onClose}>×</button>
    <header className="recovery-heading">
      <span className="recovery-eyebrow">STAFF ACCOUNT SETUP</span>
      <h3 id="activation-title">Activate account</h3>
      <p id="activation-description">Enter the code sent when your administrator created your account, then choose your password. Codes expire in 15 minutes.</p>
    </header>
    {message && <p className={`recovery-message ${isError ? 'is-error' : 'is-success'}`} role={isError ? 'alert' : 'status'}>{message}</p>}
    <form className="recovery-form activation-form" noValidate aria-busy={busy} onSubmit={event => { event.preventDefault(); perform(false) }}>
      <fieldset disabled={busy}>
        <legend>1. Verify your email</legend>
        {field('email', 'Email address', { type: 'email', autoComplete: 'email', placeholder: 'you@phinmaed.com' })}
        {field('code', 'Verification code', { className: 'recovery-code', inputMode: 'numeric', autoComplete: 'one-time-code', placeholder: '6-digit code' }, 'Enter the 6-digit code sent to your email. It expires in 15 minutes.')}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>2. Set your password</legend>
        {field('password', 'Create password', { type: 'password', autoComplete: 'new-password', placeholder: 'Create a password' }, 'Use at least 8 characters and at most 72 UTF-8 bytes.')}
        {field('confirmPassword', 'Confirm password', { type: 'password', autoComplete: 'new-password', placeholder: 'Re-enter your password' })}
      </fieldset>
      <AuthLoadingButton className="recovery-primary" loading={busy} loadingText="Please wait...">Activate account</AuthLoadingButton>
      <button className="recovery-secondary" type="button" disabled={busy || cooldown > 0} onClick={() => perform(true)}>{cooldown ? `Resend code in ${cooldown}s` : 'Resend code'}</button>
    </form>
    <p className="recovery-footer">Check your spam folder if you cannot find the email.</p>
  </dialog>, document.body)
}
