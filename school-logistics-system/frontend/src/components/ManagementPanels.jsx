import { useTabState } from "../hooks/useTabState";
import { useEffect, useState } from "react";
import DashboardIcon from "./DashboardIcon";
import { campuses as campusBranding } from "../data/campuses";
import "./CampusPanel.css";
import { allocationAPI, distributionAPI, campusAPI, notificationAPI, reportsAPI, userAPI } from "../services/api";

export function CreateUserForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", studentId: "", campus: "" });
  const [campuses, setCampuses] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { campusAPI.getAll().then(r => setCampuses(r.campuses.filter(c => c.status === "active"))).catch(e => setError(e.message)); }, []);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await userAPI.create(form); onCreated(result.user);
      setForm({ name: "", email: "", password: "", role: "student", studentId: "", campus: "" });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <details><summary>Add user</summary><form className="resource-form" onSubmit={submit}>
    {['name', 'email', 'password', 'studentId'].map(key => <label key={key}>{key}<input required={key !== "studentId" || form.role === "student"} type={key === "password" ? "password" : key === "email" ? "email" : "text"} minLength={key === "password" ? 8 : undefined} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
    <label>Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{['student', 'staff', 'admin'].map(role => <option key={role}>{role}</option>)}</select></label>
    <label>Campus<select required value={form.campus} onChange={e => setForm({ ...form, campus: e.target.value })}><option value="">Choose campus</option>{campuses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}</select></label>
    <button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Create user"}</button>
  </form>{error && <p role="alert" className="auth-error">{error}</p>}</details>;
}

export function DistributionPanel() {
  const [allocations, setAllocations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState({ allocation: "", pickupDate: "", startTime: "", endTime: "", location: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useTabState("DistributionPanel.filter", "All");
  const load = async () => {
    const [a, s] = await Promise.all([allocationAPI.getAll(), distributionAPI.getAllSchedules()]);
    setAllocations(a.allocations); setSchedules(s.schedules);
  };
  useEffect(() => {
    Promise.all([allocationAPI.getAll(), distributionAPI.getAllSchedules()])
      .then(([a, s]) => { setAllocations(a.allocations); setSchedules(s.schedules); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  const run = async (action) => {
    setBusy(true); setError("");
    try { await action(); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const available = allocations.filter(a => a.status === "Reserved");
  const visible = schedules.filter(s => filter === "All" || s.status === filter);
  const submit = e => {
    e.preventDefault();
    if (form.endTime <= form.startTime) { setError("End time must be after start time."); return; }
    run(async () => {
      await allocationAPI.createSchedule(form.allocation, form);
      setForm({ allocation: "", pickupDate: "", startTime: "", endTime: "", location: "" });
    });
  };
  return <div className="distribution-center">
    <section className="admin-panel distribution-compose" aria-labelledby="distribution-create-title">
      <header className="distribution-heading"><span className="distribution-icon"><DashboardIcon name="calendar" /></span><div><h2 id="distribution-create-title">Create a pickup schedule</h2><p>Select an allocation and set the collection details.</p></div></header>
      <form className="distribution-form" onSubmit={submit}>
        <label className="distribution-wide">Approved allocation<select required disabled={loading || busy || !available.length} value={form.allocation} onChange={e => setForm({ ...form, allocation: e.target.value })}><option value="">{loading ? "Loading allocations..." : "Choose an approved allocation"}</option>{available.map(a => <option key={a._id} value={a._id}>{a.student?.name} · {a.resource?.name} · Qty: {a.quantity}</option>)}</select></label>
        <label className="distribution-wide">Pickup location<input required disabled={busy} placeholder="e.g. Student Affairs Office" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label>
        <div className="distribution-time-fields">
          <label>Pickup date<input required disabled={busy} type="date" value={form.pickupDate} onChange={e => setForm({ ...form, pickupDate: e.target.value })} /></label>
          <label>Start time<input required disabled={busy} type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></label>
          <label>End time<input required disabled={busy} type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></label>
        </div>
        <footer className="distribution-form-footer"><p>{!loading && !error && !available.length ? "No reserved allocations available to schedule." : "Set a collection window for the student."}</p><button className="admin-primary" disabled={busy || loading || !available.length}>{busy ? "Saving..." : "Create schedule"}</button></footer>
      </form>
      {error && <p role="alert" className="auth-error">{error}</p>}
    </section>
    <section className="admin-panel distribution-records" aria-labelledby="distribution-list-title">
      <header className="distribution-heading"><span className="distribution-icon"><DashboardIcon name="history" /></span><div><h2 id="distribution-list-title">Pickup schedules</h2><p>Track collections, verify students, and release resources.</p></div><span className="distribution-total">{schedules.length} total</span></header>
      <div className="distribution-filters" role="group" aria-label="Filter schedules by status">{["All", "Scheduled", "Confirmed", "Completed"].map(status => <button key={status} data-status={status.toLowerCase()} type="button" aria-pressed={filter === status} className={filter === status ? "is-active" : ""} onClick={() => setFilter(status)}>{status}<span>{schedules.filter(s => status === "All" || s.status === status).length}</span></button>)}</div>
      <div className="distribution-list">
        {loading ? <p className="distribution-empty" role="status">Loading pickup schedules...</p> : visible.map(s => <article className="distribution-record" key={s._id}>
          <div className="distribution-record-top"><div><h3>{s.resource?.name || "Resource claim"}</h3><p>{s.student?.name || "Student"}{s.allocation?.quantity != null && <span> · {s.allocation.quantity} units</span>}</p></div><span className={`distribution-status distribution-status-${(s.status || "").toLowerCase()}`}>{s.status}</span></div>
          <dl className="distribution-details"><div><dt>Pickup date</dt><dd>{s.pickupDate ? new Date(s.pickupDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not set"}</dd></div><div><dt>Collection window</dt><dd>{s.startTime} – {s.endTime}</dd></div><div><dt>Location</dt><dd>{s.location || "Not set"}</dd></div></dl>
          {(s.status === "Scheduled" || s.status === "Confirmed") && <footer className="distribution-record-footer"><span>{s.status === "Scheduled" ? "Awaiting student identity verification" : "Identity verified · Ready for release"}</span>{s.status === "Scheduled" ? <button className="admin-primary" disabled={busy} onClick={() => run(() => distributionAPI.verifyClaimIdentity(s._id, { quantityClaimed: s.allocation.quantity }))}>Verify identity</button> : <button className="admin-primary" disabled={busy} onClick={() => run(() => distributionAPI.release(s.allocation._id, { quantityDelivered: s.allocation.quantity }))}>Release resources</button>}</footer>}
        </article>)}
        {!loading && !error && !visible.length && <div className="distribution-empty"><DashboardIcon name="calendar" /><h3>{filter === "All" ? "No pickup schedules yet" : `No ${filter.toLowerCase()} schedules`}</h3><p>{filter === "All" ? "Create a schedule above to arrange a resource collection." : "Choose another status to view more schedules."}</p></div>}
      </div>
    </section>
  </div>;
}
export function CampusPanel() {
  const emptyForm = { name: "", address: "", contact: "" };
  const [campuses, setCampuses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useTabState("CampusPanel.search", "");
  const [status, setStatus] = useTabState("CampusPanel.status", "all");
  const load = () => campusAPI.getAll().then(r => setCampuses(r.campuses));
  useEffect(() => {
    let cancelled = false;
    campusAPI.getAll().then(r => { if (!cancelled) setCampuses(r.campuses); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) { setError("Enter a campus name."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      if (form._id) await campusAPI.update(form._id, form); else await campusAPI.create(form);
      setNotice(form._id ? "Campus details updated." : "Campus added successfully.");
      setForm(emptyForm);
      window.dispatchEvent(new Event("campuses-updated"));
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const remove = async (campus) => {
    if (!window.confirm(`Delete ${campus.name}? Campuses with linked records cannot be deleted. You can set their status to inactive instead.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await campusAPI.delete(campus._id);
      if (form._id === campus._id) setForm(emptyForm);
      setNotice("Campus deleted.");
      window.dispatchEvent(new Event("campuses-updated"));
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const visible = campuses.filter(c => (status === "all" || c.status === status) &&
    [c.name, c.address, c.contact].some(value => (value || "").toLowerCase().includes(search.trim().toLowerCase())));
  const edit = campus => {
    setForm({ ...emptyForm, ...campus }); setError(""); setNotice("");
    document.getElementById("campus-address")?.focus();
  };
  return <div className="campus-workspace">
    {error && <p role="alert" className="campus-feedback campus-feedback-error">{error}</p>}
    {notice && <p role="status" className="campus-feedback">{notice}</p>}
    <section className="admin-panel campus-editor" aria-labelledby="campus-form-title">
      <div className="campus-section-heading"><span className="campus-heading-icon"><DashboardIcon name="school" /></span><div><h2 id="campus-form-title">{form._id ? "Edit campus details" : "Add a campus"}</h2><p>{form._id ? "Update the campus contact information and availability." : "Register a school or campus for resource deliveries and collections."}</p></div></div>
      <form onSubmit={save} className="campus-form">
        <div className="campus-form-grid">
          <label htmlFor="campus-name">Campus name <span>Required</span><input id="campus-name" required disabled={busy || !!form._id} value={form.name} placeholder="e.g. PHINMA University of Pangasinan" onChange={e => setForm({ ...form, name: e.target.value })} />{form._id && <small>Campus names are fixed to preserve linked records.</small>}</label>
          <label htmlFor="campus-address">Campus address <span>Optional</span><input id="campus-address" disabled={busy} value={form.address} placeholder="Street, barangay, city or province" onChange={e => setForm({ ...form, address: e.target.value })} /></label>
          <label htmlFor="campus-contact">Contact details <span>Optional</span><input id="campus-contact" disabled={busy} value={form.contact} placeholder="Contact person, phone number or email" onChange={e => setForm({ ...form, contact: e.target.value })} /></label>
          {form._id && <label htmlFor="campus-status">Campus status<select id="campus-status" disabled={busy} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select><small>Set to inactive if this campus is no longer available.</small></label>}
        </div>
        <div className="campus-form-footer"><p>{form._id ? "Review your changes before saving." : "New campuses are active by default."}</p><div>{form._id && <button disabled={busy} className="campus-button" type="button" onClick={() => setForm(emptyForm)}>Cancel edit</button>}<button disabled={busy || loading} className="admin-primary" type="submit">{busy ? "Please wait..." : form._id ? "Save changes" : "Add campus"}</button></div></div>
      </form>
    </section>
    <section className="admin-panel campus-directory" aria-labelledby="campus-directory-title" aria-busy={loading}>
      <div className="campus-section-heading"><div><h2 id="campus-directory-title">Campus directory <span className="campus-count">{loading ? "..." : campuses.length}</span></h2><p>View registered campuses and manage their details.</p></div><span className="campus-active-count">{loading ? "Loading..." : `${campuses.filter(c => c.status === "active").length} active`}</span></div>
      <div className="campus-filters"><label htmlFor="campus-search">Search campuses<input id="campus-search" type="search" placeholder="Search by name, address or contact" value={search} onChange={e => setSearch(e.target.value)} /></label><label htmlFor="campus-filter">Status<select id="campus-filter" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
      <div className="campus-list">
        {visible.map(c => {
          const branding = campusBranding.find(campus => campus.name.toLowerCase() === c.name.trim().toLowerCase());
          return <article className="campus-card" key={c._id}>
          <div className="campus-card-heading"><div className="campus-identity"><span className={`campus-heading-icon${branding ? " campus-logo" : ""}`}>{branding ? <img src={branding.logo} alt={`${branding.shortName} logo`} /> : <DashboardIcon name="school" />}</span><div><h3>{c.name}</h3></div></div><span className={`campus-status ${c.status}`}>{c.status === "active" ? "Active" : "Inactive"}</span></div>
          <dl className="campus-details"><div><dt>Address</dt><dd>{c.address || "No address added"}</dd></div><div><dt>Contact details</dt><dd>{c.contact || "No contact details added"}</dd></div></dl>
          <div className="campus-card-actions"><button className="campus-button" disabled={busy} onClick={() => edit(c)} aria-label={`Edit ${c.name}`}>Edit details</button><button className="campus-button campus-delete" disabled={busy} onClick={() => remove(c)} aria-label={`Delete ${c.name}`}>Delete</button></div>
        </article>; })}
        {loading ? <p className="campus-empty" role="status">Loading campuses...</p> : !visible.length && <div className="campus-empty"><DashboardIcon name="school" /><h3>{error ? "Campus directory unavailable" : campuses.length ? "No matching campuses" : "No campuses yet"}</h3><p>{error ? "Please refresh the page to try again." : campuses.length ? "Try a different search or select another status." : "Use the form above to register your first campus."}</p>{(search || status !== "all") && <button className="campus-button" onClick={() => { setSearch(""); setStatus("all"); }}>Clear filters</button>}</div>}
      </div>
      {!loading && campuses.length > 0 && <p className="campus-directory-footer">Showing {visible.length} of {campuses.length} {campuses.length === 1 ? "campus" : "campuses"}</p>}
    </section>
  </div>;
}

export function NotificationsPanel() {
  const [search, setSearch] = useTabState("NotificationsPanel.search", "");
  const [status, setStatus] = useTabState("NotificationsPanel.status", "all");
  const [typeFilter, setTypeFilter] = useTabState("NotificationsPanel.typeFilter", "all");
  const [page, setPage] = useTabState("NotificationsPanel.page", 1);
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ user: "", title: "", message: "", type: "general" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = () => notificationAPI.getManaged().then(r => setRecords(r.notifications));
  useEffect(() => {
    let cancelled = false;
    Promise.all([notificationAPI.getManaged(), userAPI.getRecipients()])
      .then(([n, u]) => { if (!cancelled) { setRecords(n.notifications); setUsers(u.users.filter(user => user.status === "active")); } })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const send = async event => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await notificationAPI.create(form); setForm({ user: "", title: "", message: "", type: "general" }); await load(); setNotice("Notification sent."); window.dispatchEvent(new Event("notifications-updated")); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const unread = records.filter(record => !record.read).length;
  const visibleRecords = records.filter(record => {
    const matchesStatus = status === "all" || (status === "read" ? record.read : !record.read);
    return matchesStatus && (typeFilter === "all" || (record.type || "general") === typeFilter) && [record.title, record.message, record.user?.name].some(value => (value || "").toLowerCase().includes(search.trim().toLowerCase()));
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const dateGroups = new Map();
  visibleRecords.slice(pageStart, pageStart + pageSize).forEach(record => {
    const date = new Date(record.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (!dateGroups.has(date)) dateGroups.set(date, []);
    dateGroups.get(date).push(record);
  });
  const resetFilters = () => { setSearch(""); setStatus("all"); setTypeFilter("all"); setPage(1); };
  return <div className="notification-center">
    <section className="admin-panel notification-compose" aria-labelledby="notification-compose-title">
      <header className="notification-section-heading"><span className="notification-section-icon"><DashboardIcon name="notification" /></span><div><h2 id="notification-compose-title">Compose notification</h2><p>Send an update to a student or team member.</p></div></header>
      <form className="notification-compose-form" onSubmit={send}>
        <label>Recipient<select required disabled={loading || busy || !users.length} value={form.user} onChange={e => setForm({ ...form, user: e.target.value })}><option value="">{loading ? "Loading recipients…" : "Choose a recipient"}</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}</select></label>
        <label>Notification type<select disabled={busy} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{["general", "approval", "rejection", "schedule", "reminder", "release"].map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}</select></label>
        <label className="notification-full-width">Title<input required disabled={busy} placeholder="Enter a short, descriptive title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label className="notification-full-width">Message<textarea required disabled={busy} rows={5} placeholder="Write your update and include any important next steps…" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></label>
        <footer className="notification-compose-footer"><span>Review your message before sending.</span><button className="admin-primary" disabled={busy || loading || !users.length}>{busy ? "Sending…" : "Send notification"}</button></footer>
      </form>
      {error && <p role="alert" className="auth-error">{error}</p>}
      {notice && <p className="notification-success" role="status">{notice}</p>}
      {!loading && !error && !users.length && <p className="notification-empty">No active recipients are available in this campus.</p>}
    </section>
    <section className="admin-panel notification-history" aria-labelledby="notification-history-title">
      <header className="notification-section-heading"><span className="notification-section-icon"><DashboardIcon name="history" /></span><div><h2 id="notification-history-title">Notification history</h2><p>Track sent updates and recipient read status.</p></div><span className="notification-total">{loading ? "Loading…" : `${records.length} total`}</span></header>
      <div className="notification-history-tools">
        <div className="notification-status-filters" role="group" aria-label="Filter by read status">{[["all", "All", records.length], ["unread", "Unread", unread], ["read", "Read", records.length - unread]].map(([value, label, count]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{label}<span>{count}</span></button>)}</div>
        <div className="notification-search-tools"><input type="search" aria-label="Search notification history" placeholder="Search notifications…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /><select aria-label="Filter by notification type" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}><option value="all">All types</option>{["general", "approval", "rejection", "schedule", "reminder", "release"].map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}</select></div>
      </div>
      {loading ? <p className="notification-empty" role="status">Loading notification history…</p> : <>
        <div className="notification-history-caption"><span role="status">{visibleRecords.length ? `${pageStart + 1}–${Math.min(pageStart + pageSize, visibleRecords.length)} of ${visibleRecords.length} notifications` : "0 notifications"}</span><span>Newest first{(search || status !== "all" || typeFilter !== "all") && <button type="button" className="notification-clear" onClick={resetFilters}>Clear filters</button>}</span></div>
        {[...dateGroups].map(([date, items]) => <section className="notification-date-group" key={date} aria-label={date}>
          <h3 className="notification-date-heading"><DashboardIcon name="calendar" />{date}<span>{items.length} on this page</span></h3>
          <ul className="notification-history-list">{items.map(n => <li className={`notification-history-item${n.read ? "" : " is-unread"}`} key={n._id}>
            <span className={`notification-item-icon notification-tone-${n.type || "general"}`}><DashboardIcon name={({ schedule: "calendar", release: "resources", approval: "requests", rejection: "requests", reminder: "history" })[n.type] || "notification"} /></span>
            <div className="notification-item-content"><div className="notification-item-heading"><h4>{n.title}</h4><time dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString()}>{new Date(n.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</time></div><p>{n.message}</p><div className="notification-item-meta"><span className="notification-recipient"><DashboardIcon name="profile" /><span>To <strong>{n.user?.name || "Recipient"}</strong></span></span><span className={`notification-type notification-tone-${n.type || "general"}`}>{n.type || "general"}</span><span className={`notification-read-status${n.read ? " is-read" : ""}`}>{n.read ? "Read" : "Unread"}</span></div></div>
          </li>)}</ul>
        </section>)}
        {!visibleRecords.length && !error && <div className="notification-empty"><DashboardIcon name="notification" /><h3>{records.length ? "No matching notifications" : "No notifications yet"}</h3><p>{records.length ? "Try another search or filter." : "Sent notifications will appear here."}</p></div>}
        {pageCount > 1 && <nav className="notification-pagination" aria-label="Notification history pages"><span>Page {currentPage} of {pageCount}</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div></nav>}
      </>}
    </section>
  </div>;
}

export function ReportsPanel() {
  const [report, setReport] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useTabState("ReportsPanel.filters", { startDate: "", endDate: "", status: "" });
  useEffect(() => {
    let cancelled = false;
    const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    Promise.all([reportsAPI.getRequestReport(query), reportsAPI.getInventoryReport()]).then(([r, i]) => { if (!cancelled) { setReport(r); setInventory(i); setError(""); } }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [filters]);
  const download = () => {
    const blob = new Blob([JSON.stringify({ requests: report, inventory }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "school-logistics-report.json"; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="admin-panel record-panel"><h2>Request and inventory report</h2><div className="record-tools">
    <label>From<input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} /></label><label>Through<input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} /></label>
    <select aria-label="Request status" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{["pending", "approved", "rejected", "cancelled", "ready_for_claim", "claimed", "released", "completed"].map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select><button disabled={!report || !!error} onClick={download}>Download report</button></div>
    {error ? <p role="alert" className="auth-error">{error}</p> : !report ? <p>Loading reports…</p> : <><div className="admin-stats request-summary-grid">{Object.entries(report.summary).map(([label, count]) => <article className="admin-stat" data-status={label.replaceAll("_", "").toLowerCase()} key={label}><span>{label.replace(/([A-Z])/g, " $1")}</span><strong>{count}</strong></article>)}</div>
    <p>Completion: {report.completionRate}% · Approval: {report.approvalRate}%</p>
    <p>Inventory: {inventory.summary.totalAvailable} available · {inventory.summary.totalReserved} reserved · {inventory.summary.totalIssued} issued</p>
    <RequestStatusChart requests={report.details} /></>}
  </section>;
}

function RequestStatusChart({ requests = [] }) {
  const counts = new Map(["pending", "approved", "rejected", "cancelled", "ready_for_claim", "claimed", "released", "completed"].map(status => [status, 0]));
  requests.forEach(request => {
    const status = String(request.status || "unknown").trim().toLowerCase().replace(/\s+/g, "_");
    counts.set(status, (counts.get(status) || 0) + 1);
  });
  const maximum = Math.max(1, ...counts.values());
  const step = Math.max(1, Math.ceil(maximum / 4));
  const limit = step * 4;
  const labelFor = status => status.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());

  return <figure className="request-status-chart">
    <figcaption className="request-chart-heading"><div><span className="request-chart-eyebrow">Request analytics</span><h3>Requests by status</h3><p>A breakdown of requests matching your filters.</p></div><div className="request-chart-total"><strong>{requests.length}</strong><span>Total requests</span></div></figcaption>
    {!requests.length ? <p className="empty-state">No requests match the selected filters.</p> : <>
      <p className="request-chart-axis-title">Number of requests</p>
      <div className="request-chart-scroll">
        <div className="request-chart-plot" role="group" aria-label="Request counts by status. Focus a column for details.">
          <div className="request-chart-grid" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <div key={index}><span>{limit - index * step}</span></div>)}</div>
          <div className="request-chart-columns">{[...counts].map(([status, count], index) => <div className={`request-chart-column request-chart-bar--${status}`} key={status} tabIndex={0} aria-label={`${labelFor(status)}: ${count} requests, ${Math.round(count / requests.length * 100)}% of total`} style={{ "--bar-delay": `${index * 65}ms` }}>
            <div className="request-chart-tooltip" aria-hidden="true"><b>{labelFor(status)}</b><span>{count} request{count === 1 ? "" : "s"} <i /> {Math.round(count / requests.length * 100)}%</span></div>
            <div className="request-chart-bar-area" aria-hidden="true"><div className={`request-chart-bar${count === 0 ? " is-zero" : ""}`} style={{ height: `${count / limit * 100}%` }}><strong>{count}</strong><div key={`${count}-${limit}`} className="request-chart-bar-fill" /></div></div>
            <span className="request-chart-label" aria-hidden="true"><i />{labelFor(status)}</span>
          </div>)}</div>
        </div>
      </div>
      <div className="request-chart-footer"><span><i /> Current filtered results</span><span>Hover or focus a column to see its share</span></div>
    </>}
  </figure>;
}
