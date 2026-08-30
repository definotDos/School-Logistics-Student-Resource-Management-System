import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DashboardIcon from "./DashboardIcon";

function Navbar({ isDarkMode = false, onToggleTheme }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const displayName = user?.name || "Ramos, Markbrexsphere O.";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const workspaceLabel = user?.role === "admin" ? "Administrator Dashboard" : user?.role === "staff" ? "Staff Dashboard" : "Student Dashboard";

  return (
    <header className="app-header">
      <div className="header-context"><div className="mobile-brand"><b>SL</b> SRMS</div><span>{workspaceLabel}</span></div>
      <label className="header-search"><span aria-hidden="true">⌕</span><input aria-label="Search resources and requests" placeholder="Search resources, requests..." /></label>
      <div className="header-actions">
        {onToggleTheme && (
          <button type="button" className="header-theme-toggle" onClick={onToggleTheme}>
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </button>
        )}
        <div className="notification-wrap"><button className="header-icon" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((visible) => !visible)}><DashboardIcon name="notification" /><i /></button>{showNotifications && <div className="notification-menu"><strong>Notifications</strong><p>School Uniform Set is ready for collection.</p><p>New resource requests are reviewed daily.</p><Link to="/claim-schedule" onClick={() => setShowNotifications(false)}>View schedule <span aria-hidden="true">→</span></Link></div>}</div>
        <div className="header-profile">{user?.avatar ? <img src={user.avatar} alt="" /> : <b>{initials}</b>}<span><strong>{displayName}</strong><small>{user?.role || "Student"}</small></span></div>
      </div>
    </header>
  );
}

export default Navbar;