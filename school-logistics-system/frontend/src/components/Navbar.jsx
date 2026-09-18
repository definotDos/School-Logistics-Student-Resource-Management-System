import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DashboardIcon from "./DashboardIcon";
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
    window.addEventListener("notifications-updated", load);
    return () => { window.clearInterval(timer); window.removeEventListener("notifications-updated", load); };
  }, [user]);

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
            <section id="header-notifications" className="notification-menu student-notifications" aria-labelledby="student-notifications-title">
              <div className="student-notifications-heading">
                <div><h2 id="student-notifications-title">Notifications</h2><p>Your latest resource updates</p></div>
                <span className="student-unread-count">{unreadCount} unread</span>
              </div>
              <div className="student-notifications-list" tabIndex={0} aria-label="Recent notifications">
                {notificationError && <p className="student-notification-error" role="alert">{notificationError}</p>}
                {notificationsLoading ? <p className="student-notification-empty" role="status">Loading notifications...</p> : notifications.length ? (
                  <ul>
                    {notifications.slice(0, 5).map((notification) => (
                      <li key={notification._id} className={`student-notification-item ${notification.read ? "" : "is-unread"}`}>
                        <span className="student-notification-icon"><DashboardIcon name="notification" /></span>
                        <div className="student-notification-copy">
                          <h3>{notification.title}</h3>
                          <p>{notification.message}</p>
                          <div className="student-notification-meta">
                            <span>{notification.read ? "Read" : "Unread"}</span>
                            {!notification.read && <button type="button" onClick={() => markRead(notification)} aria-label={`Mark ${notification.title} as read`}>Mark as read</button>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : !notificationError && <p className="student-notification-empty">You're all caught up. New resource updates will appear here.</p>}
              </div>
              <Link className="student-notifications-footer" to="/claim-schedule" onClick={() => setShowNotifications(false)}>View claim schedule <span aria-hidden="true">→</span></Link>
            </section>

          ) : user?.role === "admin" ? (
            <section id="header-notifications" className="notification-menu admin-notifications" aria-labelledby="admin-notifications-title">
              <div className="admin-notifications-heading">
                <div><h2 id="admin-notifications-title">Notifications</h2><p>Latest requests and schedule updates</p></div>
                <span className="admin-unread-count">{unreadCount} unread</span>
              </div>
              <div className="admin-notifications-list" tabIndex={0} aria-label="Recent notifications">
                {notificationError && <p className="admin-notification-error" role="alert">{notificationError}</p>}
                {notificationsLoading ? <p className="admin-notification-empty" role="status">Loading notifications...</p> : notifications.length ? (
                  <ul>
                    {[...notifications].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).map(notification => (
                      <li key={notification._id} className={`admin-notification-item ${notification.read ? "" : "is-unread"}`}>
                        <span className="admin-notification-icon" aria-hidden="true"><DashboardIcon name="notification" /></span>
                        <div className="admin-notification-copy">
                          <h3>{notification.title}</h3>
                          <p>{notification.message}</p>
                          <div className="admin-notification-meta">
                            <span>{notification.read ? "Read" : "Unread"}</span>
                            {notification.createdAt && !Number.isNaN(Date.parse(notification.createdAt)) && <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>}
                            {!notification.read && <button type="button" onClick={() => markRead(notification)} aria-label={`Mark ${notification.title} as read`}>Mark as read</button>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : !notificationError && <p className="admin-notification-empty">You're all caught up. New updates will appear here.</p>}
              </div>
              <Link className="admin-notifications-footer" to="/admin/distribution" onClick={() => setShowNotifications(false)}>Manage claim schedules <span aria-hidden="true">?</span></Link>
            </section>          ) : (
            <div id="header-notifications" className="notification-menu"><strong>Notifications</strong>{notificationError ? <p role="alert">{notificationError}</p> : notificationsLoading ? <p role="status">Loading notifications...</p> : notifications.length ? notifications.slice(0, 5).map((notification) => <div key={notification._id}><p>{notification.title}: {notification.message}</p>{!notification.read && <button onClick={() => markRead(notification)}>Mark read</button>}</div>) : <p>No notifications yet.</p>}<Link to={user?.role === "admin" ? "/admin/distribution" : "/staff/manage_schedules"} onClick={() => setShowNotifications(false)}>View schedule <span aria-hidden="true">→</span></Link></div>
          ))}
        </div>
        <div className="header-profile">{user?.avatar ? <img src={user.avatar} alt="" /> : <b>{initials}</b>}<span><strong>{displayName}</strong><small>{user?.role || "Student"}</small></span></div>
      </div>
    </header>
  );
}

export default Navbar;
