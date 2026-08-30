import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { requestAPI } from "../../services/api";
import DashboardIcon from "../../components/DashboardIcon";
import "./StaffServicesDashboard.css";

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

const initialRows = {
  verify_eligibility: [
    { name: "Maria Santos", detail: "ID: 2024-001 · Grade 12 · Main Campus", eligibility: "Eligible", action: "Review", status: "Verified" },
    { name: "Joshua Reyes", detail: "ID: 2024-002 · Grade 11 · North Campus", eligibility: "Eligible", action: "Review", status: "Pending" },
    { name: "Ana Cruz", detail: "ID: 2024-003 · Grade 10 · South Campus", eligibility: "Not Eligible", action: "Review", status: "Rejected" },
  ],
  review_requests: [
    { name: "REQ-2024-0157", detail: "Maria Santos · Learning Module Pack · Submitted 2 hours ago", status: "Pending", action: "Review", priority: "high" },
    { name: "REQ-2024-0158", detail: "Joshua Reyes · School Uniform Set · Submitted 4 hours ago", status: "Pending", action: "Review", priority: "medium" },
    { name: "REQ-2024-0156", detail: "Ana Cruz · School Shoes · Submitted 1 day ago", status: "Under Review", action: "Continue", priority: "high" },
  ],
  approve_reject: [
    { name: "REQ-2024-0155", detail: "John Doe · Mathematics Books · Reviewed by Staff", status: "Ready to Approve", action: "Approve", reason: "Meets all criteria" },
    { name: "REQ-2024-0154", detail: "Jane Smith · Uniform Set · Reviewed by Staff", status: "Ready to Reject", action: "Reject", reason: "Does not meet age requirement" },
  ],
  manage_schedules: [
    { name: "Claim Window A", detail: "Nov 15, 2024 · 9:00 AM - 12:00 PM · Main Campus", status: "Scheduled", assigned: "45 students", action: "Edit" },
    { name: "Claim Window B", detail: "Nov 18, 2024 · 1:00 PM - 4:00 PM · North Campus", status: "Scheduled", assigned: "32 students", action: "Edit" },
    { name: "Claim Window C", detail: "Nov 20, 2024 · 10:00 AM - 2:00 PM · South Campus", status: "Draft", assigned: "0 students", action: "Publish" },
  ],
  verify_claims: [
    { name: "CLAIM-0001", detail: "Maria Santos · Learning Module Pack · Scheduled Nov 15", status: "Verified", action: "Mark Complete", date: "Nov 15 9:30 AM" },
    { name: "CLAIM-0002", detail: "Joshua Reyes · Uniform Set · Scheduled Nov 18", status: "Pending", action: "Verify", date: "Nov 18 1:15 PM" },
    { name: "CLAIM-0003", detail: "Ana Cruz · School Shoes · Scheduled Nov 20", status: "No-Show", action: "Reschedule", date: "Nov 20 (Missed)" },
  ],
  monitor_distribution: [
    { name: "Distribution Run A", detail: "Nov 15, 2024 · Main Campus · Learning Materials", status: "Released", released: "156 items", pending: "12 items" },
    { name: "Distribution Run B", detail: "Nov 18, 2024 · North Campus · Uniforms & Footwear", status: "In Progress", released: "89 items", pending: "34 items" },
    { name: "Distribution Run C", detail: "Nov 20, 2024 · South Campus · ID Cards", status: "Pending", released: "0 items", pending: "78 items" },
  ],
  student_history: [
    { name: "Maria Santos (ID: 2024-001)", detail: "4 requests submitted · 3 approved · 1 pending", action: "View History", claimed: "3 resources" },
    { name: "Joshua Reyes (ID: 2024-002)", detail: "2 requests submitted · 2 approved · 0 pending", action: "View History", claimed: "2 resources" },
  ],
  update_status: [
    { name: "REQ-2024-0157", detail: "Maria Santos · Learning Module Pack", current_status: "Pending", possible_statuses: ["Approved", "Ready for Claim", "Released"], action: "Update" },
    { name: "REQ-2024-0158", detail: "Joshua Reyes · Uniform Set", current_status: "Approved", possible_statuses: ["Ready for Claim", "Released", "Rejected"], action: "Update" },
    { name: "REQ-2024-0159", detail: "Ana Cruz · School Shoes", current_status: "Ready for Claim", possible_statuses: ["Released", "Rejected"], action: "Update" },
  ],
  notifications: [
    { name: "Approval Notification", detail: "Sent to 45 students · Today, 08:30", status: "Sent", action: "View", type: "Approval" },
    { name: "Claim Schedule Alert", detail: "Sent to 32 students · Yesterday, 16:10", status: "Draft", action: "Send", type: "Schedule" },
    { name: "Resource Ready Alert", detail: "Ready to send to 67 students", status: "Draft", action: "Send", type: "Availability" },
  ],
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
  const [rows, setRows] = useState(initialRows);
  const [requests, setRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);

  useEffect(() => {
    if (activeSection !== "review_requests") return;
    requestAPI.getAll()
      .then((result) => {
        const staffRequests = result.requests.map((req) => ({
          databaseId: req.id,
          name: `REQ-${req.id?.slice(-6).toUpperCase()}`,
          detail: `${req.studentName || "Student"} · ${req.resourceName || "Resource"} · Submitted ${req.submittedAt || "recently"}`,
          status: req.status || "Pending",
          action: "Review",
          priority: "medium",
        }));
        setRequests(staffRequests);
      })
      .catch((error) => setRequestError(error.message));
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

  const handleApproveRequest = (index) => {
    const request = rows.approve_reject[index];
    setRows((current) => ({
      ...current,
      approve_reject: current.approve_reject.map((row, i) =>
        i === index ? { ...row, status: "Approved", action: "Done" } : row
      ),
    }));
    setNotice(`Request ${request.name} has been approved. Student will be notified.`);
  };

  const handleRejectRequest = (index) => {
    const request = rows.approve_reject[index];
    setRows((current) => ({
      ...current,
      approve_reject: current.approve_reject.map((row, i) =>
        i === index ? { ...row, status: "Rejected", action: "Done" } : row
      ),
    }));
    setNotice(`Request ${request.name} has been rejected. Student will be notified with reason.`);
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

  return (
    <div className={`admin-shell ${isDarkMode ? "dark-mode" : ""}`}>
      <Sidebar type="admin" />
      <div className="admin-content">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} />
        <main className={`admin-main ${activeSection === "reports" ? "reports-main" : ""}`}>
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
            <StaffOverview setNotice={setNotice} />
          )}
          {activeSection === "verify_eligibility" && (
            <EligibilityPanel rows={rows.verify_eligibility} onAction={completeAction} />
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
            <SchedulesPanel rows={rows.manage_schedules} onAction={completeAction} />
          )}
          {activeSection === "verify_claims" && (
            <VerifyClaimsPanel rows={rows.verify_claims} onAction={completeAction} />
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

function StaffOverview({ setNotice }) {
  const stats = {
    pending_requests: 48,
    eligible_students: 342,
    scheduled_claims: 127,
    resources_released: 89,
  };

  return (
    <>
      <div className="admin-stats">
        <AdminStat label="Pending Requests" value={stats.pending_requests} change="Awaiting review" tone="orange" />
        <AdminStat label="Eligible Students" value={stats.eligible_students} change="Ready for approval" tone="green" />
        <AdminStat label="Scheduled Claims" value={stats.scheduled_claims} change="This week" tone="blue" />
        <AdminStat label="Resources Released" value={stats.resources_released} change="Distributed" tone="navy" />
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
              title="12 requests awaiting verification"
              detail="Review student eligibility and approve valid requests."
              action="Review Eligibility"
              href="/staff/verify_eligibility"
            />
            <Attention
              icon="✓"
              title="8 claims pending verification"
              detail="Confirm student identity and mark items as claimed."
              action="Verify Claims"
              href="/staff/verify_claims"
            />
            <Attention
              icon="◷"
              title="2 distributions in progress"
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
              <strong>78%</strong>
            </div>
            <div className="progress">
              <i style={{ width: "78%" }} />
            </div>
          </div>
          <div className="progress-block">
            <div>
              <span>Claim completion rate</span>
              <strong>85%</strong>
            </div>
            <div className="progress green">
              <i style={{ width: "85%" }} />
            </div>
          </div>
          <div className="progress-block">
            <div>
              <span>Distribution accuracy</span>
              <strong>92%</strong>
            </div>
            <div className="progress green">
              <i style={{ width: "92%" }} />
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
          <div className="record-row" key={index}>
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
              onClick={() => onAction("verify_eligibility", index, "Review")}
            >
              {row.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

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
        {filteredRows.map((row, index) => (
          <div className="record-row" key={index}>
            <div className="record-icon">
              {row.priority === "high" ? "!" : "•"}
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
        ))}
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

function SchedulesPanel({ rows, onAction }) {
  const [search, setSearch] = useState("");
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
          <div className="record-row" key={index}>
            <div className="record-icon">◷</div>
            <div className="record-copy">
              <strong>{row.name}</strong>
              <small>{row.detail}</small>
              <p className="schedule-info">{row.assigned} assigned</p>
            </div>
            <span className={`status-pill ${row.status.toLowerCase()}`}>
              {row.status}
            </span>
            <button
              className="row-action"
              onClick={() => onAction("manage_schedules", index, row.action)}
            >
              {row.action}
            </button>
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
          onClick={() => setNotice("Request summary report generated.")}
        />
        <ReportCard
          title="Approval Analytics"
          description="Track approval patterns and staff performance metrics"
          action="Generate"
          onClick={() => setNotice("Approval analytics report generated.")}
        />
        <ReportCard
          title="Distribution Report"
          description="Monitor resource distribution and claim completion"
          action="Generate"
          onClick={() => setNotice("Distribution report generated.")}
        />
        <ReportCard
          title="Student Eligibility Report"
          description="Analysis of student eligibility and qualification trends"
          action="Generate"
          onClick={() => setNotice("Eligibility report generated.")}
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
