import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/useAuth";
import { allocationAPI, distributionAPI, inventoryAPI, reportsAPI, requestAPI, resourceAPI, userAPI } from "../../services/api";
import { CampusPanel, NotificationsPanel, ReportsPanel, DistributionPanel, CreateUserForm } from "../../components/ManagementPanels";
import DashboardIcon from "../../components/DashboardIcon";

const sections = {
  dashboard: { label: "Overview", title: "Welcome back, Admin!", description: "A live view of school resource operations." },
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

const emptyRows = {
  users: [],
  catalog: [],
  allocation: [],
  distribution: [],
  campuses: [],
  notifications: [],
  audit: [],
};

const resourceImageByName = (name = "") => {
  const normalized = name.toLowerCase();
  if (normalized.includes("mathematics")) return "/mathematics-book.svg";
  return "";
};

const resourceInitials = (name = "Resource") => {
  const words = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]).join("").toUpperCase() || "RS";
};

function AdminDashboard() {
  const { user } = useAuth();
  const { section: requestedSection } = useParams();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("srmsDashboardTheme");
    return savedTheme ? savedTheme === "dark" : false;
  });
  useEffect(() => {
    localStorage.setItem("srmsDashboardTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);
  const activeSection = sections[requestedSection] ? requestedSection : "dashboard";
  const [rows, setRows] = useState(emptyRows);
  const [overviewData, setOverviewData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [workflowRows, setWorkflowRows] = useState({ allocation: [], distribution: [] });
  const [staffMembers, setStaffMembers] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [userError, setUserError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (activeSection === "dashboard") {
      reportsAPI.getDashboardOverview()
        .then((result) => setOverviewData(result?.overview || result || {}))
        .catch((error) => setNotice(error.message));
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "audit") return;
    reportsAPI.getAuditLogReport()
      .then((result) => {
        const logs = result?.logs || [];
        setRows((current) => ({
          ...current,
          audit: logs.map((log, index) => ({
            databaseId: log.entityId || `${log.action}-${index}`,
            name: log.action,
            detail: `${log.actor || "Unknown"} · ${log.entity || "System"} · ${new Date(log.timestamp).toLocaleString()}`,
            status: log.statusChange && log.statusChange !== "N/A" ? log.statusChange : "Recorded",
            action: "View",
          })),
        }));
      })
      .catch((error) => setNotice(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "requests") return;
    requestAPI.getAll().then((result) => setRequests(result.requests)).catch((error) => setRequestError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "users") return;
    userAPI.getAll().then((result) => { setUserError(""); setRows((current) => ({ ...current, users: result.users.map((user) => ({ databaseId: user.id, name: user.name, detail: `${user.email} · ${user.role} · ${user.campus}`, status: user.status, action: user.status === "suspended" ? "Restore" : "Suspend" })) })); }).catch((error) => setUserError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "catalog") return;
    resourceAPI.getAll().then((result) => {
      setRows((current) => ({ ...current, catalog: result.resources.map((resource) => ({ databaseId: resource._id, name: resource.name, detail: `${resource.category} · ${resource.campus}`, status: resource.status, action: "Edit" })) }));
    }).catch((error) => setNotice(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "allocation") {
      Promise.all([allocationAPI.getAll(), userAPI.getAll()]).then(([allocationResult, userResult]) => {
        setStaffMembers(userResult.users.filter((user) => user.role === "staff" && user.status !== "suspended"));
        setWorkflowRows((current) => ({ ...current, allocation: (allocationResult.allocations || []).map((allocation) => ({
          databaseId: allocation._id,
          name: allocation.student?.studentId || allocation.student?.id || `Student ${String(allocation._id).slice(-6)}`,
          detail: `${allocation.student?.name || "Student"} · ${allocation.resource?.name || "Resource"} · ${allocation.quantity} unit(s)`,
          status: allocation.status,
          action: "View",
          assignedStaff: allocation.assignedStaff,
        })) }));
      }).catch((error) => setNotice(error.message));
    }
    if (activeSection === "distribution") {
      distributionAPI.getAllSchedules().then((result) => {
        setWorkflowRows((current) => ({ ...current, distribution: (result.schedules || []).map((schedule) => ({
          databaseId: schedule._id,
          name: schedule.resource?.name || "Resource claim",
          detail: `${schedule.student?.name || "Student"} · ${schedule.pickupDate ? new Date(schedule.pickupDate).toLocaleDateString() : "Date not set"} · ${schedule.location}`,
          status: schedule.status,
          action: "View",
        })) }));
      }).catch((error) => setNotice(error.message));
    }
  }, [activeSection]);

  const completeAction = async (collection, databaseId, action) => {
    if (collection !== "catalog" || action !== "Edit") return;
    const row = rows.catalog.find(item => item.databaseId === databaseId);
    const name = window.prompt("Resource name", row.name);
    if (!name?.trim()) return;
    try {
      const result = await resourceAPI.update(databaseId, { name: name.trim() });
      setRows(current => ({ ...current, catalog: current.catalog.map(item => item.databaseId === databaseId ? { ...item, name: result.resource.name } : item) }));
      setNotice("Resource updated.");
    } catch (error) { setNotice(error.message); }
  };
  const approveRequest = async (request) => {
    try {
      if (request.eligibilityStatus !== "eligible") {
        await requestAPI.verifyEligibility(request.databaseId, { eligible: true });
      }
      const result = await requestAPI.approve(request.databaseId, {});
      setRequests((current) => current.map((item) => item.databaseId === request.databaseId ? result.request : item));
      setNotice("Request approved and moved to allocation.");
    } catch (error) {
      setRequestError(error.message);
    }
  };
  const addResource = async (resource) => {
    const [category, description] = resource.detail.split(" · ");
    const campus = user.activeCampus || user.campus;
    const result = await resourceAPI.create({ name: resource.name, category, description, campus, quantity: 0 });
    const createdResource = result.resource;
    setRows((current) => ({ ...current, catalog: [...current.catalog, { databaseId: createdResource._id, name: createdResource.name, detail: `${createdResource.category} · ${createdResource.campus}`, status: createdResource.status, action: "Edit" }] }));
    setNotice(`${createdResource.name} was added to the resource catalog and is now available to students.`);
  };
  const updateManagedUser = async (user, status) => {
    try {
      const result = await userAPI.updateStatus(user.databaseId, status);
      setRows((current) => ({ ...current, users: current.users.map((item) => item.databaseId === user.databaseId ? { ...item, status: result.user.status, action: result.user.status === "suspended" ? "Restore" : "Suspend" } : item) }));
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
  const assignAllocation = async (allocation, staffId) => {
    if (!staffId) return;
    try {
      const result = await allocationAPI.assignStaff(allocation.databaseId, staffId);
      setWorkflowRows((current) => ({ ...current, allocation: current.allocation.map((item) => item.databaseId === allocation.databaseId ? { ...item, assignedStaff: result.allocation.assignedStaff } : item) }));
      setNotice(`${staffMembers.find((staff) => staff.id === staffId)?.name || "Staff member"} was assigned to distribute this request.`);
    } catch (error) { setNotice(error.message); }
  };

  return <div className={`admin-shell organized-workspace ${isDarkMode ? 'dark-mode' : ''}`}><Sidebar type="admin" /><div className="admin-content"><Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} /><main className={`admin-main ${activeSection === "reports" ? "reports-main" : ""} ${activeSection === "profile" ? "profile-main" : ""}`}>
    <div className="admin-topline"><div><span className="dashboard-kicker">Administration / {sections[activeSection].label}</span><h1>{sections[activeSection].title}</h1><p>{sections[activeSection].description}</p></div></div>
    {notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}
    {activeSection === "dashboard" ? <Overview overview={overviewData} /> : activeSection === "profile" ? <ProfilePanel setNotice={setNotice} /> : activeSection === "inventory" ? <InventoryPanel setNotice={setNotice} /> : activeSection === "requests" ? <RequestPanel requests={requests} requestError={requestError} approveRequest={approveRequest} /> : activeSection === "users" ? <UserPanel onCreated={user => setRows(current => ({ ...current, users: [...current.users, { databaseId: user.id, name: user.name, detail: `${user.email} ? ${user.role} ? ${user.campus}`, status: user.status, action: "Suspend" }] }))} users={rows.users} error={userError} onStatus={updateManagedUser} onDelete={deleteManagedUser} /> : activeSection === "allocation" ? <AllocationPanel rows={workflowRows.allocation} staffMembers={staffMembers} onAssign={assignAllocation} /> : activeSection === "distribution" ? <DistributionPanel /> : activeSection === "campuses" ? <CampusPanel /> : activeSection === "notifications" ? <NotificationsPanel /> : activeSection === "reports" ? <ReportsPanel /> : <RecordPanel section={activeSection} rows={workflowRows[activeSection] || rows[activeSection] || []} onAdd={activeSection === "catalog" ? addResource : null} onAction={(index, action) => completeAction(activeSection, index, action)} />}
  </main></div></div>;
}

function Overview({ overview }) {
  const summary = overview || {};
  const pendingRequests = Number(summary.pendingRequests || summary.pending_requests || 0);
  const availableResources = Number(summary.availableResources || summary.available_resources || 0);
  const activeUsers = Number(summary.activeUsers || summary.active_users || 0);
  const scheduledClaims = Number(summary.scheduledClaims || summary.scheduled_claims || 0);
  const resourcesReleased = Number(summary.resourcesReleased || summary.resources_released || summary.distributions?.total || 0);
  const fulfillmentRate = Number(summary.requests?.completionRate || 0);
  const approvalRate = Number(summary.requests?.approvalRate || 0);

  return <>
  <div className="admin-stats"><AdminStat label="Pending requests" value={pendingRequests} change="Live from system" tone="orange" /><AdminStat label="Available resources" value={availableResources} change="Current inventory" tone="blue" /><AdminStat label="Active users" value={activeUsers} change="Registered accounts" tone="green" /><AdminStat label="Scheduled claims" value={scheduledClaims} change="Live schedule count" tone="navy" /></div>
  <div className="admin-grid"><section className="admin-panel"><PanelHeading title="Needs your attention" description="Prioritized work across the school network" /><div className="attention-list"><Attention icon="!" title={`${pendingRequests} requests awaiting approval`} detail="Review student eligibility and approve valid requests." action="Review requests" href="/admin/requests" /><Attention icon="+" title={`${availableResources} resources in stock`} detail="Monitor inventory levels and receive new stock as needed." action="Manage inventory" href="/admin/inventory" /><Attention icon="◷" title={`${scheduledClaims} scheduled claims`} detail="Confirm release quantities and collection staff." action="View schedule" href="/admin/distribution" /></div></section><section className="admin-panel"><PanelHeading title="Operations snapshot" description="Current fulfillment performance" /><div className="progress-block"><div><span>Request fulfillment</span><strong>{fulfillmentRate}%</strong></div><div className="progress"><i style={{ width: `${Math.min(100, Math.max(0, fulfillmentRate))}%` }} /></div></div><div className="progress-block"><div><span>Approval rate</span><strong>{approvalRate}%</strong></div><div className="progress green"><i style={{ width: `${Math.min(100, Math.max(0, approvalRate))}%` }} /></div></div><div className="progress-block"><div><span>Resources released</span><strong>{resourcesReleased}</strong></div><div className="progress orange"><i style={{ width: `${resourcesReleased ? 100 : 0}%` }} /></div></div></section></div>
  <section className="admin-panel admin-quick"><PanelHeading title="Quick actions" description="Jump straight into common administrator workflows" /><div className="quick-action-grid"><Link to="/admin/requests"><DashboardIcon name="requests" /><span>Review requests<small>Approve and verify</small></span>→</Link><Link to="/admin/inventory"><DashboardIcon name="resources" /><span>Receive resources<small>Update stock levels</small></span>→</Link><Link to="/admin/distribution"><DashboardIcon name="calendar" /><span>Schedule distribution<small>Plan collection windows</small></span>→</Link><Link to="/admin/reports"><DashboardIcon name="history" /><span>View analytics<small>Track performance</small></span>→</Link></div></section>
</>; }
function AdminStat({ label, value, change, tone }) { return <article className={`admin-stat ${tone}`}><span>{label}</span><strong>{value}</strong><small>{change}</small></article>; }
function PanelHeading({ title, description }) { return <div className="admin-panel-heading"><div><h2>{title}</h2><p>{description}</p></div></div>; }
function Attention({ icon, title, detail, action, href }) { return <div className="attention-row"><b>{icon}</b><div><strong>{title}</strong><small>{detail}</small></div><Link to={href}>{action} →</Link></div>; }

function RecordPanel({ section, rows, onAction, onAdd }) { const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ name: "", category: "Academic materials", detail: "" }); const filteredRows = rows.filter((row) => `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())); const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value })); const submit = async (event) => { event.preventDefault(); if (!form.name.trim() || !form.detail.trim()) return; try { await onAdd({ name: form.name.trim(), detail: `${form.category} · ${form.detail.trim()}`, status: "Published", action: "Edit" }); setForm({ name: "", category: "Academic materials", detail: "" }); setShowForm(false); } catch (error) { window.alert(error.message); } }; return <section className="admin-panel record-panel"><div className="record-toolbar"><div><h2>{sections[section].label}</h2><p>{rows.length} records in this workspace</p></div><div className="record-tools">{onAdd && <button className="admin-secondary" onClick={() => setShowForm((visible) => !visible)}>{showForm ? "Close" : "+ Add resource"}</button>}<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." aria-label="Search records" /></div></div>{showForm && <form className="resource-form" onSubmit={submit}><label>Resource name<input value={form.name} onChange={update("name")} placeholder="e.g. Science Laboratory Kit" required /></label><label>Category<select value={form.category} onChange={update("category")}><option>Academic materials</option><option>Uniforms</option><option>Footwear</option><option>Identification</option><option>Other</option></select></label><label>Description or eligibility<input value={form.detail} onChange={update("detail")} placeholder="e.g. Grades 10-12" required /></label><button className="admin-primary" type="submit">Add to catalog</button></form>}<div className="record-list">{filteredRows.map((row, index) => <div className="record-row" key={`${row.name}-${index}`}><div className="record-icon">{row.name.slice(0, 2).toUpperCase()}</div><div className="record-copy"><strong>{row.name}</strong><small>{row.detail}</small></div><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span><button className="row-action" disabled={row.action === "View"} onClick={() => onAction(row.databaseId, row.action)}>{row.action}</button></div>)}</div>{!filteredRows.length && <div className="empty-state">No matching records found.</div>}</section>; }
function UserPanel({ users, error, onStatus, onDelete, onCreated }) {
  const [search, setSearch] = useState("");
  const filteredUsers = users.filter((user) => `${user.name} ${user.detail}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="admin-panel record-panel user-management-panel"><CreateUserForm onCreated={onCreated} /><div className="record-toolbar"><div><h2>Registered users</h2><p>{users.length} account{users.length === 1 ? "" : "s"} saved in MongoDB.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." aria-label="Search users" /></div>{error && <p className="auth-error" role="alert">{error}</p>}{!error && !filteredUsers.length && <p className="request-empty">No registered users match your search.</p>}<div className="record-list">{filteredUsers.map((user) => <div className="record-row user-record" key={user.databaseId}><div className="record-icon">{user.name.slice(0, 2).toUpperCase()}</div><div className="record-copy"><strong>{user.name}</strong><small>{user.detail}</small></div><span className={`status-pill ${user.status.toLowerCase()}`}>{user.status}</span><button className="row-action" onClick={() => onStatus(user, user.status === "suspended" ? "active" : "suspended")}>{user.action}</button><button className="row-action delete-action" onClick={() => onDelete(user)}>Delete</button></div>)}</div></section>;
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
  return <section className="admin-panel record-panel inventory-panel"><div className="record-toolbar"><div><h2>Stock overview</h2><p>{items.length} resources synchronized from MongoDB.</p></div><button className="admin-secondary" onClick={() => setShowReceive((visible) => !visible)}>{showReceive ? "Close" : "+ Receive resources"}</button></div>{showReceive && <form className="resource-form" onSubmit={receive}><label>Resource<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required><option value="">Choose resource</option>{items.map((item) => <option key={item.resource._id} value={item.resource._id}>{item.resource.name}</option>)}</select></label><label>Quantity<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label><button className="admin-primary" type="submit">Save intake</button></form>}{error && <p className="auth-error" role="alert">{error}</p>}<div className="inventory-table"><div className="inventory-head"><span>Resource</span><span>Category</span><span>Available</span><span>Reserved</span><span>Total</span></div>{items.map((item) => <div className="inventory-row" key={item.id || item._id}><strong>{item.resource.name}</strong><span>{item.resource.category}</span><b className={item.available < 35 ? "low-stock" : ""}>{item.available}</b><span>{item.reserved}</span><span>{item.available + item.reserved + item.issued}</span></div>)}</div><div className="receive-strip"><b>Resource receiving</b><span>Received quantities are written to MongoDB and reflected across the catalog.</span></div></section>;
}

function RequestPanel({ requests, requestError, approveRequest }) { const [status, setStatus] = useState(""); const filtered = requests.filter(r => !status || r.status === status); return <section className="admin-panel record-panel"><div className="record-toolbar"><div><h2>Requests awaiting action</h2><p>{requests.length} database request{requests.length === 1 ? "" : "s"} awaiting review.</p></div><select aria-label="Filter requests" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{["pending", "approved", "rejected", "cancelled", "ready_for_claim", "claimed", "released", "completed"].map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></div>{requestError && <p className="auth-error" role="alert">{requestError}</p>}{!requestError && !requests.length && <p className="request-empty">No student requests yet.</p>}<div className="record-list">{filtered.map((row) => { const resourceName = row.resourceName || row.resource || "Resource"; const resourceImage = resourceImageByName(resourceName); return <div className="record-row" key={row.databaseId}><div className="record-avatar">{resourceImage ? <img src={resourceImage} alt={resourceName} /> : <span>{resourceInitials(resourceName)}</span>}</div><div className="record-copy"><strong>{resourceName}</strong><small>{row.student?.name || "Student"} · ID: {row.studentId || row.student?.studentId || row.student?.id || "N/A"} · {row.id}</small></div><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span><button className="row-action" disabled={row.status !== "pending"} onClick={() => approveRequest(row)}>{row.status === "pending" ? "Approve" : "View"}</button></div>; })}</div><div className="verification-note"><b>Verification checklist</b><span>Confirm student identity, campus eligibility, stock availability, and requested quantity before approval.</span></div></section>; }

function AllocationPanel({ rows, staffMembers, onAssign }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const filteredRows = rows.filter((row) => {
    const matchesSearch = `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "All statuses" || row.status === status;
    return matchesSearch && matchesStatus;
  });
  const assignedCount = rows.filter((row) => row.assignedStaff).length;

  return <section className="admin-panel record-panel allocation-panel">
    <div className="record-toolbar"><div><h2>Resource allocations</h2><p>{assignedCount} assigned · {rows.length - assignedCount} awaiting distributor assignment.</p></div><div className="record-tools"><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter allocations by status"><option>All statuses</option>{[...new Set(rows.map((row) => row.status))].map((value) => <option key={value}>{value}</option>)}</select><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search allocations..." aria-label="Search allocations" /></div></div>
    {!filteredRows.length && <p className="request-empty">No allocations match the current filters.</p>}
    <div className="record-list allocation-list">{filteredRows.map((row) => <div className="record-row allocation-row" key={row.databaseId}>
      <div className="record-icon">{row.name.slice(0, 2).toUpperCase()}</div>
      <div className="record-copy"><strong>{row.name}</strong><small>{row.detail}</small></div>
      <div className="allocation-meta"><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span><label className="assignment-control"><span>Distributor</span><select aria-label={`Assign staff for ${row.name}`} value={row.assignedStaff?._id || row.assignedStaff || ""} onChange={(event) => onAssign(row, event.target.value)}><option value="">Unassigned</option>{staffMembers.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></label></div>
    </div>)}</div>
  </section>;
}


export default AdminDashboard;
