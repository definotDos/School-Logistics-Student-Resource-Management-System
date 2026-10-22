import { Link, NavLink, useParams } from 'react-router-dom'
import DashboardIcon from '../components/DashboardIcon'
import AdminOverview from '../components/AdminOverview'
import StaffOverview from '../components/StaffOverview'
import StudentPreviewOverview from '../components/StudentPreviewOverview'
import useStudentTheme from '../hooks/useStudentTheme'
import useMobileNavigation from '../hooks/useMobileNavigation'
import './Auth/AdminDashboard.css'
import './AdminPreview.css'

// Public presentation only. Do not mount authenticated panels or load operational data here.
const adminGroups = [
  { title: 'Overview', items: [['dashboard', 'Dashboard', 'overview'], ['notifications', 'Notifications', 'notification']] },
  { title: 'Resource management', items: [['catalog', 'Resource catalog', 'catalog'], ['inventory', 'Inventory', 'inventory'], ['requests', 'Requests', 'studentRequests'], ['allocation', 'Allocation', 'allocation'], ['distribution', 'Distribution', 'distribution']] },
  { title: 'Administration', items: [['users', 'Users', 'users'], ['campuses', 'Campuses', 'school'], ['reports', 'Reports', 'reports'], ['audit', 'Audit logs', 'audit']] },
  { title: 'Account', items: [['profile', 'My profile', 'profile']] },
]
const staffGroups = [
  { title: 'Overview', items: [['dashboard', 'Dashboard', 'overview'], ['notifications', 'Notifications', 'notification']] },
  { title: 'Requests & eligibility', items: [['review_requests', 'Review Requests', 'studentRequests'], ['verify_eligibility', 'Verify Eligibility', 'users'], ['approve_reject', 'Approve / Reject', 'audit'], ['update_status', 'Update Status', 'requests']] },
  { title: 'Claims & distribution', items: [['manage_schedules', 'Claim Schedules', 'claimCalendar'], ['verify_claims', 'Verify Claims', 'audit'], ['monitor_distribution', 'Monitor Distribution', 'distribution']] },
  { title: 'Records & reports', items: [['student_history', 'Student History', 'distributionHistory'], ['reports', 'Reports', 'reports']] },
  { title: 'Account', items: [['profile', 'My Profile', 'profile']] },
]
const studentGroups = [
  { title: 'Overview', items: [['dashboard', 'Dashboard', 'home'], ['notifications', 'Notifications', 'notification']] },
  { title: 'Resources & requests', items: [['resources', 'Browse Resources', 'browse'], ['requests', 'My Requests', 'studentRequests']] },
  { title: 'Collections', items: [['claim-schedule', 'Claim Schedule', 'claimCalendar'], ['distribution-history', 'Distribution History', 'distributionHistory']] },
  { title: 'Account', items: [['profile', 'My Profile', 'profile']] },
]
const studentColumns = { resources: ['Resource', 'Category', 'Availability'], requests: ['Resource', 'Date requested', 'Status', 'Next step'], 'claim-schedule': ['Resource', 'Pickup date', 'Time', 'Location', 'Status'], 'distribution-history': ['Resource', 'Quantity', 'Collection date', 'Status'] }
const staffColumns = { review_requests: 'requests', verify_eligibility: 'requests', approve_reject: 'requests', update_status: 'requests', manage_schedules: 'distribution', verify_claims: 'distribution', monitor_distribution: 'distribution', student_history: 'requests' }
const columns = {
  notifications: ['Notification', 'Recipient', 'Date', 'Status'],
  catalog: ['Resource', 'Category', 'Campus', 'Status'],
  inventory: ['Resource', 'Available stock', 'Reserved', 'Campus'],
  requests: ['Request', 'Student', 'Resource', 'Status'],
  allocation: ['Student', 'Resource', 'Quantity', 'Assigned staff'],
  distribution: ['Resource', 'Recipient', 'Collection date', 'Location', 'Status'],
  users: ['Name', 'Email', 'Role', 'Campus', 'Status'],
  campuses: ['Campus', 'Location', 'Contact', 'Status'],
  reports: ['Report', 'Period', 'Campus', 'Total'],
  audit: ['Activity', 'Performed by', 'Date', 'Details'],
}


