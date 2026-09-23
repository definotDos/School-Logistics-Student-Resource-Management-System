import './LoginFeedback.css'

export function LoginFeedback({ message, isValidation = false }) {
  if (!message) return null

  const invalidCredentials = message === 'Invalid email or password.'
  const success = !isValidation && message.includes('successfully')
  const title = invalidCredentials ? 'We couldn’t sign you in' : success ? 'You’re all set' : isValidation ? 'Check your details' : 'Unable to sign in'

  return (
    <div className={`login-feedback${success ? ' login-feedback--success' : ''}`} role={success ? 'status' : 'alert'} aria-atomic="true">
      <span className="login-feedback__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {success ? <path d="m5 12 4 4L19 6" /> : <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5M12 16h.01" /></>}
        </svg>
      </span>
      <div className="login-feedback__content">
        <h3>{title}</h3>
        <p>{message}</p>
        {invalidCredentials && <span className="login-feedback__hint">Check for typos or use “Forgot password?” to reset your password.</span>}
      </div>
    </div>
  )
}
