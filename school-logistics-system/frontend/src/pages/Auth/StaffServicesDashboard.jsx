import { useTabState } from "../../hooks/useTabState";
import ProfilePanel from "../../components/ProfilePanel";
import { NotificationsPanel, ReportsPanel } from "../../components/ManagementPanels";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { allocationAPI, distributionAPI, notificationAPI, reportsAPI, requestAPI } from "../../services/api";
import DashboardIcon from "../../components/DashboardIcon";
import { useAuth } from "../../context/useAuth";
import { campuses } from "../../data/campuses";
import "./StaffServicesDashboard.css";
import "./StaffMetrics.css";
import "./StaffActions.css";
import "./StaffPerformance.css";
import "./StaffQuickActions.css";

const sections = {
  profile: { label: "My Profile", title: "Staff profile", description: "Manage your personal details, photo, and verified email." },
  dashboard: { label: "Overview", title: "Staff & Services Dashboard", description: "Manage student requests, eligibility, and resource distribution." },
  verify_eligibility: { label: "Verify Eligibility", title: "Student Eligibility Review", description: "Check if students qualify to receive resources based on criteria." },
  review_requests: { label: "Review Requests", title: "Request Review Queue", description: "Review submitted requests and student information." },
  approve_reject: { label: "Approve/Reject", title: "Request Approval", description: "Approve valid requests or reject those that don't meet requirements." },
  manage_schedules: { label: "Claim Schedules", title: "Manage Claim Schedules", description: "Assign dates and times for students to claim resources." },
  verify_claims: { label: "Verify Claims", title: "Claim Verification", description: "Confirm student identity when claiming items." },
  monitor_distribution: { label: "Distribution Monitor", title: "Distribution Tracking", description: "Track resources released and those still pending." },
  student_history: { label: "Student History", title: "Student History & Records", description: "View student requests and claimed resources." },
  update_status: { label: "Update Status", title: "Request Status Management", description: "Update request status through approval workflow." },
  reports: { label: "Reports", title: "Reports & Analytics", description: "View reports on requests, approvals, and distributions." },
  notifications: { label: "Notifications", title: "Send Notifications", description: "Notify students about approvals, rejections, and schedules." },
};

const emptyRows = {
  verify_eligibility: [],
  review_requests: [],
  approve_reject: [],
  manage_schedules: [],
  verify_claims: [],
  monitor_distribution: [],
  student_history: [],
  update_status: [],
  notifications: [],
};

