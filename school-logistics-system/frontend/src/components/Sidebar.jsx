import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { campuses } from "../data/campuses";
import DashboardIcon from "./DashboardIcon";

const studentLinks = [
  { name: "Dashboard", path: "/student", icon: "home" },
  { name: "Browse Resources", path: "/resources", icon: "resources" },
  { name: "My Requests", path: "/requests", icon: "requests", count: 2 },
  { name: "Claim Schedule", path: "/claim-schedule", icon: "calendar" },
  {
    name: "Distribution History",
    path: "/distribution-history",
    icon: "history",
  },
];

const adminLinks = [
  { name: "Dashboard", path: "/admin", icon: "home" },
  { name: "Users", path: "/admin/users", icon: "users" },
  { name: "Resource Catalog", path: "/admin/catalog", icon: "catalog" },
  { name: "Inventory", path: "/admin/inventory", icon: "resources" },
  { name: "Requests", path: "/admin/requests", icon: "requests", count: 12 },
  { name: "Allocation", path: "/admin/allocation", icon: "requests" },
  { name: "Distribution", path: "/admin/distribution", icon: "calendar" },
  { name: "Campuses", path: "/admin/campuses", icon: "school" },
  { name: "Reports", path: "/admin/reports", icon: "history" },
  { name: "Notifications", path: "/admin/notifications", icon: "notification" },
  { name: "Audit Logs", path: "/admin/audit", icon: "requests" },
  { name: "My Profile", path: "/admin/profile", icon: "profile" },
];

const staffLinks = [
  { name: "Dashboard", path: "/staff", icon: "home" },
  { name: "Verify Eligibility", path: "/staff/verify_eligibility", icon: "users" },
  { name: "Review Requests", path: "/staff/review_requests", icon: "requests", count: 12 },
  { name: "Approve/Reject", path: "/staff/approve_reject", icon: "requests" },
  { name: "Claim Schedules", path: "/staff/manage_schedules", icon: "calendar" },
  { name: "Verify Claims", path: "/staff/verify_claims", icon: "resources" },
  { name: "Monitor Distribution", path: "/staff/monitor_distribution", icon: "calendar" },
  { name: "Student History", path: "/staff/student_history", icon: "history" },
  { name: "Update Status", path: "/staff/update_status", icon: "requests" },
  { name: "Reports", path: "/staff/reports", icon: "history" },
  { name: "Notifications", path: "/staff/notifications", icon: "notification" },
];

function CampusMark({ campus, menu = false }) {
  if (!campus.logo) return <span className={menu ? "campus-mark menu-mark" : "campus-mark"}>{campus.code}</span>;

  return <img className={menu ? "campus-logo menu-logo" : "campus-logo"} src={campus.logo} alt={`${campus.name} logo`} />;
}

function Sidebar({ type = "student" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = type === "admin" ? adminLinks : type === "staff" ? staffLinks : studentLinks;
  const [customCampuses, setCustomCampuses] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("srmsCustomCampuses") || "[]");
      const cleaned = saved.filter((campus) => campus.name !== "West Campus");
      localStorage.setItem("srmsCustomCampuses", JSON.stringify(cleaned));
      return cleaned;
    } catch {
      return [];
    }
  });
  const availableCampuses = [...campuses, ...customCampuses];
  const [selectedCampus] = useState(() => {
    const savedCampus = localStorage.getItem("srmsCampus");
    return availableCampuses.find((campus) => campus.name === (user?.campus || savedCampus)) || availableCampuses[0];
  });
  const [campusMenuOpen] = useState(false);
  const [addCampusOpen, setAddCampusOpen] = useState(false);
  const [newCampusName, setNewCampusName] = useState("");
  const [newCampusLogo, setNewCampusLogo] = useState("");
  const [campusError, setCampusError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const displayName = user?.name || "Juan Dela Cruz";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const handleCampusChange = () => {};

  const addCampus = (event) => {
    event.preventDefault();
    const name = newCampusName.trim();
    if (!name) return setCampusError("Enter a campus name.");
    if (availableCampuses.some((campus) => campus.name.toLowerCase() === name.toLowerCase())) return setCampusError("This campus is already listed.");
    const campus = { name, shortName: name, code: name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase(), logo: newCampusLogo };
    const updatedCampuses = [...customCampuses, campus];
    setCustomCampuses(updatedCampuses);
    localStorage.setItem("srmsCustomCampuses", JSON.stringify(updatedCampuses));
    handleCampusChange(campus);
    setNewCampusName("");
    setNewCampusLogo("");
    setCampusError("");
  };

  const chooseCampusLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setCampusError("Choose an image file.");
    if (file.size > 1024 * 1024) return setCampusError("Campus logos must be 1 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () => { setNewCampusLogo(reader.result); setCampusError(""); };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    logout();
    window.setTimeout(() => navigate("/login", { replace: true }), 1300);
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <img src="/SLSRMS-LOGO.jpg" alt="SLSRMS Logo" className="sidebar-brand-logo" />
        <div><strong>SRMS</strong><small>Student Resource Management</small></div>
      </div>
      <div className={`campus-switch ${campusMenuOpen ? "is-open" : ""}`}>
        <button className="campus-current" type="button" disabled aria-label={`Assigned campus: ${selectedCampus.name}`}>
          <CampusMark campus={selectedCampus} /><span className="campus-info"><b>{selectedCampus.shortName}</b><small>Student Campus</small></span><span className="campus-chevron" aria-hidden="true">⌄</span>
        </button>
        {campusMenuOpen && <div className="campus-menu" role="listbox" aria-label="Choose campus">{availableCampuses.map((campus) => <button className={campus.name === selectedCampus.name ? "selected" : ""} type="button" role="option" aria-selected={campus.name === selectedCampus.name} key={campus.name} onClick={() => handleCampusChange(campus)}><CampusMark campus={campus} menu /><b>{campus.name}</b>{campus.name === selectedCampus.name && <i aria-hidden="true">✓</i>}</button>)}<div className="campus-add-divider" />{addCampusOpen ? <form className="campus-add-form" onSubmit={addCampus}><label htmlFor="new-campus">Add campus</label><input id="new-campus" value={newCampusName} onChange={(event) => { setNewCampusName(event.target.value); setCampusError(""); }} placeholder="Campus name" autoFocus /><label className="campus-logo-upload">Campus logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseCampusLogo} /></label>{newCampusLogo && <img className="campus-logo-preview" src={newCampusLogo} alt="New campus logo preview" />}{campusError && <small>{campusError}</small>}<div><button type="button" onClick={() => setAddCampusOpen(false)}>Cancel</button><button type="submit">Add campus</button></div></form> : <button className="campus-add-button" type="button" onClick={() => setAddCampusOpen(true)}><span aria-hidden="true">+</span><b>Add another campus</b></button>}</div>}
      </div>
      <nav className="sidebar-nav">
        <p>
          {type === "admin" ? "Administration" : type === "staff" ? "Staff Services" : "Student Portal"}
        </p>

          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/student" || link.path === "/admin"}
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