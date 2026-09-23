import './AuthLoadingButton.css'

export function AuthLoadingButton({ loading = false, success = false, loadingText = 'Please wait...', children, className = '', disabled = false, type = 'submit', ...props }) {
  return (
    <button {...props} type={type} className={`auth-loading-button ${className}`} data-state={loading ? 'loading' : success ? 'success' : 'idle'} disabled={disabled || loading || success} aria-busy={loading}>
      {loading && <svg className="auth-loading-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle className="auth-spinner-track" cx="12" cy="12" r="9" /><circle className="auth-spinner-arc" cx="12" cy="12" r="9" /></svg>}
      {!loading && success && <svg className="auth-loading-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
      <span className="auth-loading-label" role="status" aria-live="polite" aria-atomic="true">{loading ? loadingText : children}</span>
    </button>
  )
}
