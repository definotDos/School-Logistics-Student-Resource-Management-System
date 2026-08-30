import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/useAuth";
import { inventoryAPI, requestAPI, resourceAPI, userAPI } from "../../services/api";
import DashboardIcon from "../../components/DashboardIcon";

const sections = {
  dashboard: { label: "Overview", title: "Welcomeback Admin!", description: "A live view of school resource operations." },
  users: { label: "User management", title: "Users and permissions", description: "Manage student, staff, and administrator access." },
  catalog: { label: "Resource catalog", title: "Resource catalog", description: "Keep the school resource directory accurate and useful." },
  inventory: { label: "Inventory", title: "Inventory control", description: "Track stock, reserved units, and receiving activity." },
  requests: { label: "Request approval", title: "Request review queue", description: "Approve, verify, and route student resource requests." },
  allocation: { label: "Allocation", title: "Resource allocation", description: "Assign approved resources to students and campuses." },
  distribution: { label: "Distribution scheduling", title: "Distribution schedule", description: "Plan collection windows and release resources." },
  campuses: { label: "School and campus management", title: "Schools and campuses", description: "Manage delivery locations and campus contacts." },
  reports: { label: "Reports and analytics", title: "Reports and analytics", description: "Understand demand, fulfillment, and stock health." },
  notifications: { label: "Notification management", title: "Notification center", description: "Prepare and send operational updates." },
  audit: { label: "Audit logs", title: "Audit trail", description: "Review important changes made across the system." },
  profile: { label: "My profile", title: "Administrator profile", description: "Update your administrator details and profile picture." },
};

const initialRows = {
  users: [],
  catalog: [{ name: "Learning Module Pack", detail: "Academic materials · Grades 10-12", status: "Published", action: "Edit" }, { name: "School Uniform Set", detail: "Uniforms · All students", status: "Published", action: "Edit" }, { name: "School Shoes", detail: "Footwear · All students", status: "Draft", action: "Publish" }],
  allocation: [{ name: "REQ-2024-0157", detail: "Maria Santos · Learning Module Pack", status: "Ready", action: "Assign" }, { name: "REQ-2024-0158", detail: "Joshua Reyes · School Uniform Set", status: "Ready", action: "Assign" }],
  distribution: [{ name: "North Campus collection", detail: "Nov 15, 2024 · 9:00 AM - 12:00 PM", status: "Scheduled", action: "Release" }, { name: "Main Campus collection", detail: "Nov 18, 2024 · 1:00 PM - 4:00 PM", status: "Scheduled", action: "Edit" }],
  campuses: [{ name: "Main Campus", detail: "2,450 students · 18 resources", status: "Operational", action: "Edit" }, { name: "North Campus", detail: "1,120 students · 14 resources", status: "Operational", action: "Edit" }, { name: "South Campus", detail: "840 students · 9 resources", status: "Setup", action: "Edit" }],
  notifications: [{ name: "Collection reminder", detail: "Sent to 64 students · Today, 08:30", status: "Sent", action: "View" }, { name: "Low stock alert", detail: "Inventory team · Yesterday, 16:10", status: "Draft", action: "Send" }],
  audit: [{ name: "Request approved", detail: "Admin · REQ-2024-0157 · 5 minutes ago", status: "Request", action: "View" }, { name: "Inventory received", detail: "Lia Villanueva · 120 Mathematics Books · 1 hour ago", status: "Inventory", action: "View" }, { name: "Schedule created", detail: "Admin · Main Campus · 3 hours ago", status: "Distribution", action: "View" }],
};

