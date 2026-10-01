import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DashboardIcon from "./DashboardIcon";
import StaffNotifications from "./StaffNotifications";
import StudentNotifications from "./StudentNotifications";
import { notificationAPI, searchAPI } from "../services/api";

function Navbar({ isDarkMode = false, onToggleTheme }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const isStudent = user?.role === "student";
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const [notificationsLoading, setNotificationsLoading] = useState(true);
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
      .then((result) => { setNotifications(result.notifications); setNotificationError(""); })
      .catch((error) => setNotificationError(error.message))
      .finally(() => setNotificationsLoading(false));
    load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    window.addEventListener("notifications-updated", load);
    return () => { window.clearInterval(timer); window.removeEventListener("notifications-updated", load); window.removeEventListener("focus", load); };
  }, [user]);

  useEffect(() => {
    if (!showNotifications) return;
    let cancelled = false;
    notificationAPI.getAll()
      .then(result => { if (!cancelled) { setNotifications(result.notifications); setNotificationError(""); } })
      .catch(error => { if (!cancelled) setNotificationError(error.message); });
    return () => { cancelled = true; };
  }, [showNotifications]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (query.trim().length < 2) { setResults([]); setSearching(false); setSearchError(""); return; }
      setSearching(true); setSearchError("");
      searchAPI.search(query, controller.signal).then(r => { if (!controller.signal.aborted) setResults(r.results); }).catch(e => { if (!controller.signal.aborted) setSearchError(e.message); }).finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, user?.activeCampus, user?.campus]);

  const markRead = async (notification) => {
    try {
      await notificationAPI.markRead(notification._id);
      setNotifications(current => current.map(n => n._id === notification._id ? { ...n, read: true } : n));
    } catch (error) { setNotificationError(error.message); }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    if (!showNotifications) return;
    const dismiss = (event) => {
      if (!notificationRef.current?.contains(event.target)) setShowNotifications(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
        notificationButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [showNotifications]);

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
        <div className="notification-wrap" ref={notificationRef}>
          <button ref={notificationButtonRef} type="button" className="header-icon" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={showNotifications} aria-controls={showNotifications ? "header-notifications" : undefined} onClick={() => setShowNotifications((visible) => !visible)}>
            <DashboardIcon name="notification" />
            {unreadCount > 0 && <i aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</i>}
          </button>
          {showNotifications && (isStudent ? (
            <StudentNotifications
              notifications={notifications}
              loading={notificationsLoading}
              error={notificationError}
              onMarkRead={markRead}
              onClose={() => { setShowNotifications(false); notificationButtonRef.current?.focus(); }}
            />
          ) : (
            <StaffNotifications
              role={user?.role}
              notifications={notifications}
              loading={notificationsLoading}
              error={notificationError}
              onMarkRead={markRead}
              onClose={() => { setShowNotifications(false); notificationButtonRef.current?.focus(); }}
            />
          ))}
        </div>
        <div className="header-profile">{user?.avatar ? <img src={user.avatar} alt="" /> : <b>{initials}</b>}<span><strong>{displayName}</strong><small>{user?.role || "Student"}</small></span></div>
      </div>
    </header>
  );
}

export default Navbar;
