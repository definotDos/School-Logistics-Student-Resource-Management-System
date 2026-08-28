export function AuthLayout({ children, mode, onChangeMode }) {
  const isLogin = mode === 'login'

  return (
    <main className={`auth-page ${isLogin ? 'is-login' : 'is-signup'}`}>
      <section className="auth-intro" aria-label="Account welcome">
        <div className="auth-intro-copy">
          <h1>{isLogin ? 'Hello, Welcome!' : 'Hello, Welcome!'}</h1>
          <p>{isLogin ? "Don't have an account?" : 'Already have an account?'}</p>
          <button className="intro-action" type="button" onClick={() => onChangeMode(isLogin ? 'signup' : 'login')}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </section>
      <section className="auth-panel">
        <div key={mode} className="auth-panel-inner" aria-live="polite">{children}</div>
      </section>
    </main>
  )
}
