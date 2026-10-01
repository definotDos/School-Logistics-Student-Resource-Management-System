import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardIcon from "./DashboardIcon";
import "./StaffNotifications.css";

export default function StaffNotifications({ notifications, loading, error, onMarkRead, onClose, role = "staff" }) {
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState([]);
  const requestPath = role === "admin" ? "/admin/requests" : "/staff/review_requests";
  const isRequest = item => item.metadata?.event === "request_created";
  const requests = notifications.filter(isRequest).length;
  const unread = notifications.filter((item) => !item.read).length;
  const visible = notifications.filter((item) => filter === "all" || (filter === "requests" ? isRequest(item) : !item.read))
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));

  async function markRead(item) {
    setPending(ids => [...ids, item._id]);
    try { await onMarkRead(item); }
    finally { setPending(ids => ids.filter(id => id !== item._id)); }
  }

  return (
    <section id="header-notifications" className="notification-menu staff-notifications" data-role={role === "admin" ? "admin" : "staff"} aria-labelledby="staff-notifications-title">
      <div className="staff-notifications-heading">
        <span className="staff-notifications-icon"><DashboardIcon name="notification" /></span>
        <div><span className="staff-notifications-workspace">{role === "admin" ? "Admin" : "Staff"} activity</span><h2 id="staff-notifications-title">Notifications</h2><p>Requests and claim updates</p></div>
        <button type="button" className="staff-notifications-close" aria-label="Close notifications" onClick={onClose}>&times;</button>
      </div>
      <div className="staff-notifications-filters" role="group" aria-label="Filter notifications">
        <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All <span>{notifications.length}</span></button>
        <button type="button" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Unread <span>{unread}</span></button>
        <button type="button" aria-pressed={filter === "requests"} onClick={() => setFilter("requests")}>Requests <span>{requests}</span></button>
      </div>
      <div className="staff-notifications-list" tabIndex={0} aria-label="Recent notifications" aria-busy={loading}>
        {error && <p className="staff-notifications-error" role="alert">{error}</p>}
        {loading ? <p className="staff-notifications-state" role="status">Loading notifications...</p> : visible.length ? (
          <ul>{visible.map((item) => (
            <li key={item._id} className={item.read ? "" : "is-unread"}>
              <span className="staff-notifications-item-icon" aria-hidden="true"><DashboardIcon name={isRequest(item) ? "studentRequests" : item.type === "schedule" ? "calendar" : "notification"} /></span>
              <div className="staff-notifications-copy">
                <div className="staff-notifications-category">{isRequest(item) ? "Student request" : "Resource update"}<span className={`staff-notifications-status ${item.read ? "is-read" : "is-new"}`}>{item.read ? "Read" : "Unread"}</span></div>
                <h3>{item.title || "Notification"}</h3><p>{item.message}</p>
                {isRequest(item) && <dl className="staff-notifications-details">
                  <div><dt>Request</dt><dd>{item.metadata.requestId}</dd></div>
                  <div><dt>Campus</dt><dd>{item.metadata.campus}</dd></div>
                  {item.metadata.studentId && <div><dt>Student ID</dt><dd>{item.metadata.studentId}</dd></div>}
                </dl>}
                <div className="staff-notifications-meta">
                  {item.createdAt && !Number.isNaN(Date.parse(item.createdAt)) && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>}
                </div>
                <div className="staff-notifications-actions">
                  {isRequest(item) && <Link className="staff-notifications-review" to={requestPath} onClick={onClose}>Review requests <span aria-hidden="true">→</span></Link>}
                  {item.read ? <span className="staff-notifications-read-confirmed"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>Marked as read</span> : <button type="button" className="staff-notifications-read" disabled={pending.includes(item._id)} onClick={() => markRead(item)} aria-label={`Mark ${item.title || "notification"} as read`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>{pending.includes(item._id) ? "Saving…" : "Mark as read"}</button>}
                </div>
              </div>
            </li>
          ))}</ul>
        ) : !error && <div className="staff-notifications-state" role="status">
          <span className="staff-notifications-empty-icon"><DashboardIcon name="notification" /></span>
          <h3>{filter === "unread" ? "You're all caught up" : filter === "requests" ? "No request updates yet" : "No notifications yet"}</h3>
          <p>{filter === "unread" ? "You've read all your notifications." : "New request and claim updates will appear here."}</p>
        </div>}
      </div>
      <Link className="staff-notifications-footer" to={requestPath} onClick={onClose}><DashboardIcon name="studentRequests" />View student requests<span aria-hidden="true">→</span></Link>
    </section>
  );
}
