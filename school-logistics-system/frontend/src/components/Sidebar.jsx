import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { campusAPI } from "../services/api";
import DashboardIcon from "./DashboardIcon";
import { campuses as campusDirectory } from "../data/campuses";

const studentLinks = [
  { name: "Dashboard", path: "/student", icon: "home" },
  { name: "Browse Resources", path: "/resources", icon: "browse" },
  { name: "My Requests", path: "/requests", icon: "studentRequests" },
  { name: "Claim Schedule", path: "/claim-schedule", icon: "claimCalendar" },
  {
    name: "Distribution History",
    path: "/distribution-history",
    icon: "distributionHistory",
  },
];

const adminLinks = [
  { name: "Dashboard", path: "/admin", icon: "home" },
  { name: "Users", path: "/admin/users", icon: "users" },
  { name: "Resource Catalog", path: "/admin/catalog", icon: "catalog" },
  { name: "Inventory", path: "/admin/inventory", icon: "resources" },
  { name: "Requests", path: "/admin/requests", icon: "requests" },
  { name: "Allocation", path: "/admin/allocation", icon: "requests" },
  { name: "Distribution", path: "/admin/distribution", icon: "calendar" },
  { name: "Campuses", path: "/admin/campuses", icon: "school" },
  { name: "Reports", path: "/admin/reports", icon: "history" },
  { name: "Notifications", path: "/admin/notifications", icon: "notification" },
  { name: "Audit Logs", path: "/admin/audit", icon: "requests" },
  { name: "My Profile", path: "/admin/profile", icon: "profile" },
];

const staffLinks = [
  { name: "My Profile", path: "/staff/profile", icon: "profile" },
  { name: "Dashboard", path: "/staff", icon: "home" },
  { name: "Verify Eligibility", path: "/staff/verify_eligibility", icon: "users" },
  { name: "Review Requests", path: "/staff/review_requests", icon: "requests" },
  { name: "Approve/Reject", path: "/staff/approve_reject", icon: "requests" },
  { name: "Claim Schedules", path: "/staff/manage_schedules", icon: "calendar" },
  { name: "Verify Claims", path: "/staff/verify_claims", icon: "resources" },
  { name: "Monitor Distribution", path: "/staff/monitor_distribution", icon: "calendar" },
  { name: "Student History", path: "/staff/student_history", icon: "history" },
  { name: "Update Status", path: "/staff/update_status", icon: "requests" },
  { name: "Reports", path: "/staff/reports", icon: "history" },
  { name: "Notifications", path: "/staff/notifications", icon: "notification" },
];

function Sidebar({ type = "student" }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const links = type === "admin" ? adminLinks : type === "staff" ? staffLinks : studentLinks;
  const [availableCampuses, setAvailableCampuses] = useState([]);
  const [campusError, setCampusError] = useState("");
  const [campusBusy, setCampusBusy] = useState(false);
  useEffect(() => {
    const load = () => campusAPI.getAll().then(r => setAvailableCampuses(r.campuses)).catch(e => setCampusError(e.message));
    load(); window.addEventListener("campuses-updated", load);
    return () => window.removeEventListener("campuses-updated", load);
  }, []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const displayName = user?.name || "User";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const assignedCampus = campusDirectory.find((campus) => campus.name === user?.campus);

  const handleCampusChange = async (event) => {
    setCampusBusy(true); setCampusError("");
    try { await updateUser({ activeCampus: event.target.value }); }
    catch (e) { setCampusError(e.message); } finally { setCampusBusy(false); }
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    logout();
    window.setTimeout(() => navigate("/login", { replace: true }), 1300);
  };

  return (
    <aside className={`app-sidebar ${navigationOpen ? "navigation-open" : ""}`}>
      <button type="button" className="sidebar-mobile-toggle" aria-expanded={navigationOpen} aria-controls="workspace-navigation" onClick={() => setNavigationOpen((open) => !open)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{navigationOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg><span>{navigationOpen ? "Close navigation" : "Navigation menu"}</span>
      </button>
      <div className="sidebar-brand">
        <img src="/SLSRMS-LOGO.jpg" alt="SLSRMS Logo" className="sidebar-brand-logo" />
        <div><strong>SRMS</strong><small>Student Resource Management</small></div>
      </div>
      <div className="campus-switch">
        {user?.role === "admin" ? <label>Active campus<select aria-label="Active campus" value={user.activeCampus || ""} disabled={campusBusy} onChange={handleCampusChange}><option value="">All campuses</option>{availableCampuses.map(c => <option key={c._id} value={c.name}>{c.name}{c.status === "inactive" ? " (inactive)" : ""}</option>)}</select></label> : <div className="campus-current">{assignedCampus?.logo ? <img src={assignedCampus.logo} alt={`${assignedCampus.shortName} logo`} className="campus-logo campus-current-logo" /> : <span className="campus-mark">{user?.campus?.slice(0, 2).toUpperCase()}</span>}<span className="campus-info"><b>{user?.campus}</b><small>Assigned campus</small></span></div>}
        {campusError && <small role="alert">{campusError}</small>}
      </div>
      <nav className="sidebar-nav" id="workspace-navigation" aria-label={`${type} navigation`}>
        <p>
          {type === "admin" ? "Administration" : type === "staff" ? "Staff Services" : "Navigation menu"}
        </p>

          {(type === "student" ? [{ title: "Overview", items: links.slice(0, 1) }, { title: "Resources & requests", items: links.slice(1, 3) }, { title: "Collections", items: links.slice(3) }] : [{ title: "", items: links }]).map((group) => <div className={type === "student" ? "student-navigation-group" : undefined} key={group.title}>
          {group.title && <h2 className="student-navigation-label">{group.title}</h2>}
          {group.items.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/student" || link.path === "/admin" || link.path === "/staff"}
              onClick={() => setNavigationOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
              aria-label={link.name}
            >
              <span className="nav-icon"><DashboardIcon name={link.icon} /></span>
              <span className="sidebar-label">{link.name}</span>
              {link.count && <em>{link.count}</em>}
            </NavLink>
          ))}
          </div>)}
        <button className="sidebar-logout" type="button" onClick={handleLogout} disabled={isLoggingOut}>
          <span className="nav-icon" aria-hidden="true">↪</span>
          <span className="sidebar-label">{isLoggingOut ? "Signing out..." : "Logout"}</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <button>◌ Help and Support</button><button>⚙ Settings</button>
        <div className="sidebar-user">{user?.avatar ? <img src={user.avatar} alt="" /> : <b>{initials}</b>}<span><strong>{displayName}</strong><small>{type === "admin" ? "Administrator" : type === "staff" ? "Staff Member" : `${user?.grade || "Grade 11"} | ${user?.strand || "STEM"}`}</small></span></div>
      </div>
      {isLoggingOut && <div className="logout-notice" role="status"><span className="logout-spinner" aria-hidden="true" /><span><strong>Signed out successfully</strong><small>Please come back soon.</small></span></div>}
    </aside>
  );
}

export default Sidebar;
