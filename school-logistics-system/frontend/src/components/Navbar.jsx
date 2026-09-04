import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DashboardIcon from "./DashboardIcon";
import { notificationAPI } from "../services/api";

function Navbar({ isDarkMode = false, onToggleTheme }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const displayName = user?.name || "Ramos, Markbrexsphere O.";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const workspaceLabel = user?.role === "admin" ? "Administrator Dashboard" : user?.role === "staff" ? "Staff Dashboard" : "Student Dashboard";

  useEffect(() => {
    if (!user) return;
    notificationAPI.getAll()
      .then((result) => setNotifications(result.notifications || []))
      .catch(() => setNotifications([]));
  }, [user]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

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
        <div className="notification-wrap"><button className="header-icon" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((visible) => !visible)}><DashboardIcon name="notification" />{unreadCount > 0 && <i>{unreadCount > 9 ? "9+" : unreadCount}</i>}</button>{showNotifications && <div className="notification-menu"><strong>Notifications</strong>{notifications.length ? notifications.slice(0, 5).map((notification) => <p key={notification._id}>{notification.title}: {notification.message}</p>) : <p>No notifications yet.</p>}<Link to="/claim-schedule" onClick={() => setShowNotifications(false)}>View schedule <span aria-hidden="true">→</span></Link></div>}</div>
        <div className="header-profile">{user?.avatar ? <img src={user.avatar} alt="" /> : <b>{initials}</b>}<span><strong>{displayName}</strong><small>{user?.role || "Student"}</small></span></div>
      </div>
    </header>
  );
}

export default Navbar;