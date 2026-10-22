import { Link } from 'react-router-dom'
import DashboardIcon from './DashboardIcon'

// Presentation only: never load student records or mount account controls here.
export default function StudentPreviewOverview() {
  return <div className="student-preview-overview">
    <div className="overview-section-heading"><h2>Your request summary</h2><span>Totals hidden</span></div>
    <div className="dashboard-stats" aria-label="Request summary preview">
      {[
        ['Total Requests', 'navy', 'requests'], ['Pending Review', 'gold', 'history'],
        ['Approved', 'green', 'resources'], ['Released', 'blue', 'school'],
      ].map(([label, tone, icon]) => <article className={`dashboard-stat ${tone}`} key={label}>
        <div className="stat-top"><span>{label}</span><DashboardIcon name={icon} /></div>
        <strong aria-label="Hidden in preview">&mdash;</strong><small>Hidden in preview</small>
      </article>)}
    </div>
    <nav className="overview-shortcuts" aria-label="Student quick actions">
      {[
        ['resources', 'resources', 'Browse resources', 'Find what you need for school'],
        ['requests', 'requests', 'Track requests', 'Check your latest request status'],
        ['claim-schedule', 'calendar', 'Collection schedule', 'Plan your next resource pickup'],
      ].map(([path, icon, title, detail]) => <Link key={path} to={`/preview/student/${path}`}><DashboardIcon name={icon} /><span><strong>{title}</strong><small>{detail}</small></span><span aria-hidden="true">&rarr;</span></Link>)}
    </nav>
    <div className="dashboard-grid">
      <section className="dashboard-panel requests-panel">
        <div className="panel-heading"><div><span className="dashboard-kicker">Activity</span><h2>Recent Requests</h2><p>Request details are hidden.</p></div><Link to="/preview/student/requests">View layout &rarr;</Link></div>
        <div className="request-list">{[0, 1, 2].map(row => <div className="request-row" key={row}><DashboardIcon name="requests" /><div><span className="preview-placeholder" aria-hidden="true" /><small>Hidden in preview</small></div><span className="status-pill">Hidden</span></div>)}</div>
      </section>
      <section className="dashboard-panel claim-panel">
        <div className="panel-heading"><div><span className="dashboard-kicker">Next step</span><h2>Upcoming Claim</h2><p>Collection details are hidden.</p></div></div>
        <div className="student-empty-state"><DashboardIcon name="calendar" /><strong>Private collection details</strong><p>Resource, date, time, and pickup location stay hidden in this preview.</p></div>
        <Link className="panel-action" to="/preview/student/claim-schedule">View schedule layout <span>&rarr;</span></Link>
      </section>
    </div>
  </div>
}
