export function AuthLayout({ children, mode, onChangeMode, campus }) {
  const isLogin = mode === 'login'
  const themeStyle = campus ? { '--auth-primary': campus.primary, '--auth-primary-dark': campus.dark, '--auth-deep': campus.dark, '--auth-accent': campus.accent, '--auth-gradient': `linear-gradient(150deg, ${campus.primary}, ${campus.dark})` } : {}

  return (
    <main className={`auth-page ${isLogin ? 'is-login' : 'is-signup'}`} style={{ ...themeStyle, '--selected-campus-logo': campus?.logo ? `url("${campus.logo}")` : 'none' }}>
      <section className="auth-intro" aria-label="Account welcome">
        <div className="auth-intro-copy">
          <h1>{isLogin ? 'Hello, Welcome!' : 'Hello, Welcome!'}</h1>
          <p>{isLogin ? "Don't have an account?" : 'Already have an account?'}</p>
          <button className="intro-action" type="button" onClick={() => onChangeMode(isLogin ? 'signup' : 'login')}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </section>
      <section className={`auth-panel ${campus ? 'has-campus-theme' : ''}`}>
        <div key={mode} className="auth-panel-inner" aria-live="polite">{children}</div>
      </section>
    </main>
  )
}
