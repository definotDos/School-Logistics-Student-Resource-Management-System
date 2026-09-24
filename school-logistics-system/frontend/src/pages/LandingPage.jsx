import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardIcon from '../components/DashboardIcon'
import useMobileNavigation from '../hooks/useMobileNavigation'

const THEME_KEY = 'srmsLandingTheme'


function readTheme() {
  try {
    return JSON.parse(sessionStorage.getItem(THEME_KEY) ?? 'true')
  } catch {
    return true
  }
}


const navItems = [
  { label: 'Home', target: 'top' },
  { label: 'Features', target: 'features' },
  { label: 'For Users', target: 'users' },
  { label: 'Overview', target: 'about' },
  { label: 'Contact', target: 'contact' },
]

const benefitItems = [
  { icon: 'clock', title: 'Reduce delays', text: 'Track requests and resources efficiently across the campus.' },
  { icon: 'allocation', title: 'Centralized management', text: 'Manage inventory, requests, and allocations from one place.' },
  { icon: 'speed', title: 'Fast & efficient', text: 'Save time with quick approvals and real-time campus updates.' },
  { icon: 'reports', title: 'Reports & insights', text: 'Make better decisions using easy-to-read operational data.' },
]

const audienceCards = [
  {
    title: 'Students',
    description: 'Request resources, track status, and stay updated with campus essentials.',
    tone: 'student',
    icon: 'graduate',
  },
  {
    title: 'Administrators',
    description: 'Manage users, monitor requests, and approve or reject needs efficiently.',
    tone: 'admin',
    icon: 'audit',
  },
  {
    title: 'Logistics Staff',
    description: 'Coordinate allocation, distribution, and inventory movement with clarity.',
    tone: 'staff',
    icon: 'distribution',
  },
  {
    title: 'Student Affairs',
    description: 'Review trends, support students, and keep operations organized and smooth.',
    tone: 'affairs',
    icon: 'users',
  },
]


const keyFeatureTiles = [
  { title: 'Resource Requests', icon: 'studentRequests' },
  { title: 'Inventory Management', icon: 'inventory' },
  { title: 'Claim Scheduling', icon: 'claimCalendar' },
  { title: 'Reports & Analytics', icon: 'reports' },
  { title: 'Status Tracking', icon: 'history' },
  { title: 'Notifications', icon: 'notification' },
]