function AdminDashboard() {
  const { section: requestedSection } = useParams();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("srmsDashboardTheme");
    return savedTheme ? savedTheme === "dark" : false;
  });
  useEffect(() => {
    localStorage.setItem("srmsDashboardTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);
  const activeSection = sections[requestedSection] ? requestedSection : "dashboard";
  const [rows, setRows] = useState(() => {
    try {
      const savedCatalog = JSON.parse(localStorage.getItem("srmsAdminCatalog") || "null");
      return savedCatalog ? { ...initialRows, catalog: savedCatalog } : initialRows;
    } catch {
      return initialRows;
    }
  });
  const [requests, setRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [userError, setUserError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (activeSection !== "requests") return;
    requestAPI.getAll().then((result) => setRequests(result.requests)).catch((error) => setRequestError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "users") return;
    userAPI.getAll().then((result) => { setUserError(""); setRows((current) => ({ ...current, users: result.users.map((user) => ({ databaseId: user.id, name: user.name, detail: `${user.email} · ${user.role} · ${user.campus}`, status: user.status === "suspended" ? "Suspended" : "Active", action: user.status === "suspended" ? "Restore" : "Suspend" })) })); }).catch((error) => setUserError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "catalog") return;
    resourceAPI.getAll().then((result) => {
      setRows((current) => ({ ...current, catalog: result.resources.map((resource) => ({ databaseId: resource._id, name: resource.name, detail: `${resource.category} · ${resource.campus}`, status: resource.status, action: "Edit" })) }));
    }).catch((error) => setNotice(error.message));
  }, [activeSection]);

  const completeAction = (collection, index, action) => {
    setRows((current) => ({ ...current, [collection]: current[collection].map((row, rowIndex) => rowIndex === index ? { ...row, status: action === "Publish" ? "Published" : action === "Send" ? "Sent" : "Completed", action: "View" } : row) }));
    setNotice(`${action} completed successfully.`);
  };
  const approveRequest = async (request) => {
    try {
      const result = await requestAPI.updateStatus(request.databaseId, "approved");
      setRequests((current) => current.map((item) => item.databaseId === request.databaseId ? result.request : item));
      setNotice("Request approved and moved to allocation.");
    } catch (error) {
      setRequestError(error.message);
    }
  };
  const addResource = async (resource) => {
    const [category, description] = resource.detail.split(" · ");
    const campus = localStorage.getItem("srmsCampus") || "PHINMA University of Pangasinan";
    const result = await resourceAPI.create({ name: resource.name, category, description, campus, quantity: 0 });
    const createdResource = result.resource;
    setRows((current) => ({ ...current, catalog: [...current.catalog, { databaseId: createdResource._id, name: createdResource.name, detail: `${createdResource.category} · ${createdResource.campus}`, status: createdResource.status, action: "Edit" }] }));
    setNotice(`${createdResource.name} was added to the resource catalog and is now available to students.`);
  };
  const updateManagedUser = async (user, status) => {
    try {
      const result = await userAPI.updateStatus(user.databaseId, status);
      setRows((current) => ({ ...current, users: current.users.map((item) => item.databaseId === user.databaseId ? { ...item, status: result.user.status === "suspended" ? "Suspended" : "Active", action: result.user.status === "suspended" ? "Restore" : "Suspend" } : item) }));
      setNotice(`User account ${status === "suspended" ? "suspended" : "restored"} successfully.`);
    } catch (error) {
      setUserError(error.message);
    }
  };
  const deleteManagedUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}'s account permanently?`)) return;
    try {
      await userAPI.delete(user.databaseId);
      setRows((current) => ({ ...current, users: current.users.filter((item) => item.databaseId !== user.databaseId) }));
      setNotice("User account deleted from the database.");
    } catch (error) {
      setUserError(error.message);
    }
  };

  return <div className={`admin-shell ${isDarkMode ? 'dark-mode' : ''}`}><Sidebar type="admin" /><div className="admin-content"><Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} /><main className={`admin-main ${activeSection === "reports" ? "reports-main" : ""} ${activeSection === "profile" ? "profile-main" : ""}`}>
    <div className="admin-topline"><div><span className="dashboard-kicker">Administration / {sections[activeSection].label}</span><h1>{sections[activeSection].title}</h1><p>{sections[activeSection].description}</p></div><button className="admin-primary" onClick={() => setNotice("New workspace action opened. Choose a record below to continue.")}>+ New action</button></div>
    {notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}
    {activeSection === "dashboard" ? <Overview setNotice={setNotice} /> : activeSection === "profile" ? <ProfilePanel setNotice={setNotice} /> : activeSection === "inventory" ? <InventoryPanel setNotice={setNotice} /> : activeSection === "requests" ? <RequestPanel requests={requests} requestError={requestError} approveRequest={approveRequest} /> : activeSection === "users" ? <UserPanel users={rows.users} error={userError} onStatus={updateManagedUser} onDelete={deleteManagedUser} /> : activeSection === "reports" ? <ReportsPanel /> : <RecordPanel section={activeSection} rows={rows[activeSection] || []} onAdd={activeSection === "catalog" ? addResource : null} onAction={(index, action) => completeAction(activeSection, index, action)} />}
  </main></div></div>;
}

