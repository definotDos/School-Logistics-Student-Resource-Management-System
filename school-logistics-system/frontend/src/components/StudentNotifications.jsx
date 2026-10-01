import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardIcon from "./DashboardIcon";
import "./StudentNotifications.css";

const categories = {
  schedule: { label: "Claim schedule", icon: "calendar", tone: "blue" },
  approval: { label: "Approved", icon: "audit", tone: "green" },
  rejection: { label: "Request update", icon: "requests", tone: "rose" },
  reminder: { label: "Reminder", icon: "clock", tone: "amber" },
  release: { label: "Released", icon: "inventory", tone: "green" },
  general: { label: "Resource update", icon: "notification", tone: "blue" },
};

function dateGroup(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Other updates";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function StudentNotifications({ notifications, loading, error, onMarkRead, onClose }) {
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState([]);
  const unread = notifications.filter(item => !item.read).length;
  const groups = new Map();
  [...notifications].filter(item => filter === "all" || !item.read)
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
    .forEach(item => {
      const label = dateGroup(item.createdAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(item);
    });

  async function markRead(item) {
    setPending(ids => [...ids, item._id]);
    try { await onMarkRead(item); }
    finally { setPending(ids => ids.filter(id => id !== item._id)); }
  }

  return (
    <section id="header-notifications" className="notification-menu student-notifications student-inbox" aria-labelledby="student-notifications-title">
      <div className="student-notifications-heading">
        <div><span className="inbox-eyebrow">YOUR ACTIVITY</span><h2 id="student-notifications-title">Notifications</h2><p>Requests, schedules and resource updates</p></div>
        <button type="button" className="student-notifications-close" aria-label="Close notifications" onClick={onClose}>&times;</button>
      </div>
      <div className="inbox-toolbar">
        <div className="inbox-filters" role="group" aria-label="Filter notifications">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All <span>{notifications.length}</span></button>
          <button type="button" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Unread <span>{unread}</span></button>
        </div>
        <span className="inbox-summary" role="status">{loading ? "Updating…" : unread ? `${unread} new` : "All caught up"}</span>
      </div>
      <div className="student-notifications-list" tabIndex={0} aria-label="Notification updates" aria-busy={loading}>
        {error && <p className="student-notification-error" role="alert">{error}</p>}
        {loading ? <div className="inbox-empty" role="status"><DashboardIcon name="clock" /><h3>Loading your updates</h3><p>Your latest activity will appear here.</p></div> : groups.size ? [...groups].map(([label, items]) => (
          <section className="inbox-group" key={label} aria-label={label}>
            <h3 className="inbox-date">{label}<span>{items.length}</span></h3>
            <ul>{items.map(item => {
              const category = categories[item.type] || categories.general;
              const validDate = item.createdAt && !Number.isNaN(Date.parse(item.createdAt));
              return (
                <li key={item._id} className={`student-notification-item ${item.read ? "" : "is-unread"}`}>
                  <span className={`student-notification-icon tone-${category.tone}`}><DashboardIcon name={category.icon} /></span>
                  <div className="student-notification-copy">
                    <div className="inbox-card-top"><span className={`inbox-category tone-${category.tone}`}>{category.label}</span><span className={`inbox-read-state ${item.read ? "" : "is-new"}`}>{item.read ? "Read" : "Unread"}</span></div>
                    <h3>{item.title}</h3>
                    <p>{item.message}</p>
                    <div className="student-notification-meta">
                      {validDate && <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}><DashboardIcon name="clock" />{new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</time>}
                      {!item.read && <button type="button" disabled={pending.includes(item._id)} onClick={() => markRead(item)} aria-label={`Mark ${item.title} as read`}>{pending.includes(item._id) ? "Saving…" : "Mark as read"}</button>}
                    </div>
                  </div>
                </li>
              );
            })}</ul>
          </section>
        )) : !error && <div className="inbox-empty"><DashboardIcon name="audit" /><h3>{filter === "unread" ? "You're all caught up" : "No notifications yet"}</h3><p>{filter === "unread" ? "You've read all your updates. View All to revisit them." : "Updates about your requests and claim schedules will appear here."}</p></div>}
      </div>
      <Link className="student-notifications-footer" to="/claim-schedule" onClick={onClose}><span><DashboardIcon name="calendar" />View claim schedule</span><span aria-hidden="true">→</span></Link>
    </section>
  );
}
