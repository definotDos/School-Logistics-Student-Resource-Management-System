import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DashboardIcon from "./DashboardIcon";
import { notificationAPI, searchAPI } from "../services/api";

function Navbar({ isDarkMode = false, onToggleTheme }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const displayName = user?.name || "User";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const workspaceLabel = user?.role === "admin" ? "Administrator Dashboard" : user?.role === "staff" ? "Staff Dashboard" : "Student Dashboard";

  useEffect(() => {
    if (!user) return;
    const load = () => notificationAPI.getAll()
      .then((result) => setNotifications(result.notifications || []))
      .catch((error) => setSearchError(error.message));
    load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("notifications-updated", load);
    return () => { window.clearInterval(timer); window.removeEventListener("notifications-updated", load); };
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (query.trim().length < 2) { setResults([]); return; }
      setSearching(true); setSearchError("");
      searchAPI.search(query, controller.signal).then(r => { if (!controller.signal.aborted) setResults(r.results); }).catch(e => { if (!controller.signal.aborted) setSearchError(e.message); }).finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const markRead = async (notification) => {
    try {
      await notificationAPI.markRead(notification._id);
      setNotifications(current => current.map(n => n._id === notification._id ? { ...n, read: true } : n));
    } catch (error) { setSearchError(error.message); }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <header className="app-header">
      <div className="header-context"><div className="mobile-brand"><b>SL</b> SRMS</div><span>{workspaceLabel}</span></div>
      <div className="header-search-wrap"><label className="header-search"><span aria-hidden="true">⌕</span><input aria-label="Search resources and requests" placeholder="Search records…" value={query} onChange={e => setQuery(e.target.value)} /></label>
        {query.trim().length >= 2 && <div className="search-results" aria-live="polite">{searchError ? <p role="alert">{searchError}</p> : searching ? <p>Searching…</p> : results.length ? results.map(r => <Link key={`${r.type}-${r.id}`} to={r.url} onClick={() => setQuery("")}><strong>{r.type}: {r.title}</strong><small>{r.detail}</small></Link>) : <p>No matching records.</p>}</div>}
      </div>
      <div className="header-actions">
        {onToggleTheme && (
          <button type="button" className="header-theme-toggle" onClick={onToggleTheme}>
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </button>
        )}
        <div className="notification-wrap"><button className="header-icon" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((visible) => !visible)}><DashboardIcon name="notification" />{unreadCount > 0 && <i>{unreadCount > 9 ? "9+" : unreadCount}</i>}</button>{showNotifications && <div className="notification-menu"><strong>Notifications</strong>{notifications.length ? notifications.slice(0, 5).map((notification) => <div key={notification._id}><p>{notification.title}: {notification.message}</p>{!notification.read && <button onClick={() => markRead(notification)}>Mark read</button>}</div>) : <p>No notifications yet.</p>}<Link to={user?.role === "admin" ? "/admin/distribution" : user?.role === "staff" ? "/staff/manage_schedules" : "/claim-schedule"} onClick={() => setShowNotifications(false)}>View schedule <span aria-hidden="true">→</span></Link></div>}</div>
        <div className="header-profile">{user?.avatar ? <img src={user.avatar} alt="" /> : <b>{initials}</b>}<span><strong>{displayName}</strong><small>{user?.role || "Student"}</small></span></div>
      </div>
    </header>
  );
}

export default Navbar;