function Overview({ setNotice }) { return <>
  <div className="admin-stats"><AdminStat label="Pending requests" value="48" change="12 need review" tone="orange" /><AdminStat label="Available resources" value="1,284" change="92% stock health" tone="blue" /><AdminStat label="Active users" value="2,450" change="+86 this month" tone="green" /><AdminStat label="Scheduled claims" value="632" change="18 this week" tone="navy" /></div>
  <div className="admin-grid"><section className="admin-panel"><PanelHeading title="Needs your attention" description="Prioritized work across the school network" /><div className="attention-list"><Attention icon="!" title="12 requests awaiting approval" detail="Review student eligibility and approve valid requests." action="Review requests" href="/admin/requests" /><Attention icon="+" title="3 resources below reorder level" detail="Receive new stock before the next distribution run." action="Manage inventory" href="/admin/inventory" /><Attention icon="◷" title="2 distribution schedules this week" detail="Confirm release quantities and collection staff." action="View schedule" href="/admin/distribution" /></div></section><section className="admin-panel"><PanelHeading title="Operations snapshot" description="Current fulfillment performance" /><div className="progress-block"><div><span>Request fulfillment</span><strong>78%</strong></div><div className="progress"><i style={{ width: "78%" }} /></div></div><div className="progress-block"><div><span>Inventory accuracy</span><strong>94%</strong></div><div className="progress green"><i style={{ width: "94%" }} /></div></div><div className="progress-block"><div><span>Claim completion</span><strong>63%</strong></div><div className="progress orange"><i style={{ width: "63%" }} /></div></div><button className="text-action" onClick={() => setNotice("Report export prepared for download.")}>Export monthly report →</button></section></div>
  <section className="admin-panel admin-quick"><PanelHeading title="Quick actions" description="Jump straight into common administrator workflows" /><div className="quick-action-grid"><Link to="/admin/requests"><DashboardIcon name="requests" /><span>Review requests<small>Approve and verify</small></span>→</Link><Link to="/admin/inventory"><DashboardIcon name="resources" /><span>Receive resources<small>Update stock levels</small></span>→</Link><Link to="/admin/distribution"><DashboardIcon name="calendar" /><span>Schedule distribution<small>Plan collection windows</small></span>→</Link><Link to="/admin/reports"><DashboardIcon name="history" /><span>View analytics<small>Track performance</small></span>→</Link></div></section>
</>; }
function AdminStat({ label, value, change, tone }) { return <article className={`admin-stat ${tone}`}><span>{label}</span><strong>{value}</strong><small>{change}</small></article>; }
function PanelHeading({ title, description }) { return <div className="admin-panel-heading"><div><h2>{title}</h2><p>{description}</p></div></div>; }
function Attention({ icon, title, detail, action, href }) { return <div className="attention-row"><b>{icon}</b><div><strong>{title}</strong><small>{detail}</small></div><Link to={href}>{action} →</Link></div>; }

