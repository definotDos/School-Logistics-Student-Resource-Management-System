import { Link } from "react-router-dom";
import DashboardIcon from "./DashboardIcon";

export default function Overview({ overview, preview = false }) {
  const summary = preview ? {} : (overview || {});
  const basePath = preview ? "/preview/admin" : "/admin";
  const pendingRequests = preview ? "\u2014" : Number(summary.pendingRequests || summary.pending_requests || 0);
  const availableResources = preview ? "\u2014" : Number(summary.availableResources || summary.available_resources || 0);
  const activeUsers = preview ? "\u2014" : Number(summary.activeUsers || summary.active_users || 0);
  const scheduledClaims = preview ? "\u2014" : Number(summary.scheduledClaims || summary.scheduled_claims || 0);
  const resourcesReleased = preview ? "\u2014" : Number(summary.resourcesReleased || summary.resources_released || summary.distributions?.total || 0);
  const fulfillmentRate = preview ? "\u2014" : Number(summary.requests?.completionRate || 0);
  const approvalRate = preview ? "\u2014" : Number(summary.requests?.approvalRate || 0);
  const workflowSteps = [
    { number: "01", title: "Review requests", detail: "Check eligibility and make a decision.", href: `${basePath}/requests`, icon: "requests" },
    { number: "02", title: "Allocate resources", detail: "Match approved requests with available stock.", href: `${basePath}/allocation`, icon: "allocation" },
    { number: "03", title: "Plan collection", detail: "Set pickup details and prepare staff.", href: `${basePath}/distribution`, icon: "calendar" },
    { number: "04", title: "Review outcomes", detail: "Check fulfillment and activity history.", href: `${basePath}/reports`, icon: "reports" },
  ];

  return <div className="admin-overview">
  <section className="admin-panel" aria-labelledby="admin-workflow-title">
    <PanelHeading title="Keep the workflow moving" description="A clear handoff from request review to collection and follow-up." />
    <div className="admin-workflow-steps" id="admin-workflow-title">{workflowSteps.map((step) => <Link className="admin-workflow-step" to={step.href} key={step.number}><span className="admin-workflow-number">{step.number}</span><span className="admin-workflow-icon"><DashboardIcon name={step.icon} /></span><strong>{step.title}</strong><small>{step.detail}</small><span className="admin-workflow-link">Open step <span aria-hidden="true">→</span></span></Link>)}</div>
  </section>
  <section className="admin-metrics" aria-labelledby="admin-metrics-title"><div className="admin-section-heading"><div><h2 id="admin-metrics-title">At a glance</h2><p>Your resource operations in one place</p></div><span>Overview</span></div><div className="admin-stats"><AdminStat preview={preview} label="Pending requests" value={pendingRequests} change="Live from system" tone="orange" /><AdminStat preview={preview} label="Available resources" value={availableResources} change="Current inventory" tone="blue" /><AdminStat preview={preview} label="Active users" value={activeUsers} change="Registered accounts" tone="green" /><AdminStat preview={preview} label="Scheduled claims" value={scheduledClaims} change="Live schedule count" tone="navy" /></div></section>
  <section className="admin-panel admin-quick"><PanelHeading title="Quick actions" description="Jump straight into common administrator workflows" /><div className="quick-action-grid"><Link to={`${basePath}/requests`}><DashboardIcon name="requests" /><span>Review requests<small>Approve and verify</small></span>→</Link><Link to={`${basePath}/inventory`}><DashboardIcon name="inventory" /><span>Receive resources<small>Update stock levels</small></span>→</Link><Link to={`${basePath}/distribution`}><DashboardIcon name="calendar" /><span>Schedule distribution<small>Plan collection windows</small></span>→</Link><Link to={`${basePath}/reports`}><DashboardIcon name="reports" /><span>View analytics<small>Track performance</small></span>→</Link></div></section>
  <div className="admin-grid overview-operations">
    <section className="admin-panel overview-priorities" aria-label="Needs your attention">
      <PanelHeading title="Needs your attention" description="Review priorities and keep school operations moving." />
      <div className="attention-list">
        <Attention icon="studentRequests" title={`${pendingRequests.toLocaleString()} ${pendingRequests === 1 ? "request" : "requests"} awaiting approval`} detail="Review student eligibility and approve valid requests." action="Review requests" href={`${basePath}/requests`} />
        <Attention icon="inventory" title={`${availableResources.toLocaleString()} resources in stock`} detail="Check availability and receive incoming supplies." action="Manage inventory" href={`${basePath}/inventory`} />
        <Attention icon="claimCalendar" title={`${scheduledClaims.toLocaleString()} scheduled ${scheduledClaims === 1 ? "claim" : "claims"}`} detail="Confirm collection times and assigned staff." action="View schedule" href={`${basePath}/distribution`} />
      </div>
    </section>
    <section className="admin-panel overview-performance" aria-label="Operations snapshot">
      <PanelHeading title="Operations snapshot" description="Track request progress and completed releases." />
      <div className="overview-performance-body">
        <div className="progress-block" data-metric="fulfillment">
          <div><span className="snapshot-metric-label"><DashboardIcon name="studentRequests" /><span>Request fulfillment<small>Completed resource requests</small></span></span><strong>{fulfillmentRate}%</strong></div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-label={preview ? "Request fulfillment hidden in preview" : "Request fulfillment"} aria-valuenow={preview ? undefined : Math.min(100, Math.max(0, fulfillmentRate))}><i style={{ width: preview ? "0%" : `${Math.min(100, Math.max(0, fulfillmentRate))}%` }} /></div>
        </div>
        <div className="progress-block" data-metric="approval">
          <div><span className="snapshot-metric-label"><DashboardIcon name="audit" /><span>Approval rate<small>Requests approved for allocation</small></span></span><strong>{approvalRate}%</strong></div>
          <div className="progress green" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-label={preview ? "Approval rate hidden in preview" : "Approval rate"} aria-valuenow={preview ? undefined : Math.min(100, Math.max(0, approvalRate))}><i style={{ width: preview ? "0%" : `${Math.min(100, Math.max(0, approvalRate))}%` }} /></div>
        </div>
        <div className="overview-release-total">
          <span className="overview-release-icon" aria-hidden="true"><DashboardIcon name="inventory" /></span>
          <div><span>Resources released</span><small>Recorded releases</small></div>
          <strong>{resourcesReleased.toLocaleString()}</strong>
        </div>
      </div>
      <footer className="snapshot-footer"><span>Explore your operational performance</span><Link to={`${basePath}/reports`}>View reports <span aria-hidden="true">&rarr;</span></Link></footer>
    </section>
  </div>
</div>; }
function AdminStat({ label, value, change, tone, preview }) {
  const icon = { orange: "studentRequests", blue: "inventory", green: "users", navy: "claimCalendar" }[tone];
  return <article className={`admin-stat ${tone}`}>
    <div className="admin-stat-heading"><span>{label}</span><span className="admin-stat-icon" aria-hidden="true"><DashboardIcon name={icon} /></span></div>
    <strong>{value.toLocaleString()}</strong>
    <small>{preview ? "Hidden in preview" : change}</small>
  </article>;
}
function PanelHeading({ title, description }) { return <div className="admin-panel-heading"><div><h2>{title}</h2><p>{description}</p></div></div>; }
function Attention({ icon, title, detail, action, href }) { return <div className="attention-row" data-icon={icon}><b aria-hidden="true"><DashboardIcon name={icon} /></b><div><strong>{title}</strong><small>{detail}</small></div><Link to={href}>{action} →</Link></div>; }

