import { useEffect, useState } from "react";
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
  const load = async () => {
    const [a, s] = await Promise.all([allocationAPI.getAll(), distributionAPI.getAllSchedules()]);
    setAllocations(a.allocations); setSchedules(s.schedules);
  };
  useEffect(() => {
    Promise.all([allocationAPI.getAll(), distributionAPI.getAllSchedules()]).then(([a, s]) => { setAllocations(a.allocations); setSchedules(s.schedules); }).catch(e => setError(e.message));
  }, []);
  const run = async (action) => {
    setBusy(true); setError("");
    try { await action(); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section className="admin-panel record-panel"><h2>Schedule and release resources</h2>
    <form className="resource-form" onSubmit={e => { e.preventDefault(); run(() => allocationAPI.createSchedule(form.allocation, form)); }}>
      <label>Allocation<select required value={form.allocation} onChange={e => setForm({ ...form, allocation: e.target.value })}><option value="">Choose approved allocation</option>{allocations.filter(a => a.status === "Reserved").map(a => <option key={a._id} value={a._id}>{a.student?.name} · {a.resource?.name} · {a.quantity}</option>)}</select></label>
      {[['pickupDate', 'date'], ['startTime', 'time'], ['endTime', 'time'], ['location', 'text']].map(([key, type]) => <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<input required type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
      <button className="admin-primary" disabled={busy}>Create schedule</button>
    </form>{error && <p role="alert" className="auth-error">{error}</p>}
    {schedules.map(s => <div className="record-row" key={s._id}><div className="record-copy"><strong>{s.resource?.name} · {s.student?.name}</strong><small>{new Date(s.pickupDate).toLocaleDateString()} · {s.startTime}–{s.endTime} · {s.location}</small></div><span>{s.status}</span>
      {s.status === "Scheduled" && <button disabled={busy} onClick={() => run(() => distributionAPI.verifyClaimIdentity(s._id, { quantityClaimed: s.allocation.quantity }))}>Verify identity</button>}
      {s.status === "Confirmed" && <button disabled={busy} onClick={() => run(() => distributionAPI.release(s.allocation._id, { quantityDelivered: s.allocation.quantity }))}>Release resources</button>}
    </div>)}{!schedules.length && <p>No claim schedules yet.</p>}
  </section>;
}

export function CampusPanel() {
  const [campuses, setCampuses] = useState([]);
  const [form, setForm] = useState({ name: "", code: "", address: "", contact: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = () => campusAPI.getAll().then(r => { setCampuses(r.campuses); setError(""); });
  useEffect(() => {
    let cancelled = false;
    campusAPI.getAll().then(r => { if (!cancelled) setCampuses(r.campuses); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (form._id) await campusAPI.update(form._id, form); else await campusAPI.create(form);
      setForm({ name: "", code: "", address: "", contact: "" }); await load();
      window.dispatchEvent(new Event("campuses-updated"));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const remove = async (campus) => {
    if (!window.confirm(`Delete ${campus.name}? Campuses with linked records cannot be deleted.`)) return;
    setBusy(true); setError("");
    try { await campusAPI.delete(campus._id); await load(); window.dispatchEvent(new Event("campuses-updated")); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section className="admin-panel record-panel"><h2>Campuses</h2>
    <form className="resource-form" onSubmit={save}>{["name", "code", "address", "contact"].map(key => <label key={key}>{key}<input required={key === "name"} disabled={key === "name" && !!form._id} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
      {form._id && <label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
      <button disabled={busy} className="admin-primary">{busy ? "Saving…" : form._id ? "Save campus" : "Add campus"}</button>
      {form._id && <button type="button" onClick={() => setForm({ name: "", code: "", address: "", contact: "" })}>Cancel edit</button>}
    </form>{error && <p role="alert" className="auth-error">{error}</p>}
    {campuses.map(c => <div className="record-row" key={c._id}><div className="record-copy"><strong>{c.name}</strong><small>{c.address} · {c.contact}</small></div><span>{c.status}</span><button onClick={() => setForm(c)}>Edit</button><button onClick={() => remove(c)}>Delete</button></div>)}
    {loading ? <p role="status">Loading campuses...</p> : !error && !campuses.length && <p>No campuses have been registered.</p>}
  </section>;
}

export function NotificationsPanel() {
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
  return <section className="admin-panel record-panel"><h2>Notifications</h2><form className="resource-form" onSubmit={send}>
    <label>Recipient<select required value={form.user} onChange={e => setForm({ ...form, user: e.target.value })}><option value="">Choose recipient</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}</select></label>
    <label>Type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{["general", "approval", "rejection", "schedule", "reminder", "release"].map(type => <option key={type}>{type}</option>)}</select></label>
    <label>Title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
    <label>Message<textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></label>
    <button className="admin-primary" disabled={busy}>{busy ? "Sending…" : "Send notification"}</button>
  </form>{error && <p role="alert" className="auth-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  {records.map(n => <div className="record-row" key={n._id}><div className="record-copy"><strong>{n.title}</strong><p>{n.message}</p><small>To {n.user?.name || "Recipient"} · {new Date(n.createdAt).toLocaleString()}</small></div><span>{n.read ? "Read" : "Unread"}</span></div>)}
  {loading ? <p role="status">Loading notifications and recipients...</p> : !error && <>
    {!records.length && <p>No notifications yet.</p>}
    {!users.length && <p>No active recipients are available in this campus.</p>}
  </>}</section>;
}

export function ReportsPanel() {
  const [report, setReport] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ startDate: "", endDate: "", status: "" });
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
    {error ? <p role="alert" className="auth-error">{error}</p> : !report ? <p>Loading reports…</p> : <><div className="admin-stats">{Object.entries(report.summary).map(([label, count]) => <article className="admin-stat" key={label}><span>{label.replace(/([A-Z])/g, " $1")}</span><strong>{count}</strong></article>)}</div>
    <p>Completion: {report.completionRate}% · Approval: {report.approvalRate}%</p>
    <p>Inventory: {inventory.summary.totalAvailable} available · {inventory.summary.totalReserved} reserved · {inventory.summary.totalIssued} issued</p>
    <div className="record-list">{report.details.map(r => <div className="record-row" key={r.requestId}><div className="record-copy"><strong>{r.ref} · {r.resource}</strong><small>{r.student} · {r.quantity} unit(s)</small></div><span>{r.status}</span></div>)}</div></>}
  </section>;
}