function RecordPanel({ section, rows, onAction, onAdd }) { const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ name: "", category: "Academic materials", detail: "" }); const filteredRows = rows.filter((row) => `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())); const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value })); const submit = (event) => { event.preventDefault(); if (!form.name.trim() || !form.detail.trim()) return; onAdd({ name: form.name.trim(), detail: `${form.category} · ${form.detail.trim()}`, status: "Published", action: "Edit" }); setForm({ name: "", category: "Academic materials", detail: "" }); setShowForm(false); }; return <section className="admin-panel record-panel"><div className="record-toolbar"><div><h2>{sections[section].label}</h2><p>{rows.length} records in this workspace</p></div><div className="record-tools">{onAdd && <button className="admin-secondary" onClick={() => setShowForm((visible) => !visible)}>{showForm ? "Close" : "+ Add resource"}</button>}<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." aria-label="Search records" /></div></div>{showForm && <form className="resource-form" onSubmit={submit}><label>Resource name<input value={form.name} onChange={update("name")} placeholder="e.g. Science Laboratory Kit" required /></label><label>Category<select value={form.category} onChange={update("category")}><option>Academic materials</option><option>Uniforms</option><option>Footwear</option><option>Identification</option><option>Other</option></select></label><label>Description or eligibility<input value={form.detail} onChange={update("detail")} placeholder="e.g. Grades 10-12" required /></label><button className="admin-primary" type="submit">Add to catalog</button></form>}<div className="record-list">{filteredRows.map((row, index) => <div className="record-row" key={`${row.name}-${index}`}><div className="record-icon">{row.name.slice(0, 2).toUpperCase()}</div><div className="record-copy"><strong>{row.name}</strong><small>{row.detail}</small></div><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span><button className="row-action" onClick={() => onAction(index, row.action)}>{row.action}</button></div>)}</div>{!filteredRows.length && <div className="empty-state">No matching records found.</div>}</section>; }
function UserPanel({ users, error, onStatus, onDelete }) {
  const [search, setSearch] = useState("");
  const filteredUsers = users.filter((user) => `${user.name} ${user.detail}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="admin-panel record-panel user-management-panel"><div className="record-toolbar"><div><h2>Registered users</h2><p>{users.length} account{users.length === 1 ? "" : "s"} saved in MongoDB.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." aria-label="Search users" /></div>{error && <p className="auth-error" role="alert">{error}</p>}{!error && !filteredUsers.length && <p className="request-empty">No registered users match your search.</p>}<div className="record-list">{filteredUsers.map((user) => <div className="record-row user-record" key={user.databaseId}><div className="record-icon">{user.name.slice(0, 2).toUpperCase()}</div><div className="record-copy"><strong>{user.name}</strong><small>{user.detail}</small></div><span className={`status-pill ${user.status.toLowerCase()}`}>{user.status}</span><button className="row-action" onClick={() => onStatus(user, user.status === "Suspended" ? "active" : "suspended")}>{user.action}</button><button className="row-action delete-action" onClick={() => onDelete(user)}>Delete</button></div>)}</div></section>;
}

function ProfilePanel({ setNotice }) { const { user, updateUser } = useAuth(); const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", avatar: user?.avatar || "" }); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value })); const choosePicture = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/")) return setError("Choose an image file."); if (file.size > 2 * 1024 * 1024) return setError("Profile pictures must be 2 MB or smaller."); const reader = new FileReader(); reader.onload = () => { setForm((current) => ({ ...current, avatar: reader.result })); setError(""); }; reader.readAsDataURL(file); }; const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); setNotice(""); try { await updateUser({ name: form.name.trim(), email: form.email.trim(), avatar: form.avatar }); setNotice("Administrator profile updated successfully."); } catch (updateError) { setError(updateError.message); } finally { setSaving(false); } }; const initials = (form.name || "Admin").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); return <section className="admin-panel profile-panel"><form onSubmit={submit}><div className="profile-hero"><div className="profile-picture">{form.avatar ? <img src={form.avatar} alt="Administrator profile preview" /> : <b>{initials}</b>}</div><div><h2>Profile picture</h2><p>Use a clear image for account identification.</p><label className="upload-button">Choose image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePicture} /></label></div></div><div className="profile-fields"><label>Full name<input value={form.name} onChange={update("name")} required /></label><label>School email<input type="email" value={form.email} onChange={update("email")} required /></label><label>Account role<input value="Administrator" readOnly /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="admin-primary" type="submit" disabled={saving}>{saving ? "Saving changes..." : "Save profile changes"}</button></form></section>; }

