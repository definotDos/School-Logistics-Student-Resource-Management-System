export function AuthLayout({ children, mode, onChangeMode }) {
  const isLogin = mode === 'login'

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-label="School Logistics introduction">
        <div className="auth-brand">
          <b>SL</b>
          <span>School<span>Logistics</span></span>
        </div>

        <div className="auth-intro-copy">
          <p className="eyebrow">STUDENT RESOURCE PORTAL</p>
          <h1>Everything you need for school, in one place.</h1>
          <p>Request, track, and claim your school resources with ease.</p>
        </div>

        <div className="auth-orbit" aria-hidden="true">
          <i className="orbit-card card-one">⌁</i>
          <i className="orbit-card card-two">✓</i>
          <i className="orbit-card card-three">+</i>
          <span className="orbit-ring" />
          <b>SL</b>
        </div>

        <small className="auth-copyright">© 2024 School Logistics. Made for students.</small>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-switch" role="tablist" aria-label="Account access">
            <button
              className={isLogin ? 'selected' : ''}
              onClick={() => onChangeMode('login')}
              role="tab"
              aria-selected={isLogin}
            >
              Log in
            </button>
            <button
              className={!isLogin ? 'selected' : ''}
              onClick={() => onChangeMode('signup')}
              role="tab"
              aria-selected={!isLogin}
            >
              Sign up
            </button>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
