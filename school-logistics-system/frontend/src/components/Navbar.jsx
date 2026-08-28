import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const displayName = user?.name || "Juan Dela Cruz";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const workspaceLabel = user?.role === "admin" ? "Administrator workspace" : user?.role === "staff" ? "Staff workspace" : "Student workspace";

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    logout();
    window.setTimeout(() => navigate("/login", { replace: true }), 1300);
  };

  return (
    <header className="app-header">
      <div className="header-context"><div className="mobile-brand"><b>SL</b> SRMS</div><span>{workspaceLabel}</span></div>
      <label className="header-search"><span aria-hidden="true">⌕</span><input aria-label="Search resources and requests" placeholder="Search resources, requests..." /></label>
      <div className="header-actions">
        <div className="notification-wrap"><button className="header-icon" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((visible) => !visible)}>♢<i /></button>{showNotifications && <div className="notification-menu"><strong>Notifications</strong><p>School Uniform Set is ready for collection.</p><p>New resource requests are reviewed daily.</p><Link to="/claim-schedule" onClick={() => setShowNotifications(false)}>View schedule <span aria-hidden="true">→</span></Link></div>}</div>
        <div className="header-profile">{user?.avatar ? <img src={user.avatar} alt="" /> : <b>{initials}</b>}<span><strong>{displayName}</strong><small>{user?.role || "Student"}</small></span></div>
        <button onClick={handleLogout} className="logout-button" disabled={isLoggingOut}>{isLoggingOut ? "Signing out..." : "Logout"}</button>
      </div>
      {isLoggingOut && <div className="logout-notice" role="status"><span className="logout-spinner" aria-hidden="true" /> <span><strong>Signed out successfully</strong><small>Please come back soon.</small></span></div>}
    </header>
  );
}

export default Navbar;