import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const THEME_KEY = 'srmsLandingTheme'

function readTheme() {
  try {
    return JSON.parse(localStorage.getItem(THEME_KEY) ?? 'true')
  } catch {
    return true
  }
}

const navItems = [
  { label: 'Home', target: 'top' },
  { label: 'Features', target: 'features' },
  { label: 'For Users', target: 'users' },
  { label: 'About', target: 'about' },
  { label: 'Contact', target: 'contact' },
]

const benefitItems = [
  { icon: '✓', title: 'Reduce delays', text: 'Track requests and resources efficiently across the campus.' },
  { icon: '✦', title: 'Centralized management', text: 'Manage inventory, requests, and allocations from one place.' },
  { icon: '⚡', title: 'Fast & efficient', text: 'Save time with quick approvals and real-time campus updates.' },
  { icon: '▣', title: 'Reports & insights', text: 'Make better decisions using easy-to-read operational data.' },
]

const audienceCards = [
  {
    title: 'Students',
    description: 'Request resources, track status, and stay updated with campus essentials.',
    tone: 'student',
  },
  {
    title: 'Administrators',
    description: 'Manage users, monitor requests, and approve or reject needs efficiently.',
    tone: 'admin',
  },
  {
    title: 'Logistics Staff',
    description: 'Coordinate allocation, distribution, and inventory movement with clarity.',
    tone: 'staff',
  },
  {
    title: 'Student Affairs',
    description: 'Review trends, support students, and keep operations organized and smooth.',
    tone: 'affairs',
  },
]

const keyFeatureTiles = [
  'Resource Requests',
  'Inventory Management',
  'Claim Scheduling',
  'Reports & Analytics',
  'Status Tracking',
  'Notifications',
]

export function LandingPage() {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState(readTheme)
  const [ripples, setRipples] = useState([])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode))
  }, [isDarkMode])

  const handleBrandClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    
    setRipples((prev) => [...prev, { id, x, y }])
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 600)
  }

  const scrollToSection = (target) => {
    if (target === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const section = document.getElementById(target)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <main id="top" className={`landing-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <header className="landing-header">
        <div className="brand-wrap" onClick={handleBrandClick} role="button" tabIndex={0}>
          <div className="brand-mark">
            S
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="brand-ripple"
                style={{
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                }}
              />
            ))}
          </div>
          <div className="brand-copy">
            <strong>School Logistics System</strong>
            <small>Student Resource Management</small>
          </div>
        </div>

        <nav className="landing-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.label}
              className="nav-link-btn"
              onClick={() => scrollToSection(item.target)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="landing-header-actions">
          <button type="button" className="nav-theme-toggle" onClick={() => setIsDarkMode((prev) => !prev)}>
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          <button type="button" className="nav-login-btn" onClick={() => navigate('/login')}>
            Login
          </button>
          <button type="button" className="nav-create-btn" onClick={() => navigate('/signup')}>
            Create Account
          </button>
        </div>
      </header>

      <section id="home" className="landing-hero">
        <div className="hero-copy">
          <div className="landing-badge">School Logistics System</div>

          <h1>
            Manage campus resources with <span>clarity and speed.</span>
          </h1>

          <p>
            A centralized platform for requesting, tracking, and distributing school resources efficiently and transparently.
          </p>

          <div className="landing-actions">
            <button type="button" className="primary-btn" onClick={() => navigate('/signup')}>
              Create Account
            </button>
            <button type="button" className="secondary-btn" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>
        </div>

        <div className="hero-visual" aria-label="Dashboard preview">
          <div className="dashboard-preview">
            <div className="preview-header">
              <span>Dashboard</span>
              <div className="preview-icons">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="preview-stats">
              <div className="stat-card">
                <small>Resources</small>
                <strong>150+</strong>
              </div>
              <div className="stat-card">
                <small>Requests</small>
                <strong>24</strong>
              </div>
              <div className="stat-card">
                <small>Approved</small>
                <strong>18</strong>
              </div>
              <div className="stat-card">
                <small>Pending</small>
                <strong>32</strong>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-bars">
                <span style={{ height: '42%' }} />
                <span style={{ height: '58%' }} />
                <span style={{ height: '76%' }} />
                <span style={{ height: '54%' }} />
                <span style={{ height: '88%' }} />
                <span style={{ height: '66%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-benefits">
        {benefitItems.map((item) => (
          <article key={item.title} className="benefit-card">
            <div className="benefit-icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section id="users" className="landing-audience">
        <h2>Who’s It For</h2>

        <div className="audience-grid">
          {audienceCards.map((card) => (
            <article key={card.title} className={`audience-card ${card.tone}`}>
              <div className="audience-avatar" aria-hidden="true" />
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="landing-key-features">
        <h2>Key Features</h2>

        <div className="feature-grid">
          {keyFeatureTiles.map((feature) => (
            <div key={feature} className="feature-tile">
              <span className="feature-check">✓</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>

    </main>
  )
}

export default LandingPage
