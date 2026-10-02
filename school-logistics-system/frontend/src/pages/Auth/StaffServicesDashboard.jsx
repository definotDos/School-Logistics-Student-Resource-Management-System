import useStudentTheme from "../../hooks/useStudentTheme";
import { useTabState } from "../../hooks/useTabState";
import ProfilePanel from "../../components/ProfilePanel";
import { NotificationsPanel, ReportsPanel } from "../../components/ManagementPanels";
import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { allocationAPI, distributionAPI, notificationAPI, reportsAPI, requestAPI } from "../../services/api";
import DashboardIcon from "../../components/DashboardIcon";
import { getResourceImage } from "../../utils/resourceImages";
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
  const [isDarkMode, setIsDarkMode] = useStudentTheme();

  const activeSection = sections[requestedSection] ? requestedSection : "dashboard";
  const [rows, setRows] = useState(emptyRows);
  const [dashboardStats, setDashboardStats] = useState({ pending_requests: 0, eligible_students: 0, scheduled_claims: 0, resources_released: 0 });
  const [requests, setRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (activeSection !== "dashboard") return;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setRequestError(""); setNotice(""); } });
    reportsAPI.getDashboardOverview()
      .then((result) => {
        if (cancelled) return;
        const overview = result?.overview || result || {};
        setDashboardStats({
          pending_requests: Number(overview.pendingRequests || overview.pending_requests || 0),
          eligible_students: Number(overview.eligibleStudents || overview.eligible_students || 0),
          scheduled_claims: Number(overview.scheduledClaims || overview.scheduled_claims || 0),
          resources_released: Number(overview.resourcesReleased || overview.resources_released || 0),
        });
      })
      .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSection, revision]);

  useEffect(() => {
    let cancelled = false;
    if (!["review_requests", "approve_reject", "verify_eligibility", "update_status"].includes(activeSection)) return;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setRequestError(""); setNotice(""); } });
    requestAPI.getAll()
      .then((result) => {
        if (cancelled) return;
        const staffRequests = (result.requests || []).map((req) => ({
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
          studentName: req.student?.name || "Student",
          resourceImage: getResourceImage({ name: req.resourceName || req.resource }),
          resource: req.resourceName || req.resource,
        }));
        setRequests(staffRequests);
        setRows((current) => ({
          ...current,
            review_requests: staffRequests,
            approve_reject: staffRequests.filter((request) => request.status === "pending").map((request) => ({ ...request, action: "Approve", reason: "Pending eligibility and approval review" })),
            update_status: staffRequests.map((request) => ({ ...request, current_status: request.status, possible_statuses: request.status === "pending" ? ["approved", "rejected"] : ["claimed", "released"].includes(request.status) ? ["completed"] : [], action: "Update" })),
            verify_eligibility: staffRequests.filter((request) => request.status === "pending").map((request) => ({ ...request, name: request.student?.name || "Student", eligibility: request.eligibilityStatus === "eligible" ? "Eligible" : "Pending", action: "Verify" })),
        }));
      })
      .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSection, revision]);

  useEffect(() => {
    let cancelled = false;
    if (activeSection !== "student_history") return;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setRequestError(""); setNotice(""); } });
    requestAPI.getAll()
      .then((result) => !cancelled && setRows((current) => ({
        ...current,
        student_history: (result.requests || []).map((request) => ({
          databaseId: request.databaseId,
          name: request.student?.name || "Student",
          detail: `${request.resourceName || request.resource || "Resource"} · ${request.status}`,
          status: request.status,
          studentId: request.studentId || request.student?.studentId || "Not recorded",
          date: request.date ? new Date(request.date).toLocaleDateString() : "Not recorded",
          avatar: request.avatar || request.student?.avatar || "",
          studentName: request.student?.name || "Student",
          resource: request.resourceName || request.resource || "Resource",
          resourceImage: getResourceImage({ name: request.resourceName || request.resource }),
          action: "View History",
          claimed: ["claimed", "released", "completed"].includes(request.status) ? `${request.quantity || 1} resource(s)` : "Not claimed",
        })),
      })))
      .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSection, revision]);

  useEffect(() => {
    let cancelled = false;
    if (activeSection !== "notifications") return;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setRequestError(""); setNotice(""); } });
    notificationAPI.getAll()
      .then((result) => {
        if (cancelled) return;
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
      .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSection, revision]);

  useEffect(() => {
    let cancelled = false;
    if (activeSection === "manage_schedules") {
      queueMicrotask(() => { if (!cancelled) { setLoading(true); setRequestError(""); setNotice(""); } });
      Promise.all([allocationAPI.getByStatus("Reserved"), distributionAPI.getAllSchedules()])
        .then(([allocationResult, scheduleResult]) => {
          if (cancelled) return;
          const existing = new Set((scheduleResult.schedules || []).map((schedule) => String(schedule.allocation?._id || schedule.allocation)));
          setRows((current) => ({ ...current, manage_schedules: (allocationResult.allocations || []).filter((allocation) => !existing.has(String(allocation._id))).map((allocation) => ({
            databaseId: allocation._id,
          avatar: allocation.student?.avatar || "",
          studentName: allocation.student?.name || "Student",
          resource: allocation.resource?.name || "Resource",
          resourceImage: getResourceImage(allocation.resource),
            name: allocation.resource?.name || "Resource claim",
            detail: `${allocation.student?.name || "Student"} · ${allocation.quantity} unit(s) · ${allocation.campus || "Campus not set"}`,
            status: allocation.status,
            assigned: `${allocation.quantity} unit(s)`,
            action: "Schedule",
          })) }));
        })
        .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    }
    if (activeSection === "verify_claims") {
      queueMicrotask(() => { if (!cancelled) { setLoading(true); setRequestError(""); setNotice(""); } });
      distributionAPI.getAllSchedules()
        .then((result) => {
        if (cancelled) return;
          const claims = (result.schedules || []).map((schedule) => ({
            databaseId: schedule._id,
          avatar: schedule.student?.avatar || "",
          studentName: schedule.student?.name || "Student",
          resource: schedule.resource?.name || "Resource",
          resourceImage: getResourceImage(schedule.resource),
            allocationId: schedule.allocation?._id || schedule.allocation,
            location: schedule.location,
            quantity: schedule.allocation?.quantity || schedule.quantityClaimed || 1,
            name: schedule.resource?.name || "Resource claim",
            detail: `${schedule.student?.name || "Student"} · ${schedule.location}`,
            status: schedule.status === "Confirmed" ? "Verified" : schedule.status,
            action: schedule.status === "Scheduled" ? "Verify" : schedule.status === "Confirmed" ? "Release" : "View",
            date: schedule.pickupDate ? new Date(schedule.pickupDate).toLocaleDateString() : "Date not set",
          }));
          setRows((current) => ({ ...current, verify_claims: claims }));
        })
        .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    }
    if (activeSection === "monitor_distribution") {
      queueMicrotask(() => { if (!cancelled) { setLoading(true); setRequestError(""); setNotice(""); } });
      distributionAPI.getAll()
        .then((result) => !cancelled && setRows((current) => ({ ...current, monitor_distribution: (result.distributions || []).map((distribution) => ({
          databaseId: distribution._id,
          avatar: distribution.student?.avatar || "",
          studentName: distribution.student?.name || "Student",
          resource: distribution.resource?.name || "Resource",
          resourceImage: getResourceImage(distribution.resource),
          name: distribution.resource?.name || "Resource distribution",
          detail: `${distribution.student?.name || "Student"} · ${distribution.campus || "Campus not set"}`,
          status: distribution.status,
          released: `${distribution.quantityDelivered || 0} items`,
          pending: distribution.status === "Released" ? "0 items" : `${Math.max(0, (distribution.quantityRequested || distribution.quantity || 0) - (distribution.quantityDelivered || 0))} items`,
        })) })))
        .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [activeSection, revision]);

  const handleApproveRequest = async (databaseId) => {
    const request = rows.approve_reject.find((row) => row.databaseId === databaseId);
    try {
      setRequestError("");
      setNotice("");
      if (request.eligibilityStatus !== "eligible") throw new Error("Verify student eligibility before approving this request.");
      await requestAPI.approve(request.databaseId, {});
        setRows((current) => ({ ...current, approve_reject: current.approve_reject.filter((row) => row.databaseId !== request.databaseId) }));
      setNotice(`Request ${request.name} has been approved. Student will be notified.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleVerifyEligibility = async (databaseId) => {
    const request = rows.verify_eligibility.find((row) => row.databaseId === databaseId);
    try {
      setRequestError("");
      setNotice("");
      await requestAPI.verifyEligibility(request.databaseId, { eligible: true });
        setRows((current) => ({ ...current, verify_eligibility: current.verify_eligibility.map((row) => row.databaseId === databaseId ? { ...row, eligibility: "Eligible", eligibilityStatus: "eligible", action: "Verified" } : row) }));
      setNotice(`${request.name} eligibility was verified.`);
    } catch (error) { setRequestError(error.message); }
  };

  const handleRejectRequest = async (databaseId, reason) => {
    const request = rows.approve_reject.find((row) => row.databaseId === databaseId);
    try {
      setRequestError("");
      setNotice("");
      await requestAPI.reject(request.databaseId, { requestId: request.databaseId, rejectionReason: reason });
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
        row.databaseId === databaseId ? { ...row, status: newStatus, current_status: newStatus, possible_statuses: ["claimed", "released"].includes(newStatus) ? ["completed"] : [] } : row
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
      setRequestError("");
      setNotice("");
      if (newStatus === "rejected") throw new Error("Use Request decisions to provide a rejection reason.");
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
      setRequestError("");
      setNotice("");
      await allocationAPI.createSchedule(allocation.databaseId, schedule);
      setRows((current) => ({ ...current, manage_schedules: current.manage_schedules.filter((row) => row.databaseId !== databaseId) }));
      setNotice(`${allocation.name} was scheduled successfully.`);
      return true;
    } catch (error) { setRequestError(error.message); }
  };

  const handleClaimAction = async (databaseId) => {
    const claim = rows.verify_claims.find((row) => row.databaseId === databaseId);
    try {
      setRequestError("");
      setNotice("");
      if (claim.action === "Verify") {
        await distributionAPI.verifyClaimIdentity(claim.databaseId, { quantityClaimed: claim.quantity, verificationDetails: "Identity verified by staff." });
        setRows((current) => ({ ...current, verify_claims: current.verify_claims.map((row) => row.databaseId === databaseId ? { ...row, status: "Verified", action: "Release" } : row) }));
        setNotice(`${claim.name} was verified.`);
      } else if (claim.action === "Release") {
        await distributionAPI.release(claim.allocationId, { quantityDelivered: claim.quantity, distributionLocation: claim.location || "Student Affairs Office" });
        setRows((current) => ({ ...current, verify_claims: current.verify_claims.map((row) => row.databaseId === databaseId ? { ...row, status: "Released", action: "View" } : row) }));
        setNotice(`${claim.name} was released and recorded in distribution history.`);
      }
    } catch (error) { setRequestError(error.message); }
  };

  return (
    <div className={`admin-shell staff-services organized-workspace ${isDarkMode ? "dark-mode" : ""}`}>
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

          {requestError && <div className="staff-feedback" role="alert">{requestError}<button onClick={() => setRevision((value) => value + 1)}>Refresh data</button></div>}
          {loading && !["profile", "reports", "notifications"].includes(activeSection) && <p className="staff-loading" role="status">Loading service records?</p>}
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
          {!loading && activeSection === "verify_eligibility" && (
            <EligibilityPanel rows={rows.verify_eligibility} onAction={handleVerifyEligibility} />
          )}
          {!loading && activeSection === "review_requests" && (
            <ReviewRequestsPanel
              rows={rows.review_requests}
              requests={requests}
            />
          )}
          {!loading && activeSection === "approve_reject" && (
            <ApproveRejectPanel
              rows={rows.approve_reject}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          )}
          {!loading && activeSection === "manage_schedules" && (
            <SchedulesPanel rows={rows["manage_schedules"]} onSchedule={handleSchedule} />
          )}
          {!loading && activeSection === "verify_claims" && (
            <VerifyClaimsPanel rows={rows["verify_claims"]} onAction={handleClaimAction} />
          )}
          {!loading && activeSection === "monitor_distribution" && (
            <MonitorDistributionPanel rows={rows["monitor_distribution"]} />
          )}
          {!loading && activeSection === "student_history" && (
            <StudentHistoryPanel
              rows={rows["student_history"]}
            />
          )}
          {!loading && activeSection === "update_status" && (
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

const formatStatus = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function ActionButton({ onClick, children, disabled, className = "row-action" }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  return <button className={className} disabled={disabled || busy} onClick={async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try { await onClick(); } finally { lock.current = false; setBusy(false); }
  }}>{busy ? "Saving…" : children}</button>;
}

function RecordsPanel({ id, title, description, rows, icon = "requests", children }) {
  const [search, setSearch] = useTabState(`${id}.search`, "");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const statuses = [...new Set(rows.map((row) => row.eligibility || row.status).filter(Boolean))];
  const filtered = rows.filter((row) => (!status || (row.eligibility || row.status) === status) &&
    `${row.name} ${row.detail} ${row.studentId || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  return <section className="admin-panel record-panel staff-records" aria-labelledby={`${id}-title`}>
    <header className="record-toolbar">
      <span className="staff-panel-icon"><DashboardIcon name={icon} /></span>
      <div className="staff-panel-heading"><span className="staff-eyebrow">STUDENT SERVICES</span><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></div>
      <span className="staff-record-count">{rows.length}<small>records</small></span>
    </header>
    <div className="staff-record-filters">
      <label className="staff-search"><span>Search records</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, resource or student ID…" /></label>
      <label><span>Status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{formatStatus(value)}</option>)}</select></label>
      {(search || status) && <button className="row-action" onClick={() => { setSearch(""); setStatus(""); setPage(1); }}>Clear filters</button>}
    </div>
    <div className="record-list">
      {filtered.slice((currentPage - 1) * 10, currentPage * 10).map((row) => <div className="staff-record" key={row.databaseId}>{children(row)}</div>)}
      {!filtered.length && <div className="staff-empty"><DashboardIcon name={icon} /><h3>{rows.length ? "No matching records" : "No records to display"}</h3><p>{rows.length ? "Try another search or clear your filters." : "New records will appear here when they reach this workflow."}</p>{!rows.length && <Link to="/staff/dashboard">Back to overview</Link>}</div>}
    </div>
    <footer className="staff-record-footer"><span>{filtered.length ? `${(currentPage - 1) * 10 + 1}–${Math.min(currentPage * 10, filtered.length)} of ${filtered.length}` : "0 records"}</span><div><button className="row-action" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button className="row-action" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></footer>
  </section>;
}

function RecordImage({ src, name, kind, icon = "resources" }) {
  const [failedSource, setFailedSource] = useState(null);
  const initials = (name || "Student").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className={`staff-record-image staff-record-image--${kind}`}>
    {src && failedSource !== src ? <img src={src} alt={kind === "profile" ? `${name}'s profile picture` : name} loading="lazy" decoding="async" onError={() => setFailedSource(src)} /> : kind === "profile" ? <span aria-label={`${name}: no profile picture`}>{initials}</span> : <DashboardIcon name={icon} />}
  </span>;
}

function RecordRow({ row, icon = "requests", children, extra }) {
  const status = row.eligibility || row.current_status || row.status;
  const studentFirst = icon === "profile" || icon === "graduate";
  const resourceName = row.resource || row.name;
  const studentName = row.studentName || row.student?.name || "Student";
  const detail = row.detail?.startsWith(`${studentName} ? `) ? row.detail.slice(studentName.length + 3) : row.detail;
  return <div className="record-row staff-media-row">
    <RecordImage src={studentFirst ? row.avatar : row.resourceImage} name={studentFirst ? studentName : resourceName} kind={studentFirst ? "profile" : "resource"} icon={icon} />
    <div className="record-copy">
      <strong>{row.name}</strong>
      <div className="staff-record-person">
        <RecordImage src={studentFirst ? row.resourceImage : row.avatar} name={studentFirst ? resourceName : studentName} kind={studentFirst ? "resource" : "profile"} />
        <span>{studentFirst ? resourceName : studentName}</span>
      </div>
      <small>{detail}</small>{extra}
    </div>
    {status && <span className={`status-pill ${status.toLowerCase().replaceAll(" ", "-")}`}>{formatStatus(status)}</span>}
    <div className="staff-row-actions">{children}</div>
  </div>;
}

function RecordDetails({ row, children }) {
  return <details className="staff-details"><summary>View details</summary><div><h3>{row.name}</h3><p>{row.detail}</p><dl>{[["Student ID", row.studentId], ["Eligibility", row.eligibilityStatus], ["Status", row.status], ["Claim date", row.date], ["Claimed", row.claimed]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatStatus(String(value))}</dd></div>)}</dl>{children}</div></details>;
}

function EligibilityPanel({ rows, onAction }) {
  return <RecordsPanel id="eligibility" title="Student eligibility" description="Check student qualifications before approving a request." rows={rows} icon="graduate">{(row) => <><RecordRow row={row} icon="graduate"><ActionButton disabled={row.eligibility === "Eligible"} onClick={() => onAction(row.databaseId)}>{row.eligibility === "Eligible" ? "Verified" : "Verify eligibility"}</ActionButton></RecordRow><RecordDetails row={row} /></>}</RecordsPanel>;
}

function ReviewRequestsPanel({ rows, requests }) {
  const pending = (requests.length ? requests : rows).filter((row) => row.status === "pending");
  return <RecordsPanel id="review" title="Request review queue" description="Review pending requests and student information." rows={pending}>{(row) => <><RecordRow row={row}><Link className="row-action" to="/staff/verify_eligibility">Review eligibility</Link></RecordRow><RecordDetails row={row}><Link to="/staff/approve_reject">Go to request decisions →</Link></RecordDetails></>}</RecordsPanel>;
}

function ApproveRejectPanel({ rows, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  return <RecordsPanel id="decisions" title="Request decisions" description="Approve eligible requests or provide a reason for rejection." rows={rows} icon="audit">{(row) => <><RecordRow row={row} icon="audit" extra={<small>Eligibility: {formatStatus(row.eligibilityStatus || "pending")}</small>}>
    {row.eligibilityStatus === "eligible" ? <ActionButton className="row-action staff-approve" onClick={() => onApprove(row.databaseId)}>Approve</ActionButton> : <Link className="row-action" to="/staff/verify_eligibility">Verify eligibility</Link>}
    <button className="row-action staff-reject" onClick={() => { setRejecting(rejecting === row.databaseId ? null : row.databaseId); setReason(""); }}>Reject</button>
  </RecordRow>{rejecting === row.databaseId && <div className="staff-inline-form"><label>Reason for rejection<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the request cannot be approved." maxLength={1000} /></label><ActionButton disabled={!reason.trim()} className="row-action staff-reject" onClick={() => onReject(row.databaseId, reason.trim())}>Confirm rejection</ActionButton><button className="row-action" onClick={() => setRejecting(null)}>Cancel</button></div>}</>}</RecordsPanel>;
}

function ScheduleForm({ row, onSchedule, onCancel }) {
  const [schedule, setSchedule] = useState({ pickupDate: "", startTime: "09:00", endTime: "11:00", location: "Student Affairs Office" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return <form className="staff-inline-form" onSubmit={async (event) => {
    event.preventDefault();
    if (busy) return;
    if (schedule.endTime <= schedule.startTime) { setError("End time must be after start time."); return; }
    if (!schedule.location.trim()) { setError("Enter a pickup location."); return; }
    setError(""); setBusy(true);
    try { if (await onSchedule(row.databaseId, { ...schedule, location: schedule.location.trim() })) onCancel(); } finally { setBusy(false); }
  }}>
    {[["pickupDate", "Pickup date", "date"], ["startTime", "Start time", "time"], ["endTime", "End time", "time"], ["location", "Pickup location", "text"]].map(([key, label, type]) => <label key={key}>{label}<input type={type} min={type === "date" ? today : undefined} required value={schedule[key]} onChange={(event) => setSchedule({ ...schedule, [key]: event.target.value })} /></label>)}
    {error && <p role="alert">{error}</p>}<button className="row-action staff-primary" disabled={busy}>{busy ? "Saving…" : "Save schedule"}</button><button type="button" className="row-action" disabled={busy} onClick={onCancel}>Cancel</button>
  </form>;
}

function SchedulesPanel({ rows, onSchedule }) {
  const [selected, setSelected] = useState(null);
  return <RecordsPanel id="schedules" title="Claim schedules" description="Set pickup times for reserved allocations awaiting a schedule." rows={rows} icon="calendar">{(row) => <><RecordRow row={row} icon="calendar" extra={<small>{row.assigned} assigned</small>}><button className="row-action staff-primary" onClick={() => setSelected(selected === row.databaseId ? null : row.databaseId)}>Schedule pickup</button></RecordRow>{selected === row.databaseId && <ScheduleForm row={row} onSchedule={onSchedule} onCancel={() => setSelected(null)} />}</>}</RecordsPanel>;
}

function VerifyClaimsPanel({ rows, onAction }) {
  return <RecordsPanel id="claims" title="Student claims" description="Verify student identity, then release the allocated resources." rows={rows} icon="claimCalendar">{(row) => <><RecordRow row={row} icon="claimCalendar" extra={<small>Pickup: {row.date}</small>}>{["Verify", "Release"].includes(row.action) && <ActionButton onClick={() => onAction(row.databaseId)}>{row.action === "Verify" ? "Confirm identity" : "Release resources"}</ActionButton>}</RecordRow><RecordDetails row={row} /></>}</RecordsPanel>;
}

function MonitorDistributionPanel({ rows }) {
  return <RecordsPanel id="distribution" title="Distribution monitoring" description="Track recorded releases and outstanding quantities." rows={rows} icon="distribution">{(row) => <RecordRow row={row} icon="distribution" extra={<div className="staff-quantities"><span>Released <b>{row.released}</b></span><span>Pending <b>{row.pending}</b></span></div>} />}</RecordsPanel>;
}

function StudentHistoryPanel({ rows }) {
  return <RecordsPanel id="history" title="Student history & records" description="Search student request records and review their claim status." rows={rows} icon="history">{(row) => <><RecordRow row={row} icon="profile" extra={<small>{row.claimed}</small>} /><RecordDetails row={row} /></>}</RecordsPanel>;
}

function UpdateStatusPanel({ rows, onUpdateStatus }) {
  const [drafts, setDrafts] = useState({});
  return <RecordsPanel id="status" title="Request status" description="Save available transitions or continue through the linked workflow." rows={rows} icon="history">{(row) => {
    const available = row.possible_statuses || [];
    const selected = available.includes(drafts[row.databaseId]) ? drafts[row.databaseId] : row.current_status;
    return <RecordRow row={row} icon="history">{row.current_status === "pending" ? <Link className="row-action" to="/staff/approve_reject">Review decision</Link> : available.length ? <><select aria-label={`New status for ${row.name}`} value={selected} onChange={(event) => setDrafts({ ...drafts, [row.databaseId]: event.target.value })}><option value={row.current_status}>{formatStatus(row.current_status)}</option>{available.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select><ActionButton disabled={selected === row.current_status} onClick={() => onUpdateStatus(row.databaseId, selected)}>Save status</ActionButton></> : row.current_status === "approved" ? <Link className="row-action" to="/staff/manage_schedules">Manage schedule</Link> : row.current_status === "ready_for_claim" ? <Link className="row-action" to="/staff/verify_claims">Verify claim</Link> : <span className="staff-final-status">No further action</span>}</RecordRow>;
  }}</RecordsPanel>;
}

export default StaffServicesDashboard;