function PlaceholderPanel({ section, title, student = false }) {
  const headers = (student && studentColumns[section]) || columns[section]
  return <section className="admin-panel preview-panel">
    <h2>{title}</h2>
    <p>Private details are hidden in this preview.</p>
    <div className="preview-table-wrap"><table>
      <thead><tr>{headers.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{[0, 1, 2, 3].map(row => <tr key={row}>{headers.map(label => <td key={label}><span className="preview-placeholder" aria-hidden="true" /><span className="preview-sr-only">Hidden in preview</span></td>)}</tr>)}</tbody>
    </table></div>
  </section>
}

export default function AdminPreview({ role = 'admin' }) {
  const isStudent = role === 'student'
  const isStaff = role === 'staff'
  const roleLabel = isStudent ? 'Student' : isStaff ? 'Staff' : 'Admin'
  const groups = isStudent ? studentGroups : isStaff ? staffGroups : adminGroups
  const previewPath = key => `/preview/${role}${key === 'dashboard' ? '' : `/${key}`}`
  const { section = 'dashboard' } = useParams()
  const [isDarkMode, setIsDarkMode] = useStudentTheme()
  const { navigationOpen, setNavigationOpen, navigationRef, toggleRef } = useMobileNavigation(760)
  const [active, title, icon] = groups.flatMap(group => group.items).find(([key]) => key === section) || groups[0].items[0]

  return <div className={`admin-shell organized-workspace management-theme landing-background admin-campus-theme admin-public-preview ${isStudent ? "student-preview" : ""} ${isStaff ? "staff-services" : ""} ${isDarkMode ? "dark-mode" : ""}`}>
    <aside ref={navigationRef} className={`app-sidebar glass-navigation ${isStaff ? "staff-sidebar" : ""} ${navigationOpen ? "navigation-open" : ""}`}>
      <button ref={toggleRef} type="button" className="sidebar-mobile-toggle" aria-expanded={navigationOpen} aria-controls="admin-preview-navigation" onClick={() => setNavigationOpen(open => !open)}>{navigationOpen ? "Close navigation" : "Navigation menu"}</button>
      <Link to="/" className="sidebar-brand"><img src="/logo-transparent.png" alt="" width="44" height="44" /><div><strong>SRMS</strong><small>Student Resource Management</small></div></Link>
      <div className="campus-switch"><label>Active campus<select disabled aria-label="Active campus hidden in preview"><option>Campus details hidden</option></select></label></div>
      <nav className="sidebar-nav" id="admin-preview-navigation" aria-label={`${roleLabel} preview navigation`}>{groups.map(group => <div className="navigation-group admin-navigation-group" key={group.title}>
        <h2 className="navigation-label admin-navigation-label">{group.title}</h2>
        {group.items.map(([key, label, itemIcon]) => <NavLink key={key} to={previewPath(key)} end className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={() => setNavigationOpen(false)}><span className="nav-icon"><DashboardIcon name={itemIcon} /></span><span className="sidebar-label">{label}</span></NavLink>)}
      </div>)}</nav>
      <Link className="preview-back" to="/">← Back to home</Link>
    </aside>
    <div className="admin-content">
      <header className="app-header"><div className="header-context"><span className="dashboard-kicker">School Logistics System</span><strong>{isStudent ? "Student Dashboard" : isStaff ? "Staff & Services Dashboard" : "Administrator Dashboard"}</strong></div><div className="header-actions"><button type="button" className="header-theme-toggle" onClick={() => setIsDarkMode(value => !value)}>{isDarkMode ? 'Light mode' : 'Dark mode'}</button><Link className="header-icon" to={previewPath('notifications')} aria-label="Preview notifications"><DashboardIcon name="notification" /></Link><Link className="header-profile" to={previewPath('profile')}><b><DashboardIcon name="profile" /></b><span><strong>{roleLabel} preview</strong><small>Details hidden</small></span></Link></div></header>
      <main className="admin-main">
        <div className="preview-notice"><DashboardIcon name="audit" /><div><strong>Layout preview only</strong><p>Explore the dashboard sections. Personal details and operational records are hidden, and changes are disabled.</p></div><Link to="/login">Sign in</Link></div>
        <div className="admin-topline"><div className="admin-title-copy"><span className="dashboard-kicker">{isStudent ? "Student Portal" : isStaff ? "Staff & Services" : "Administration"} / {title}</span><h1>{active === 'dashboard' ? `Welcome back, ${roleLabel}!` : title}</h1><p>{active === 'dashboard' ? 'A view of school resource operations.' : 'Private details are hidden in this preview.'}</p></div><div className="admin-campus-context"><span className="admin-context-icon"><DashboardIcon name="school" /></span><div><small>Campus workspace</small><strong>Details hidden</strong></div></div></div>
        {active === 'dashboard' ? (isStudent ? <StudentPreviewOverview /> : isStaff ? <StaffOverview preview /> : <AdminOverview preview />) : active === 'profile' ? <section className="admin-panel preview-panel"><h2><DashboardIcon name={icon} /> {isStudent ? "Student" : isStaff ? "Staff" : "Administrator"} profile</h2><p>Profile details and account settings are private.</p><div className="preview-profile">{['Profile picture', 'Full name', 'Email address', isStudent ? 'Student ID' : 'Employee ID', 'Campus', ...(isStudent ? ['Program', 'Year / Grade level'] : ['Role'])].map(label => <div key={label}><strong>{label}</strong><span className="preview-placeholder" aria-hidden="true" /><small>Hidden in preview</small></div>)}</div><button type="button" disabled>Edit profile (preview only)</button></section> : <PlaceholderPanel student={isStudent} section={isStaff ? (staffColumns[active] || active) : active} title={title} />}
      </main>
    </div>
  </div>
}