const contactMembers = [
  {
    name: 'Ramos, Markbrexsphere O.',
    role: 'Fullstack, Project Manager',
    image: '/ramos-markbrexsphere.jpg',
    number: '09273249308',
    email: 'dosramos2004@gmail.com',
  },
  {
    name: 'Navarte, Grace Ann',
    role: 'Project Manager',
    email: 'grar.narvarte.up@phinmaed.com',
    number: '09102663154',
    image: '/Narvarte.png',
  },
  {
    name: 'Cabrales, Phevy Cyra',
    role: 'UI/UX Designer',
    email: 'phce.cabrales.up@phinmaed.com',
    number: '0993 761 0887',
    image: '/Cabrales.jpg.jpg',
  },
  {
    name: 'Meneses, Ashley Kate',
    role: 'UI Designer',
    email: 'aspe.meneses.up@phinmaed.com',
    number: '09923690954',
    image: '/Ashley.jpg',
  },
  {
    name: 'Fernandez, Brendan',
    role: 'System Analyst',
    email: 'brbl.fernandez.up@phinmaed.com',
    number: '0915 507 3379',
    image: '/Fernandez.jpg',
  },
  {
    name: 'Junio, Alexa Grace',
    role: 'Documentation',
    email: 'alsi.junio.up@phinmaed.com',
    number: '09127757237',
    image: '/Junio.jpg',
  },
]

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="landing-section-heading">
      <span className="landing-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState(readTheme)
  const [activeNav, setActiveNav] = useState('top')
  const { navigationOpen, setNavigationOpen, navigationRef, toggleRef } = useMobileNavigation(760)

  useEffect(() => {
    sessionStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode))
  }, [isDarkMode])

  useEffect(() => {
    const sectionIds = navItems.map((item) => item.target).filter((target) => target !== 'top')
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean)

    const updateActiveNav = () => {
      if (window.scrollY < 180) {
        setActiveNav('top')
        return
      }

      const currentSection = [...sections]
        .reverse()
        .find((section) => section.getBoundingClientRect().top <= 160)

      if (currentSection) {
        setActiveNav(currentSection.id)
      }
    }

    updateActiveNav()
    window.addEventListener('scroll', updateActiveNav, { passive: true })

    return () => window.removeEventListener('scroll', updateActiveNav)
  }, [])

  const scrollToSection = (target) => {
    setNavigationOpen(false)
    setActiveNav(target)
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'

    if (target === 'top') {
      window.scrollTo({ top: 0, behavior })
      return
    }

    const section = document.getElementById(target)
    if (section) {
      section.scrollIntoView({ behavior, block: 'start' })
    }
  }

  return (
    <main id="top" className={`landing-page landing-palette ${isDarkMode ? 'dark-mode' : ''}`}>
      <header className="landing-header" ref={navigationRef}>
        <button type="button" className="brand-wrap" onClick={() => scrollToSection('top')} aria-label="School Logistics System home">
          <span className="brand-mark landing-brand-mark">
            <img className="landing-brand-logo" src="/Logo.jpg" alt="" width="48" height="48" />
          </span>
          <span className="brand-copy">
            <strong>School Logistics System</strong>
            <small>Student Resource Management</small>
          </span>
        </button>

        <div className="landing-header-actions">
          <button ref={toggleRef} id="landing-menu-toggle" type="button" className="landing-menu-toggle" aria-expanded={navigationOpen} aria-controls="landing-navigation" aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setNavigationOpen((open) => !open)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{navigationOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
            <span>{navigationOpen ? 'Close' : 'Menu'}</span>
          </button>
          <button type="button" className="nav-theme-toggle" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setIsDarkMode((prev) => !prev)}>
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
        </div>
        <nav id="landing-navigation" className={`landing-nav ${navigationOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.label}
              className={`nav-link-btn ${activeNav === item.target ? 'is-active' : ''}`}
              onClick={() => scrollToSection(item.target)}
              aria-current={activeNav === item.target ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
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
              <span>Campus overview</span>
              <small className="preview-label">Sample dashboard</small>
              <div className="preview-icons" aria-hidden="true">
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
                <strong>50</strong>
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

            <p className="preview-chart-title">Resource activity</p>
            <div className="chart-card" aria-label="Illustrative resource activity chart">
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
        <SectionHeading eyebrow="Why use it" title="Less effort. More clarity." description="Keep everyday campus requests moving with a shared view of resources and updates." />
        <div className="benefits-grid">
          {benefitItems.map((item) => (
            <article key={item.title} className="benefit-card">
              <div className="landing-icon-badge"><DashboardIcon name={item.icon} /></div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="users" className="landing-audience">
        <SectionHeading eyebrow="For the campus" title="One place for every role" description="Students and campus teams stay connected throughout each request." />

        <div className="audience-grid">
          
          {audienceCards.map((card) => (
            <article key={card.title} className={`audience-card ${card.tone}`}>
              <div className="landing-icon-badge"><DashboardIcon name={card.icon} /></div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="landing-key-features">
        <SectionHeading eyebrow="Platform overview" title="Everything you need, together" description="Manage each step, from the first resource request to collection and reporting." />

        <div className="feature-grid">
          {keyFeatureTiles.map((feature) => (
            <div key={feature.title} className="feature-tile">
              <span className="landing-icon-badge"><DashboardIcon name={feature.icon} /></span>
              <span>{feature.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="landing-contact">
        <SectionHeading eyebrow="Get in touch" title="Meet the team" description="Have a question about the system? Reach out to the people behind it." />

        <div className="contact-grid">
          {contactMembers.map((member) => (
            <article key={member.name} className="contact-card">
              {member.image ? (
                <img src={member.image} alt={member.name} className="contact-photo" loading="lazy" width="90" height="90" />
              ) : (
                <div className="contact-avatar" aria-hidden="true" />
              )}
              <h3>{member.name}</h3>
              <p>{member.role}</p>
              {member.number || member.email ? (
                <div className="contact-details">
                  {member.number ? (
                    <a className="contact-detail-item" href={`tel:${member.number.replace(/\s/g, '')}`}>
                      <span className="contact-icon" aria-hidden="true">☎</span>
                      <span>{member.number}</span>
                    </a>
                  ) : null}
                  {member.email ? (
                    <a className="contact-detail-item" href={`mailto:${member.email}`}>
                      <span className="contact-icon" aria-hidden="true">✉</span>
                      <span>{member.email}</span>
                    </a>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div><strong>School Logistics System</strong><p>Campus resources, thoughtfully organized.</p></div>
        <button type="button" className="secondary-btn" onClick={() => scrollToSection('top')}>Back to top <span aria-hidden="true">&uarr;</span></button>
      </footer>
    </main>
  )
}

export default LandingPage