function StaffServicesDashboard() {
  const { user } = useAuth();
  const assignedCampus = campuses.find((campus) => campus.name === user?.campus);
  const { section: requestedSection } = useParams();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = sessionStorage.getItem("srmsStaffDashboardTheme");
    return savedTheme ? savedTheme === "dark" : false;
  });

  useEffect(() => {
    sessionStorage.setItem("srmsStaffDashboardTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const activeSection = sections[requestedSection] ? requestedSection : "dashboard";
  const [rows, setRows] = useState(emptyRows);
  const [dashboardStats, setDashboardStats] = useState({ pending_requests: 0, eligible_students: 0, scheduled_claims: 0, resources_released: 0 });
  const [requests, setRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);

  useEffect(() => {
    if (activeSection !== "dashboard") return;
    reportsAPI.getDashboardOverview()
      .then((result) => {
        const overview = result?.overview || result || {};
        setDashboardStats({
          pending_requests: Number(overview.pendingRequests || overview.pending_requests || 0),
          eligible_students: Number(overview.eligibleStudents || overview.eligible_students || 0),
          scheduled_claims: Number(overview.scheduledClaims || overview.scheduled_claims || 0),
          resources_released: Number(overview.resourcesReleased || overview.resources_released || 0),
        });
      })
      .catch((error) => setRequestError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (!["review_requests", "approve_reject", "verify_eligibility", "update_status"].includes(activeSection)) return;
      requestAPI.getAll()
      .then((result) => {
        const staffRequests = result.requests.map((req) => ({
          databaseId: req.databaseId,
          name: req.id || "Request",
          detail: `${req.student?.name || "Student"} · Student ID: ${req.studentId || req.student?.studentId || req.student?.id || "N/A"} · ${req.resourceName || req.resource || "Resource"} · Submitted ${req.date ? new Date(req.date).toLocaleDateString() : "recently"}`,
          status: req.status || "pending",
          action: "Review",
          priority: "medium",
          eligibilityStatus: req.eligibilityStatus,
          student: req.student,
          studentId: req.studentId || req.student?.studentId || req.student?.id || "N/A",
          avatar: req.avatar || req.student?.avatar || "",
          resource: req.resourceName || req.resource,
        }));
        setRequests(staffRequests);
        setRows((current) => ({
          ...current,
            review_requests: staffRequests,
            approve_reject: staffRequests.filter((request) => request.status === "pending").map((request) => ({ ...request, action: "Approve", reason: "Pending eligibility and approval review" })),
            update_status: staffRequests.map((request) => ({ ...request, current_status: request.status, possible_statuses: request.status === "pending" ? ["approved", "rejected"] : request.status === "claimed" ? ["completed"] : [], action: "Update" })),
            verify_eligibility: staffRequests.filter((request) => request.status === "pending").map((request) => ({ ...request, name: request.student?.name || "Student", eligibility: request.eligibilityStatus === "eligible" ? "Eligible" : "Pending", action: "Verify" })),
        }));
      })
      .catch((error) => setRequestError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "student_history") return;
    requestAPI.getAll()
      .then((result) => setRows((current) => ({
        ...current,
        student_history: (result.requests || []).map((request) => ({
          databaseId: request.databaseId,
          name: request.student?.name || "Student",
          detail: `${request.resourceName || request.resource || "Resource"} · ${request.status}`,
          action: "View History",
          claimed: request.status === "completed" ? `${request.quantity || 1} resource(s)` : "Not claimed",
        })),
      })))
      .catch((error) => setRequestError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "notifications") return;
    notificationAPI.getAll()
      .then((result) => {
        const notifications = (result.notifications || []).map((entry) => ({
          databaseId: entry._id,
          user: entry.user,
          name: entry.title || "Notification",
          detail: entry.message,
          type: entry.type || "general",
          status: entry.sent ? "Sent" : "Draft",
        }));
        setRows((current) => ({ ...current, notifications }));
      })
      .catch((error) => setRequestError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "manage_schedules") {
      Promise.all([allocationAPI.getByStatus("Reserved"), distributionAPI.getAllSchedules()])
        .then(([allocationResult, scheduleResult]) => {
          const existing = new Set((scheduleResult.schedules || []).map((schedule) => String(schedule.allocation?._id || schedule.allocation)));
          setRows((current) => ({ ...current, manage_schedules: (allocationResult.allocations || []).filter((allocation) => !existing.has(String(allocation._id))).map((allocation) => ({
            databaseId: allocation._id,
            name: allocation.resource?.name || "Resource claim",
            detail: `${allocation.student?.name || "Student"} · ${allocation.quantity} unit(s) · ${allocation.campus || "Campus not set"}`,
            status: allocation.status,
            assigned: `${allocation.quantity} unit(s)`,
            action: "Schedule",
          })) }));
        })
        .catch((error) => setRequestError(error.message));
    }
    if (activeSection === "verify_claims") {
      distributionAPI.getAllSchedules()
        .then((result) => {
          const claims = (result.schedules || []).map((schedule) => ({
            databaseId: schedule._id,
            allocationId: schedule.allocation?._id || schedule.allocation,
            quantity: schedule.allocation?.quantity || schedule.quantityClaimed || 1,
            name: schedule.resource?.name || "Resource claim",
            detail: `${schedule.student?.name || "Student"} · ${schedule.location}`,
            status: schedule.status === "Confirmed" ? "Verified" : schedule.status,
            action: schedule.status === "Scheduled" ? "Verify" : schedule.status === "Confirmed" ? "Release" : "View",
            date: schedule.pickupDate ? new Date(schedule.pickupDate).toLocaleDateString() : "Date not set",
          }));
          setRows((current) => ({ ...current, verify_claims: claims }));
        })
        .catch((error) => setRequestError(error.message));
    }
    if (activeSection === "monitor_distribution") {
      distributionAPI.getAll()
        .then((result) => setRows((current) => ({ ...current, monitor_distribution: (result.distributions || []).map((distribution) => ({
          databaseId: distribution._id,
          name: distribution.resource?.name || "Resource distribution",
          detail: `${distribution.student?.name || "Student"} · ${distribution.campus || "Campus not set"}`,
          status: distribution.status,
          released: `${distribution.quantityDelivered || 0} items`,
          pending: distribution.status === "Released" ? "0 items" : `${distribution.quantityRequested || distribution.quantity || 0} items`,
        })) })))
        .catch((error) => setRequestError(error.message));
    }
  }, [activeSection]);

  const handleApproveRequest = async (databaseId) => {
    const request = rows.approve_reject.find((row) => row.databaseId === databaseId);
    try {
      if (request.eligibilityStatus !== "eligible") await requestAPI.verifyEligibility(request.databaseId, { eligible: true });
      await requestAPI.approve(request.databaseId, {});
        setRows((current) => ({ ...current, approve_reject: current.approve_reject.filter((row) => row.databaseId !== request.databaseId) }));
      setNotice(`Request ${request.name} has been approved. Student will be notified.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleVerifyEligibility = async (databaseId) => {
    const request = rows.verify_eligibility.find((row) => row.databaseId === databaseId);
    try {
      await requestAPI.verifyEligibility(request.databaseId, { eligible: true });
        setRows((current) => ({ ...current, verify_eligibility: current.verify_eligibility.map((row) => row.databaseId === databaseId ? { ...row, eligibility: "Eligible", status: "Verified", action: "Verified" } : row) }));
      setNotice(`${request.name} eligibility was verified.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleRejectRequest = async (databaseId) => {
    const request = rows.approve_reject.find((row) => row.databaseId === databaseId);
    try {
      await requestAPI.reject(request.databaseId, { requestId: request.databaseId, rejectionReason: "Request did not meet the eligibility requirements." });
        setRows((current) => ({ ...current, approve_reject: current.approve_reject.filter((row) => row.databaseId !== request.databaseId) }));
      setNotice(`Request ${request.name} has been rejected. Student will be notified with reason.`);
    } catch (error) { setRequestError(error.message); }
  };

  const syncRequestStatusAcrossPanels = (databaseId, newStatus) => {
    setRows((current) => ({
      ...current,
      review_requests: current.review_requests.map((row) =>
        row.databaseId === databaseId ? { ...row, status: newStatus } : row
      ),
      approve_reject: current.approve_reject.map((row) =>
        row.databaseId === databaseId ? { ...row, status: newStatus } : row
      ),
      verify_eligibility: current.verify_eligibility.map((row) =>
        row.databaseId === databaseId ? { ...row, status: newStatus, eligibility: newStatus === "claimed" ? "Eligible" : row.eligibility } : row
      ),
      update_status: current.update_status.map((row) =>
        row.databaseId === databaseId ? { ...row, current_status: newStatus } : row
      ),
      student_history: current.student_history.map((row) =>
        row.databaseId === databaseId ? { ...row, detail: row.detail.replace(/\b(approved|rejected|ready_for_claim|claimed|released|completed)\b/i, newStatus), claimed: newStatus === "claimed" ? `${row.quantity || 1} resource(s)` : row.claimed } : row
      ),
    }));

    setRequests((current) =>
      current.map((request) =>
        request.databaseId === databaseId ? { ...request, status: newStatus } : request
      )
    );
  };

  const handleUpdateStatus = async (databaseId, newStatus) => {
    const request = rows.update_status.find((row) => row.databaseId === databaseId);
    try {
      const result = await requestAPI.updateStatus(request.databaseId, {
        status: newStatus,
        reason: `Staff updated status to ${newStatus}`,
      });

      const normalizedStatus = result.request?.status || newStatus.toLowerCase().replaceAll(" ", "_");
      syncRequestStatusAcrossPanels(request.databaseId, normalizedStatus);
      setNotice(`${request.name} status updated to ${newStatus} and saved in the database.`);
    } catch (error) {
      setRequestError(error.message);
    }
  };

  const handleSchedule = async (databaseId, schedule) => {
    const allocation = rows.manage_schedules.find((row) => row.databaseId === databaseId);
    try {
      await allocationAPI.createSchedule(allocation.databaseId, schedule);
      setRows((current) => ({ ...current, manage_schedules: current.manage_schedules.filter((row) => row.databaseId !== databaseId) }));
      setNotice(`${allocation.name} was scheduled successfully.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleClaimAction = async (databaseId) => {
    const claim = rows.verify_claims.find((row) => row.databaseId === databaseId);
    try {
      if (claim.action === "Verify") {
        await distributionAPI.verifyClaimIdentity(claim.databaseId, { quantityClaimed: claim.quantity, verificationDetails: "Identity verified by staff." });
        setRows((current) => ({ ...current, verify_claims: current.verify_claims.map((row) => row.databaseId === databaseId ? { ...row, status: "Verified", action: "Release" } : row) }));
        setNotice(`${claim.name} was verified.`);
      } else if (claim.action === "Release") {
        await distributionAPI.release(claim.allocationId, { quantityDelivered: claim.quantity, distributionLocation: "Student Affairs Office" });
        setRows((current) => ({ ...current, verify_claims: current.verify_claims.map((row) => row.databaseId === databaseId ? { ...row, status: "Released", action: "View" } : row) }));
        setNotice(`${claim.name} was released and recorded in distribution history.`);
      }
    } catch (error) { setRequestError(error.message); }
  };

  return (
    <div className={`admin-shell organized-workspace ${isDarkMode ? "dark-mode" : ""}`}>
      <Sidebar type="staff" />
      <div className="admin-content">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} />
        <main className={`admin-main ${activeSection === "reports" ? "reports-main" : activeSection === "profile" ? "profile-main staff-profile-main" : ""}`}>


          <div className="admin-topline staff-topline">
            <div>
              <span className="dashboard-kicker">Staff Services / {sections[activeSection].label}</span>
              <h1>{sections[activeSection].title}</h1>
              <p>{sections[activeSection].description}</p>
            </div>
            {user?.campus && (
              <div className="staff-heading-campus" aria-label="Assigned campus">
                {assignedCampus?.logo ? (
                  <img src={assignedCampus.logo} alt={`${assignedCampus.shortName} logo`} width="60" height="60" />
                ) : (
                  <span className="staff-heading-campus-mark" aria-hidden="true">{user.campus.slice(0, 2).toUpperCase()}</span>
                )}
                <div>
                  <small>Assigned campus</small>
                  <strong>{user.campus}</strong>
                </div>
              </div>
            )}
          </div>

          {notice && (
            <div className="admin-notice" role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Dismiss notification">
                ×
              </button>
            </div>
          )}

          {activeSection === "dashboard" && (
            <StaffOverview stats={dashboardStats} />
          )}
          {activeSection === "verify_eligibility" && (
            <EligibilityPanel rows={rows.verify_eligibility} onAction={handleVerifyEligibility} />
          )}
          {activeSection === "review_requests" && (
            <ReviewRequestsPanel
              rows={rows.review_requests}
              requests={requests}
              requestError={requestError}
            />
          )}
          {activeSection === "approve_reject" && (
            <ApproveRejectPanel
              rows={rows.approve_reject}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          )}
          {activeSection === "manage_schedules" && (
            <SchedulesPanel rows={rows["manage_schedules"]} onSchedule={handleSchedule} />
          )}
          {activeSection === "verify_claims" && (
            <VerifyClaimsPanel rows={rows["verify_claims"]} onAction={handleClaimAction} />
          )}
          {activeSection === "monitor_distribution" && (
            <MonitorDistributionPanel rows={rows["monitor_distribution"]} />
          )}
          {activeSection === "student_history" && (
            <StudentHistoryPanel
              rows={rows["student_history"]}
              selectedStudent={selectedStudentHistory}
              onSelectStudent={setSelectedStudentHistory}
            />
          )}
          {activeSection === "update_status" && (
            <UpdateStatusPanel rows={rows["update_status"]} onUpdateStatus={handleUpdateStatus} />
          )}
          {activeSection === "profile" && <ProfilePanel setNotice={setNotice} />}
          {activeSection === "reports" && <ReportsPanel setNotice={setNotice} />}
          {activeSection === "notifications" && (
            <NotificationsPanel
            />
          )}
        </main>
      </div>
    </div>
  );
}

function StaffOverview({ stats }) {
  const liveStats = {
    pending_requests: Number(stats?.pending_requests || 0),
    eligible_students: Number(stats?.eligible_students || 0),
    scheduled_claims: Number(stats?.scheduled_claims || 0),
    resources_released: Number(stats?.resources_released || 0),
  };

  return (
    <>
      <section className="staff-metrics" aria-labelledby="staff-metrics-title">
        <div className="staff-metrics-heading">
          <div><h2 id="staff-metrics-title">At a glance</h2><p>A snapshot of requests, students, and distribution.</p></div>
          <span className="staff-metrics-caption">Service overview</span>
        </div>
        <div className="staff-metrics-grid">
          <AdminStat label="Pending Requests" value={liveStats.pending_requests} change="Awaiting review" tone="amber" icon="clock" />
          <AdminStat label="Eligible Students" value={liveStats.eligible_students} change="Eligible to receive resources" tone="teal" icon="users" />
          <AdminStat label="Scheduled Claims" value={liveStats.scheduled_claims} change="Claims with an assigned schedule" tone="blue" icon="calendar" />
          <AdminStat label="Resources Released" value={liveStats.resources_released} change="Recorded distributions" tone="violet" icon="distribution" />
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
              action="Review Eligibility" href="/staff/verify_eligibility"
            />
            <Attention
              icon="audit" tone="blue" count={liveStats.scheduled_claims}
              title="Claim verification"
              status={liveStats.scheduled_claims === 1 ? "scheduled claim" : "scheduled claims"}
              detail="Confirm student identity and mark items as claimed."
              action="Verify Claims" href="/staff/verify_claims"
            />
            <Attention
              icon="distribution" tone="violet" count={liveStats.resources_released}
              title="Resource distribution"
              status={liveStats.resources_released === 1 ? "resource released" : "resources released"}
              detail="Monitor resource distribution and track pending items."
              action="Monitor Distribution" href="/staff/monitor_distribution"
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
            <span className="staff-performance-badge">Sample data</span>
          </header>
          <div className="staff-performance-list">
            {[
              { id: "fulfillment", label: "Request fulfillment", detail: "Fulfillment of student resource requests", icon: "studentRequests", tone: "blue", value: liveStats.pending_requests ? 78 : 0 },
              { id: "claims", label: "Claim completion", detail: "Completion of scheduled student claims", icon: "audit", tone: "teal", value: liveStats.scheduled_claims ? 85 : 0 },
              { id: "accuracy", label: "Distribution accuracy", detail: "Accuracy of recorded resource releases", icon: "distribution", tone: "violet", value: liveStats.resources_released ? 92 : 0 },
            ].map((metric) => (
              <div className={`staff-performance-metric staff-performance-metric--${metric.tone}`} key={metric.id}>
                <span className="staff-performance-icon"><DashboardIcon name={metric.icon} /></span>
                <div className="staff-performance-label">
                  <h3 id={`performance-${metric.id}`}>{metric.label}</h3>
                  <p>{metric.detail}</p>
                </div>
                <strong className="staff-performance-value">{metric.value}<span>%</span></strong>
                <progress aria-labelledby={`performance-${metric.id}`} value={metric.value} max="100">{metric.value}%</progress>
              </div>
            ))}
          </div>
          <footer className="staff-performance-footer">
            <p>Sample percentages are shown until live performance rates are available.</p>
            <Link to="/staff/reports" className="staff-performance-report"><DashboardIcon name="reports" />View Reports<span aria-hidden="true">&rarr;</span></Link>
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
                  <Link className={`staff-shortcut staff-shortcut--${action.tone}`} to={`/staff/${action.href}`}>
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
    </>
  );
}

function AdminStat({ label, value, change, tone, icon }) {
  return (
    <article className={`staff-metric staff-metric--${tone}`}>
      <div className="staff-metric-heading">
        <h3>{label}</h3>
        <span className="staff-metric-icon"><DashboardIcon name={icon} /></span>
      </div>
      <strong className="staff-metric-value">{value.toLocaleString()}</strong>
      <p className="staff-metric-detail"><span aria-hidden="true" />{change}</p>
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

function EligibilityPanel({ rows, onAction }) {
  const [search, setSearch] = useTabState("EligibilityPanel.search", "");
  const filteredRows = rows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Student Eligibility Verification</h2>
          <p>{rows.length} students to review</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search students..."
          aria-label="Search students"
        />
      </div>
      <div className="record-list">
        {filteredRows.map((row) => (
          <div className="record-row">
            <div className="record-icon">
              {row.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
            </div>
            <span className={`status-pill ${row.eligibility.toLowerCase()}`}>
              {row.eligibility}
            </span>
            <button
              className="row-action"
              onClick={() => onAction(row.databaseId)}
            >
              {row.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

const resourceImageByName = (name = "") => {
  const normalized = name.toLowerCase();
  if (normalized.includes("mathematics")) return "/mathematics-book.svg";
  return "";
};

const resourceInitials = (name = "Resource") => {
  const words = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]).join("").toUpperCase() || "RS";
};

function ReviewRequestsPanel({ rows, requests, requestError }) {
  const [search, setSearch] = useTabState("ReviewRequestsPanel.search", "");
  const displayRows = (requests.length > 0 ? requests : rows).filter((row) => row.status === "pending");
  const filteredRows = displayRows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Request Review Queue</h2>
          <p>{filteredRows.length} pending request{filteredRows.length === 1 ? "" : "s"} awaiting review.</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search requests..."
          aria-label="Search requests"
        />
      </div>
      {requestError && (
        <p className="auth-error" role="alert">
          {requestError}
        </p>
      )}
      <div className="record-list">
        {filteredRows.map((row, index) => {
          const resourceName = row.resourceName || row.resource || row.name || "Resource";
          const resourceImage = resourceImageByName(resourceName);
          return (
            <div className="record-row" key={index}>
              <div className="record-avatar">
                {resourceImage ? <img src={resourceImage} alt={resourceName} /> : <span>{resourceInitials(resourceName)}</span>}
              </div>
              <div className="record-copy">
                <strong>{row.name}</strong>
                <small>{row.detail}</small>
              </div>
              <span className={`status-pill ${row.status.toLowerCase()}`}>
                {row.status}
              </span>
              <span className="row-action">View details</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ApproveRejectPanel({ rows, onApprove, onReject }) {
  const [search, setSearch] = useTabState("ApproveRejectPanel.search", "");
  const filteredRows = rows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Approve or Reject Requests</h2>
          <p>{filteredRows.length} requests ready for decision</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search requests..."
          aria-label="Search requests"
        />
      </div>
      <div className="record-list">
        {filteredRows.map((row) => (
          <div className="record-row approval-row" key={row.databaseId}>
            <div className="record-icon">
              {row.status.includes("Approve") ? "✓" : "✗"}
            </div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
              <p className="approval-reason">{row.reason}</p>
            </div>
            <span className={`status-pill ${row.status.toLowerCase()}`}>
              {row.status}
            </span>
            <div className="approval-actions">
              {row.status === "pending" && (
                <button className="action-btn approve-btn" onClick={() => onApprove(row.databaseId)}>
                  Approve
                </button>
              )}
              {row.status === "pending" && (
                <button className="action-btn reject-btn" onClick={() => onReject(row.databaseId)}>
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SchedulesPanel({ rows, onSchedule }) {
  const [search, setSearch] = useTabState("SchedulesPanel.search", "");
  const [scheduleIndex, setScheduleIndex] = useState(null);
  const [schedule, setSchedule] = useState({ pickupDate: "", startTime: "09:00", endTime: "11:00", location: "Student Affairs Office" });
  const filteredRows = rows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Manage Claim Schedules</h2>
          <p>{rows.length} claim windows scheduled</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search schedules..."
          aria-label="Search schedules"
        />
      </div>
      <div className="record-list">
        {filteredRows.map((row, index) => (
          <div key={row.databaseId || index}>
          <div className="record-row">
            <div className="record-icon">◷</div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
              <p className="schedule-info">{row.assigned} assigned</p>
            </div>
            <span className={`status-pill ${row.status.toLowerCase()}`}>
              {row.status}
            </span>
            <button className="row-action" onClick={() => setScheduleIndex(scheduleIndex === row.databaseId ? null : row.databaseId)}>{row.action}</button>
          </div>
          {scheduleIndex === row.databaseId && <form className="resource-form" onSubmit={(event) => { event.preventDefault(); onSchedule(row.databaseId, schedule); setScheduleIndex(null); }}>
            <label>Date<input type="date" value={schedule.pickupDate} onChange={(event) => setSchedule((current) => ({ ...current, pickupDate: event.target.value }))} required /></label>
            <label>Start time<input type="time" value={schedule.startTime} onChange={(event) => setSchedule((current) => ({ ...current, startTime: event.target.value }))} required /></label>
            <label>End time<input type="time" value={schedule.endTime} onChange={(event) => setSchedule((current) => ({ ...current, endTime: event.target.value }))} required /></label>
            <label>Location<input value={schedule.location} onChange={(event) => setSchedule((current) => ({ ...current, location: event.target.value }))} required /></label>
            <button className="admin-primary" type="submit">Save schedule</button>
          </form>}
          </div>
        ))}
      </div>
    </section>
  );
}

function VerifyClaimsPanel({ rows, onAction }) {
  const [search, setSearch] = useTabState("VerifyClaimsPanel.search", "");
  const filteredRows = rows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Verify Student Claims</h2>
          <p>{rows.length} claims in system</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search claims..."
          aria-label="Search claims"
        />
      </div>
      <div className="record-list">
        {filteredRows.map((row) => (
          <div className="record-row" key={row.databaseId}>
            <div className={`record-icon ${row.status.toLowerCase()}`}>
              {row.status === "Verified" ? "✓" : row.status === "Pending" ? "?" : "✗"}
            </div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
              <p className="claim-date">{row.date}</p>
            </div>
            <span className={`status-pill ${row.status.toLowerCase()}`}>
              {row.status}
            </span>
            <button className="row-action" onClick={() => onAction(row.databaseId)}>
              {row.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonitorDistributionPanel({ rows }) {
  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Distribution Monitoring</h2>
          <p>{rows.length} distribution runs in progress</p>
        </div>
      </div>
      <div className="record-list">
        {rows.map((row, index) => (
          <div className="record-row distribution-row" key={index}>
            <div className={`record-icon ${row.status.toLowerCase()}`}>
              {row.status === "Released" ? "↓" : row.status === "In Progress" ? "⟳" : "⊝"}
            </div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
              <div className="distribution-stats">
                <span className="released">
                  <b>Released:</b> {row.released}
                </span>
                <span className="pending">
                  <b>Pending:</b> {row.pending}
                </span>
              </div>
            </div>
            <span className={`status-pill ${row.status.toLowerCase()}`}>
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StudentHistoryPanel({ rows, selectedStudent, onSelectStudent }) {
  const [search, setSearch] = useTabState("StudentHistoryPanel.search", "");
  const filteredRows = rows.filter((row) =>
    `${row.name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Student History & Records</h2>
          <p>{rows.length} students with records</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search students..."
          aria-label="Search students"
        />
      </div>
      <div className="record-list">
        {filteredRows.map((row) => (
          <div
            className={`record-row ${selectedStudent === row.databaseId ? "selected" : ""}`}
            key={row.databaseId}
            onClick={() => onSelectStudent(selectedStudent === row.databaseId ? null : row.databaseId)}
          >
            <div className="record-icon">
              {row.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
            </div>
            <span className="info-badge">{row.claimed}</span>
            <button className="row-action" onClick={() => onSelectStudent(row.databaseId)}>{row.action}</button>
          </div>
        ))}
      </div>

      {selectedStudent !== null && (
        <div className="history-detail">
          <h3>Request History</h3>
          <p>{rows.find((row) => row.databaseId === selectedStudent)?.detail || "No matching request history."}</p>
        </div>
      )}
    </section>
  );
}

function UpdateStatusPanel({ rows, onUpdateStatus }) {
  const [search, setSearch] = useTabState("UpdateStatusPanel.search", "");
  const [draftStatuses, setDraftStatuses] = useState({});
  const filteredRows = rows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Update Request Status</h2>
          <p>{rows.length} requests in workflow</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search requests..."
          aria-label="Search requests"
        />
      </div>
      <div className="record-list">
        {filteredRows.map((row) => {
          const selectedStatus = draftStatuses[row.databaseId] || row.current_status;
          return (
          <div className="record-row status-update-row" key={row.databaseId}>
            <div className="record-icon">⟳</div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
            </div>
            <div className="status-controls">
              <span className="current-status">{row.current_status}</span>
              <select
                value={selectedStatus}
                onChange={(e) => setDraftStatuses((current) => ({ ...current, [row.databaseId]: e.target.value }))}
                className="status-select"
              >
                <option value={row.current_status}>{row.current_status}</option>
                {row.possible_statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <button className="row-action" type="button" disabled={selectedStatus === row.current_status} onClick={() => onUpdateStatus(row.databaseId, selectedStatus)}>Save</button>
          </div>
          );
        })}
      </div>
    </section>
  );
}

export default StaffServicesDashboard;
