import { Link } from "react-router-dom";
import DashboardIcon from "./DashboardIcon";

export default function StaffOverview({ stats, preview = false }) {
  const basePath = preview ? "/preview/staff" : "/staff";
  const liveStats = {
    pending_requests: preview ? "\u2014" : Number(stats?.pending_requests || 0),
    eligible_students: preview ? "\u2014" : Number(stats?.eligible_students || 0),
    scheduled_claims: preview ? "\u2014" : Number(stats?.scheduled_claims || 0),
    resources_released: preview ? "\u2014" : Number(stats?.resources_released || 0),
  };

  return (
    <div className="staff-overview">
      <section className="staff-metrics" aria-labelledby="staff-metrics-title">
        <div className="staff-metrics-heading">
          <div><h2 id="staff-metrics-title">At a glance</h2><p>A snapshot of requests, students, and distribution.</p></div>
          <span className="staff-metrics-caption">Service overview</span>
        </div>
        <div className="staff-metrics-grid">
          <AdminStat preview={preview} label="Pending Requests" value={liveStats.pending_requests} change="Awaiting review" tone="amber" icon="clock" />
          <AdminStat preview={preview} label="Eligible Students" value={liveStats.eligible_students} change="Eligible to receive resources" tone="teal" icon="users" />
          <AdminStat preview={preview} label="Scheduled Claims" value={liveStats.scheduled_claims} change="Claims with an assigned schedule" tone="blue" icon="calendar" />
          <AdminStat preview={preview} label="Resources Released" value={liveStats.resources_released} change="Recorded distributions" tone="violet" icon="distribution" />
        </div>
      </section>

      <div className="admin-grid">
        <section className="admin-panel staff-actions" aria-labelledby="staff-actions-title">
          <header className="staff-actions-heading">
            <div>
              <span className="staff-actions-eyebrow">WORK QUEUE</span>
              <h2 id="staff-actions-title">Immediate Actions</h2>
              <p>Review requests, verify claims, and track distribution.</p>
            </div>
            <span className="staff-actions-summary">3 workflows</span>
          </header>
          <ul className="staff-actions-list">
            <Attention
              icon="studentRequests" tone="amber" count={liveStats.pending_requests}
              title="Eligibility review"
              status={liveStats.pending_requests === 1 ? "request awaiting review" : "requests awaiting review"}
              detail="Review student eligibility and approve valid requests."
              action="Review Eligibility" href={`${basePath}/verify_eligibility`}
            />
            <Attention
              icon="audit" tone="blue" count={liveStats.scheduled_claims}
              title="Claim verification"
              status={liveStats.scheduled_claims === 1 ? "scheduled claim" : "scheduled claims"}
              detail="Confirm student identity and mark items as claimed."
              action="Verify Claims" href={`${basePath}/verify_claims`}
            />
            <Attention
              icon="distribution" tone="violet" count={liveStats.resources_released}
              title="Resource distribution"
              status={liveStats.resources_released === 1 ? "resource released" : "resources released"}
              detail="Monitor resource distribution and track pending items."
              action="Monitor Distribution" href={`${basePath}/monitor_distribution`}
            />
          </ul>
        </section>

        <section className="admin-panel staff-performance" aria-labelledby="staff-performance-title">
          <header className="staff-performance-heading">
            <div>
              <span className="staff-performance-eyebrow">SERVICE PERFORMANCE</span>
              <h2 id="staff-performance-title">Performance Metrics</h2>
              <p>Request, claim, and distribution performance.</p>
            </div>
              <span className="staff-performance-badge">{preview ? "Hidden in preview" : "Awaiting live metrics"}</span>
          </header>
          <div className="staff-performance-list">
            {[
              { id: "fulfillment", label: "Request fulfillment", detail: "Live rate will appear in Reports when available", icon: "studentRequests", tone: "blue" },
              { id: "claims", label: "Claim completion", detail: "Live rate will appear in Reports when available", icon: "audit", tone: "teal" },
              { id: "accuracy", label: "Distribution accuracy", detail: "Live rate will appear in Reports when available", icon: "distribution", tone: "violet" },
            ].map((metric) => (
              <div className={`staff-performance-metric staff-performance-metric--${metric.tone}`} key={metric.id}>
                <span className="staff-performance-icon"><DashboardIcon name={metric.icon} /></span>
                <div className="staff-performance-label">
                  <h3 id={`performance-${metric.id}`}>{metric.label}</h3>
                  <p>{preview ? "Details hidden in preview" : metric.detail}</p>
                </div>
                <strong className="staff-performance-value">—</strong>
                <div className="dashboard-progress" aria-hidden="true"><i style={{ width: "0%" }} /></div>
              </div>
            ))}
          </div>
          <footer className="staff-performance-footer">
            <p>{preview ? "Performance details are hidden in this preview." : "Performance rates are not available yet. Use the live request and distribution counts above to manage today’s work."}</p>
            <Link to={`${basePath}/reports`} className="staff-performance-report"><DashboardIcon name="reports" />View Reports<span aria-hidden="true">&rarr;</span></Link>
          </footer>
        </section>
      </div>

      <section className="admin-panel staff-shortcuts" aria-labelledby="staff-shortcuts-title">
        <header className="staff-shortcuts-heading">
          <div>
            <span className="staff-shortcuts-eyebrow">WORKSPACE TOOLS</span>
            <h2 id="staff-shortcuts-title">Staff Quick Actions</h2>
            <p>Choose a workflow to keep student services moving.</p>
          </div>
          <span className="staff-shortcuts-caption">6 shortcuts</span>
        </header>
        {[
          { id: "requests", title: "Requests & eligibility", description: "Review qualifications and make request decisions.", actions: [
            { href: "verify_eligibility", title: "Verify Eligibility", detail: "Check student qualifications", icon: "graduate", tone: "amber" },
            { href: "review_requests", title: "Review Requests", detail: "Examine submitted requests", icon: "studentRequests", tone: "amber" },
            { href: "approve_reject", title: "Approve / Reject", detail: "Process request decisions", icon: "audit", tone: "amber" },
          ] },
          { id: "claims", title: "Claims & distribution", description: "Coordinate collection and track resource releases.", actions: [
            { href: "manage_schedules", title: "Manage Schedules", detail: "Assign student claim times", icon: "calendar", tone: "blue" },
            { href: "verify_claims", title: "Verify Claims", detail: "Confirm student identity", icon: "claimCalendar", tone: "blue" },
            { href: "monitor_distribution", title: "Monitor Distribution", detail: "Track resource releases", icon: "distribution", tone: "violet" },
          ] },
        ].map((group) => (
          <section className="staff-shortcuts-group" key={group.id} aria-labelledby={`shortcuts-${group.id}`}>
            <div className="staff-shortcuts-group-heading">
              <h3 id={`shortcuts-${group.id}`}>{group.title}</h3>
              <p>{group.description}</p>
            </div>
            <ul className="staff-shortcuts-grid">
              {group.actions.map((action) => (
                <li key={action.href}>
                  <Link className={`staff-shortcut staff-shortcut--${action.tone}`} to={`${basePath}/${action.href}`}>
                    <span className="staff-shortcut-icon"><DashboardIcon name={action.icon} /></span>
                    <span className="staff-shortcut-copy"><strong>{action.title}</strong><small>{action.detail}</small></span>
                    <span className="staff-shortcut-arrow" aria-hidden="true">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </div>
  );
}

function AdminStat({ label, value, change, tone, icon, preview }) {
  return (
    <article className={`staff-metric staff-metric--${tone}`}>
      <div className="staff-metric-heading">
        <h3>{label}</h3>
        <span className="staff-metric-icon"><DashboardIcon name={icon} /></span>
      </div>
      <strong className="staff-metric-value">{value.toLocaleString()}</strong>
      <p className="staff-metric-detail"><span aria-hidden="true" />{preview ? "Hidden in preview" : change}</p>
    </article>
  );
}

function Attention({ icon, tone, count, title, status, detail, action, href }) {
  return (
    <li className={`staff-action staff-action--${tone}`}>
      <span className="staff-action-icon"><DashboardIcon name={icon} /></span>
      <div className="staff-action-body">
        <h3>{title}</h3>
        <p className="staff-action-status"><strong>{count.toLocaleString()}</strong> {status}</p>
        <p className="staff-action-detail">{detail}</p>
      </div>
      <Link className="staff-action-link" to={href}>{action}<span aria-hidden="true">&rarr;</span></Link>
    </li>
  );
}