function InventoryPanel({ setNotice }) {
  const [items, setItems] = useState([]);
  const [showReceive, setShowReceive] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");

  const loadInventory = () => inventoryAPI.getAll().then((result) => setItems(result.inventory)).catch((loadError) => setError(loadError.message));
  useEffect(() => { loadInventory(); }, []);
  const receive = async (event) => {
    event.preventDefault();
    try {
      await resourceAPI.receive(selectedId, Number(quantity));
      setShowReceive(false);
      setNotice("Stock received and inventory synchronized.");
      loadInventory();
    } catch (receiveError) { setError(receiveError.message); }
  };
  return <section className="admin-panel record-panel inventory-panel"><div className="record-toolbar"><div><h2>Stock overview</h2><p>{items.length} resources synchronized from MongoDB.</p></div><button className="admin-secondary" onClick={() => setShowReceive((visible) => !visible)}>{showReceive ? "Close" : "+ Receive resources"}</button></div>{showReceive && <form className="resource-form" onSubmit={receive}><label>Resource<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required><option value="">Choose resource</option>{items.map((item) => <option key={item.resource._id} value={item.resource._id}>{item.resource.name}</option>)}</select></label><label>Quantity<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label><button className="admin-primary" type="submit">Save intake</button></form>}{error && <p className="auth-error" role="alert">{error}</p>}<div className="inventory-table"><div className="inventory-head"><span>Resource</span><span>Category</span><span>Available</span><span>Reserved</span><span>Total</span></div>{items.map((item) => <div className="inventory-row" key={item._id}><strong>{item.resource.name}</strong><span>{item.resource.category}</span><b className={item.available < 35 ? "low-stock" : ""}>{item.available}</b><span>{item.reserved}</span><span>{item.available + item.reserved + item.issued}</span></div>)}</div><div className="receive-strip"><b>Resource receiving</b><span>Received quantities are written to MongoDB and reflected across the catalog.</span></div></section>;
}

function RequestPanel({ requests, requestError, approveRequest }) { return <section className="admin-panel record-panel"><div className="record-toolbar"><div><h2>Requests awaiting action</h2><p>{requests.length} database request{requests.length === 1 ? "" : "s"} awaiting review.</p></div><select aria-label="Filter requests"><option>All statuses</option><option>Pending</option><option>Approved</option></select></div>{requestError && <p className="auth-error" role="alert">{requestError}</p>}{!requestError && !requests.length && <p className="request-empty">No student requests yet.</p>}<div className="record-list">{requests.map((row) => <div className="record-row" key={row.databaseId}><div className="record-icon">{row.resource.slice(0, 2).toUpperCase()}</div><div className="record-copy"><strong>{row.resource}</strong><small>{row.student?.name || "Student"} · {row.id}</small></div><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span><button className="row-action" disabled={row.status !== "pending"} onClick={() => approveRequest(row)}>{row.status === "pending" ? "Approve" : "View"}</button></div>)}</div><div className="verification-note"><b>Verification checklist</b><span>Confirm student identity, campus eligibility, stock availability, and requested quantity before approval.</span></div></section>; }

function ReportsPanel() { return <><div className="report-cards"><AdminStat label="Requests fulfilled" value="86%" change="+8.4% vs last month" tone="green" /><AdminStat label="Average approval time" value="1.8d" change="0.4d faster" tone="blue" /><AdminStat label="Distribution success" value="93%" change="Across 4 campuses" tone="orange" /></div><section className="admin-panel chart-panel"><div className="report-heading"><PanelHeading title="Demand by resource category" description="Approved requests over the last 30 days" /><div className="report-heading-icon"><DashboardIcon name="performance" /></div></div><div className="chart-summary"><span><i />Approved request share</span><b>Last 30 days</b></div><div className="bar-chart"><div><i data-value="72%" style={{ height: "72%" }} /><span>Academic</span></div><div><i data-value="48%" style={{ height: "48%" }} /><span>Uniforms</span></div><div><i data-value="86%" style={{ height: "86%" }} /><span>Footwear</span></div><div><i data-value="35%" style={{ height: "35%" }} /><span>IDs</span></div><div><i data-value="61%" style={{ height: "61%" }} /><span>Other</span></div></div></section></>; }

export default AdminDashboard;
