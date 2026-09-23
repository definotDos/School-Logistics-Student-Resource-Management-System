import './LoginLockoutNotice.css'

export function LoginLockoutNotice({ secondsRemaining, hasExpired }) {
  if (!secondsRemaining && !hasExpired) return null

  const unlocked = secondsRemaining === 0
  const countdown = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`
  const progress = Math.min(1, Math.max(0, secondsRemaining / 180))

  return (
    <section className={`login-lockout${unlocked ? ' login-lockout--ready' : ''}`} aria-label="Login availability" aria-live="off">
      <div className="login-lockout__body">
        <div className="login-lockout__copy">
          <span className="login-lockout__eyebrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {unlocked ? <path d="m5 12 4 4L19 6" /> : <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>}
            </svg>
            {unlocked ? 'Ready when you are' : 'A short security pause'}
          </span>
          <div role="status" aria-live="polite" aria-atomic="true">
            <h3>{unlocked ? 'You can log in again' : 'Account temporarily locked'}</h3>
            <p>{unlocked ? 'Your wait is over. Please enter your credentials to try again.' : 'Three incorrect attempts. Take a moment, then try again.'}</p>
          </div>
        </div>
        {!unlocked && <div className="login-lockout__timer" role="timer" aria-live="off" aria-label={`Try again in ${Math.floor(secondsRemaining / 60)} minutes and ${secondsRemaining % 60} seconds`}>
          <svg viewBox="0 0 96 96" aria-hidden="true">
            <circle className="login-lockout__track" cx="48" cy="48" r="43" />
            <circle className="login-lockout__progress" cx="48" cy="48" r="43" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - progress)} />
          </svg>
          <span className="login-lockout__time">{countdown}</span>
          <span className="login-lockout__time-label">remaining</span>
        </div>}
      </div>
      <div className="login-lockout__footer" key={unlocked ? 'ready' : 'locked'}>
        <span className="login-lockout__dot" aria-hidden="true" />
        {unlocked ? 'Login is available now' : 'Unlocks automatically when the timer ends'}
      </div>
    </section>
  )
}
