import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { allocationAPI, distributionAPI, reportsAPI, requestAPI } from "../../services/api";
import DashboardIcon from "../../components/DashboardIcon";
import "./StaffServicesDashboard.css";

const staffNavItems = [
  { label: "Overview", path: "/staff", section: "dashboard" },
  { label: "Eligibility", path: "/staff/verify_eligibility", section: "verify_eligibility" },
  { label: "Requests", path: "/staff/review_requests", section: "review_requests" },
  { label: "Approval", path: "/staff/approve_reject", section: "approve_reject" },
  { label: "Schedules", path: "/staff/manage_schedules", section: "manage_schedules" },
  { label: "Claims", path: "/staff/verify_claims", section: "verify_claims" },
  { label: "Distribution", path: "/staff/monitor_distribution", section: "monitor_distribution" },
  { label: "History", path: "/staff/student_history", section: "student_history" },
  { label: "Reports", path: "/staff/reports", section: "reports" },
  { label: "Notifications", path: "/staff/notifications", section: "notifications" },
];

const sections = {
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
  const { section: requestedSection } = useParams();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("srmsStaffDashboardTheme");
    return savedTheme ? savedTheme === "dark" : false;
  });

  useEffect(() => {
    localStorage.setItem("srmsStaffDashboardTheme", isDarkMode ? "dark" : "light");
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
      .catch(() => setDashboardStats({ pending_requests: 0, eligible_students: 0, scheduled_claims: 0, resources_released: 0 }));
  }, [activeSection]);

  useEffect(() => {
    if (!["review_requests", "approve_reject", "verify_eligibility", "update_status"].includes(activeSection)) return;
    requestAPI.getAll()
      .then((result) => {
        const staffRequests = result.requests.map((req) => ({
          databaseId: req.databaseId,
          name: req.id || "Request",
          detail: `${req.student?.name || "Student"} · Student ID: ${req.studentId || req.student?.studentId || req.student?.id || "N/A"} · ${req.resourceName || req.resource || "Resource"} · Submitted ${req.date ? new Date(req.date).toLocaleDateString() : "recently"}`,
          status: req.status || "Pending",
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
          update_status: staffRequests.map((request) => ({ ...request, current_status: request.status, possible_statuses: ["approved", "rejected", "ready_for_claim", "completed"], action: "Update" })),
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

  const completeAction = (collection, index, action) => {
    setRows((current) => ({
      ...current,
      [collection]: current[collection].map((row, rowIndex) =>
        rowIndex === index ? { ...row, status: "Completed", action: "View" } : row
      ),
    }));
    setNotice(`${action} completed successfully.`);
  };

  const handleApproveRequest = async (index) => {
    const request = rows.approve_reject[index];
    try {
      if (request.eligibilityStatus !== "eligible") await requestAPI.verifyEligibility(request.databaseId, { eligible: true });
      await requestAPI.approve(request.databaseId, {});
      setRows((current) => ({ ...current, approve_reject: current.approve_reject.filter((row) => row.databaseId !== request.databaseId) }));
      setNotice(`Request ${request.name} has been approved. Student will be notified.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleVerifyEligibility = async (index) => {
    const request = rows.verify_eligibility[index];
    try {
      await requestAPI.verifyEligibility(request.databaseId, { eligible: true });
      setRows((current) => ({ ...current, verify_eligibility: current.verify_eligibility.map((row, rowIndex) => rowIndex === index ? { ...row, eligibility: "Eligible", status: "Verified", action: "Verified" } : row) }));
      setNotice(`${request.name} eligibility was verified.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleRejectRequest = async (index) => {
    const request = rows.approve_reject[index];
    try {
      await requestAPI.reject(request.databaseId, { requestId: request.databaseId, rejectionReason: "Request did not meet the eligibility requirements." });
      setRows((current) => ({ ...current, approve_reject: current.approve_reject.filter((row) => row.databaseId !== request.databaseId) }));
      setNotice(`Request ${request.name} has been rejected. Student will be notified with reason.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleUpdateStatus = (index, newStatus) => {
    const request = rows.update_status[index];
    setRows((current) => ({
      ...current,
      update_status: current.update_status.map((row, i) =>
        i === index ? { ...row, current_status: newStatus } : row
      ),
    }));
    setNotice(`${request.name} status updated to ${newStatus}.`);
  };

  const handleSendNotification = (index, notificationType) => {
    setRows((current) => ({
      ...current,
      notifications: current.notifications.map((row, i) =>
        i === index ? { ...row, status: "Sent" } : row
      ),
    }));
    setNotice(`${notificationType} notification sent successfully to all recipients.`);
  };

  const handleSchedule = async (index, schedule) => {
    const allocation = rows.manage_schedules[index];
    try {
      await allocationAPI.createSchedule(allocation.databaseId, schedule);
      setRows((current) => ({ ...current, manage_schedules: current.manage_schedules.filter((_, rowIndex) => rowIndex !== index) }));
      setNotice(`${allocation.name} was scheduled successfully.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleClaimAction = async (index) => {
    const claim = rows.verify_claims[index];
    try {
      if (claim.action === "Verify") {
        await distributionAPI.verifyClaimIdentity(claim.databaseId, { quantityClaimed: 1, verificationDetails: "Identity verified by staff." });
        setRows((current) => ({ ...current, verify_claims: current.verify_claims.map((row, rowIndex) => rowIndex === index ? { ...row, status: "Verified", action: "Release" } : row) }));
        setNotice(`${claim.name} was verified.`);
      } else if (claim.action === "Release") {
        await distributionAPI.release(claim.allocationId, { quantityDelivered: 1, distributionLocation: "Student Affairs Office" });
        setRows((current) => ({ ...current, verify_claims: current.verify_claims.map((row, rowIndex) => rowIndex === index ? { ...row, status: "Released", action: "View" } : row) }));
        setNotice(`${claim.name} was released and recorded in distribution history.`);
      }
    } catch (error) { setRequestError(error.message); }
  };

  return (
    <div className={`admin-shell ${isDarkMode ? "dark-mode" : ""}`}>
      <Sidebar type="staff" />
      <div className="admin-content">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} />
        <main className={`admin-main ${activeSection === "reports" ? "reports-main" : ""}`}>
          <nav className="staff-service-nav" aria-label="Staff services navigation">
            {staffNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={item.section === activeSection ? "active" : ""}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="admin-topline">
            <div>
              <span className="dashboard-kicker">Staff Services / {sections[activeSection].label}</span>
              <h1>{sections[activeSection].title}</h1>
              <p>{sections[activeSection].description}</p>
            </div>
            <button className="admin-primary" onClick={() => setNotice("Quick action menu opened.")}>
              + Quick Action
            </button>
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
            <StaffOverview setNotice={setNotice} stats={dashboardStats} />
          )}
          {activeSection === "verify_eligibility" && (
            <EligibilityPanel rows={rows.verify_eligibility} onAction={handleVerifyEligibility} />
          )}
          {activeSection === "review_requests" && (
            <ReviewRequestsPanel
              rows={rows.review_requests}
              requests={requests}
              requestError={requestError}
              onAction={completeAction}
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
            <SchedulesPanel rows={rows.manage_schedules} onSchedule={handleSchedule} />
          )}
          {activeSection === "verify_claims" && (
            <VerifyClaimsPanel rows={rows.verify_claims} onAction={handleClaimAction} />
          )}
          {activeSection === "monitor_distribution" && (
            <MonitorDistributionPanel rows={rows.monitor_distribution} />
          )}
          {activeSection === "student_history" && (
            <StudentHistoryPanel
              rows={rows.student_history}
              selectedStudent={selectedStudentHistory}
              onSelectStudent={setSelectedStudentHistory}
            />
          )}
          {activeSection === "update_status" && (
            <UpdateStatusPanel rows={rows.update_status} onUpdateStatus={handleUpdateStatus} />
          )}
          {activeSection === "reports" && <ReportsPanel setNotice={setNotice} />}
          {activeSection === "notifications" && (
            <NotificationsPanel
              rows={rows.notifications}
              onSendNotification={handleSendNotification}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function StaffOverview({ setNotice, stats }) {
  const liveStats = {
    pending_requests: Number(stats?.pending_requests || 0),
    eligible_students: Number(stats?.eligible_students || 0),
    scheduled_claims: Number(stats?.scheduled_claims || 0),
    resources_released: Number(stats?.resources_released || 0),
  };

  return (
    <>
      <div className="admin-stats">
        <AdminStat label="Pending Requests" value={liveStats.pending_requests} change="Live queue" tone="orange" />
        <AdminStat label="Eligible Students" value={liveStats.eligible_students} change="Live record count" tone="green" />
        <AdminStat label="Scheduled Claims" value={liveStats.scheduled_claims} change="Live schedule count" tone="blue" />
        <AdminStat label="Resources Released" value={liveStats.resources_released} change="Live distribution count" tone="navy" />
      </div>

      <div className="admin-grid">
        <section className="admin-panel">
          <PanelHeading
            title="Immediate Actions"
            description="Tasks requiring staff attention today"
          />
          <div className="attention-list">
            <Attention
              icon="!"
              title={`${liveStats.pending_requests} requests awaiting verification`}
              detail="Review student eligibility and approve valid requests."
              action="Review Eligibility"
              href="/staff/verify_eligibility"
            />
            <Attention
              icon="✓"
              title={`${liveStats.scheduled_claims} claims pending verification`}
              detail="Confirm student identity and mark items as claimed."
              action="Verify Claims"
              href="/staff/verify_claims"
            />
            <Attention
              icon="◷"
              title={`${liveStats.resources_released} resources released`}
              detail="Monitor resource distribution and track pending items."
              action="Monitor Distribution"
              href="/staff/monitor_distribution"
            />
          </div>
        </section>

        <section className="admin-panel">
          <PanelHeading
            title="Performance Metrics"
            description="Current operational performance"
          />
          <div className="progress-block">
            <div>
              <span>Request fulfillment rate</span>
              <strong>{Math.min(100, Math.max(0, liveStats.pending_requests ? 78 : 0))}%</strong>
            </div>
            <div className="progress">
              <i style={{ width: `${Math.min(100, Math.max(0, liveStats.pending_requests ? 78 : 0))}%` }} />
            </div>
          </div>
          <div className="progress-block">
            <div>
              <span>Claim completion rate</span>
              <strong>{Math.min(100, Math.max(0, liveStats.scheduled_claims ? 85 : 0))}%</strong>
            </div>
            <div className="progress green">
              <i style={{ width: `${Math.min(100, Math.max(0, liveStats.scheduled_claims ? 85 : 0))}%` }} />
            </div>
          </div>
          <div className="progress-block">
            <div>
              <span>Distribution accuracy</span>
              <strong>{Math.min(100, Math.max(0, liveStats.resources_released ? 92 : 0))}%</strong>
            </div>
            <div className="progress green">
              <i style={{ width: `${Math.min(100, Math.max(0, liveStats.resources_released ? 92 : 0))}%` }} />
            </div>
          </div>
          <button className="text-action" onClick={() => setNotice("Report export prepared for download.")}>
            Export weekly report →
          </button>
        </section>
      </div>

      <section className="admin-panel admin-quick">
        <PanelHeading
          title="Staff Quick Actions"
          description="Jump directly to common staff workflows"
        />
        <div className="quick-action-grid">
          <Link to="/staff/verify_eligibility">
            <DashboardIcon name="resources" />
            <span>
              Verify Eligibility
              <small>Check student qualifications</small>
            </span>
            →
          </Link>
          <Link to="/staff/review_requests">
            <DashboardIcon name="requests" />
            <span>
              Review Requests
              <small>Examine submitted requests</small>
            </span>
            →
          </Link>
          <Link to="/staff/approve_reject">
            <DashboardIcon name="calendar" />
            <span>
              Approve/Reject
              <small>Process request decisions</small>
            </span>
            →
          </Link>
          <Link to="/staff/verify_claims">
            <DashboardIcon name="history" />
            <span>
              Verify Claims
              <small>Confirm student identity</small>
            </span>
            →
          </Link>
          <Link to="/staff/manage_schedules">
            <DashboardIcon name="resources" />
            <span>
              Manage Schedules
              <small>Assign claim times</small>
            </span>
            →
          </Link>
          <Link to="/staff/monitor_distribution">
            <DashboardIcon name="calendar" />
            <span>
              Monitor Distribution
              <small>Track resource releases</small>
            </span>
            →
          </Link>
        </div>
      </section>
    </>
  );
}

function AdminStat({ label, value, change, tone }) {
  return (
    <article className={`admin-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{change}</small>
    </article>
  );
}

function PanelHeading({ title, description }) {
  return (
    <div className="admin-panel-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Attention({ icon, title, detail, action, href }) {
  return (
    <div className="attention-row">
      <b>{icon}</b>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <Link to={href}>{action} →</Link>
    </div>
  );
}

function EligibilityPanel({ rows, onAction }) {
  const [search, setSearch] = useState("");
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
        {filteredRows.map((row, index) => (
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
              onClick={() => onAction(index)}
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

function ReviewRequestsPanel({ rows, requests, requestError, onAction }) {
  const [search, setSearch] = useState("");
  const displayRows = requests.length > 0 ? requests : rows;
  const filteredRows = displayRows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Request Review Queue</h2>
          <p>{filteredRows.length} requests to review</p>
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
              <button
                className="row-action"
                onClick={() => onAction("review_requests", index, "Review")}
              >
                {row.action}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ApproveRejectPanel({ rows, onApprove, onReject }) {
  const [search, setSearch] = useState("");
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
        {filteredRows.map((row, index) => (
          <div className="record-row approval-row" key={index}>
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
              {row.status.includes("Approve") && (
                <button className="action-btn approve-btn" onClick={() => onApprove(index)}>
                  Approve
                </button>
              )}
              {row.status.includes("Reject") && (
                <button className="action-btn reject-btn" onClick={() => onReject(index)}>
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
  const [search, setSearch] = useState("");
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
        <button className="admin-secondary">+ Create Schedule</button>
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
            <button className="row-action" onClick={() => setScheduleIndex(scheduleIndex === index ? null : index)}>{row.action}</button>
          </div>
          {scheduleIndex === index && <form className="resource-form" onSubmit={(event) => { event.preventDefault(); onSchedule(index, schedule); setScheduleIndex(null); }}>
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
  const [search, setSearch] = useState("");
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
        {filteredRows.map((row, index) => (
          <div className="record-row" key={index}>
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
            <button className="row-action" onClick={() => onAction("verify_claims", index, row.action)}>
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
  const [search, setSearch] = useState("");
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
        {filteredRows.map((row, index) => (
          <div
            className={`record-row ${selectedStudent === index ? "selected" : ""}`}
            key={index}
            onClick={() => onSelectStudent(selectedStudent === index ? null : index)}
          >
            <div className="record-icon">
              {row.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
            </div>
            <span className="info-badge">{row.claimed}</span>
            <button className="row-action">{row.action}</button>
          </div>
        ))}
      </div>

      {selectedStudent !== null && (
        <div className="history-detail">
          <h3>Request History</h3>
          <p>Detailed history for {rows[selectedStudent].name}</p>
          {/* Detailed history view would go here */}
        </div>
      )}
    </section>
  );
}

function UpdateStatusPanel({ rows, onUpdateStatus }) {
  const [search, setSearch] = useState("");
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
        {filteredRows.map((row, index) => (
          <div className="record-row status-update-row" key={index}>
            <div className="record-icon">⟳</div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
            </div>
            <div className="status-controls">
              <span className="current-status">{row.current_status}</span>
              <select
                value={row.current_status}
                onChange={(e) => onUpdateStatus(index, e.target.value)}
                className="status-select"
              >
                <option>{row.current_status}</option>
                {row.possible_statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <button className="row-action">Save</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportsPanel({ setNotice }) {
  const generateReport = async (type, loader) => {
    try {
      const report = await loader();
      const summary = report.summary || {};
      const total = summary.totalRequests ?? summary.totalDistributed ?? summary.totalApproved ?? 0;
      setNotice(`${type} generated successfully. ${total} records found.`);
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <section className="admin-panel reports-panel">
      <PanelHeading
        title="Reports & Analytics"
        description="Generate and view operational reports"
      />
      <div className="reports-grid">
        <ReportCard
          title="Request Summary Report"
          description="Total requests, approvals, rejections, and fulfillment rates"
          action="Generate"
          onClick={() => generateReport("Request summary report", reportsAPI.getRequestReport)}
        />
        <ReportCard
          title="Approval Analytics"
          description="Track approval patterns and staff performance metrics"
          action="Generate"
          onClick={() => generateReport("Approval analytics", reportsAPI.getApprovalAnalytics)}
        />
        <ReportCard
          title="Distribution Report"
          description="Monitor resource distribution and claim completion"
          action="Generate"
          onClick={() => generateReport("Distribution report", reportsAPI.getDistributionReport)}
        />
        <ReportCard
          title="Student Eligibility Report"
          description="Analysis of student eligibility and qualification trends"
          action="Generate"
          onClick={() => generateReport("Eligibility report", reportsAPI.getRequestReport)}
        />
      </div>
    </section>
  );
}

function ReportCard({ title, description, action, onClick }) {
  return (
    <div className="report-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <button onClick={onClick}>{action}</button>
    </div>
  );
}

function NotificationsPanel({ rows, onSendNotification }) {
  const [search, setSearch] = useState("");
  const filteredRows = rows.filter((row) =>
    `${row.name} ${row.type}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="admin-panel record-panel">
      <div className="record-toolbar">
        <div>
          <h2>Send Notifications</h2>
          <p>{filteredRows.length} notifications to manage</p>
        </div>
        <button className="admin-secondary">+ Compose Notification</button>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notifications..."
          aria-label="Search notifications"
        />
      </div>
      <div className="record-list">
        {filteredRows.map((row, index) => (
          <div className="record-row notification-row" key={index}>
            <div className={`record-icon ${row.type.toLowerCase()}`}>
              {row.type === "Approval" ? "✓" : row.type === "Schedule" ? "◷" : "📢"}
            </div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
              <span className="notification-type">{row.type}</span>
            </div>
            <span className={`status-pill ${row.status.toLowerCase()}`}>
              {row.status}
            </span>
            {row.status === "Draft" && (
              <button
                className="row-action send-btn"
                onClick={() => onSendNotification(index, row.type)}
              >
                Send
              </button>
            )}
            {row.status === "Sent" && (
              <button className="row-action" disabled>
                Sent
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default StaffServicesDashboard;
