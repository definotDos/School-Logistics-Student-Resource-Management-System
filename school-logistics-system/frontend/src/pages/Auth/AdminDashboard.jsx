import RequestPanel from "../../components/AdminRequestPanel";
import AuditLogPanel from "../../components/AuditLogPanel";
import StudentIdEditor from "../../components/StudentIdEditor";
import ProfilePanel from "../../components/ProfilePanel";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/useAuth";
import { allocationAPI, distributionAPI, inventoryAPI, reportsAPI, requestAPI, resourceAPI, userAPI } from "../../services/api";
import { CampusPanel, NotificationsPanel, ReportsPanel, DistributionPanel, CreateUserForm } from "../../components/ManagementPanels";
import DashboardIcon from "../../components/DashboardIcon";
import { getResourceImage } from "../../utils/resourceImages";
import { campuses } from "../../data/campuses";
import "./AdminDashboard.css";

const sections = {
  dashboard: { label: "Overview", title: "Welcome back, Admin!", description: "A live view of school resource operations." },
  users: { label: "User management", title: "Users and permissions", description: "Manage student, staff, and administrator access." },
  catalog: { label: "Resource catalog", title: "Resource catalog", description: "Keep the school resource directory accurate and useful." },
  inventory: { label: "Inventory", title: "Inventory control", description: "Track stock, reserved units, and receiving activity." },
  requests: { label: "Request approval", title: "Request review queue", description: "Approve, verify, and route student resource requests." },
  allocation: { label: "Allocation", title: "Resource allocation", description: "Assign approved resources to students and campuses." },
  distribution: { label: "Distribution scheduling", title: "Distribution schedule", description: "Plan collection windows and release resources." },
  campuses: { label: "Campus management", title: "Schools and campuses", description: "Keep campus locations, contact details, and availability up to date." },
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
  const activeCampus = campuses.find((campus) => campus.name === user?.activeCampus);
  const [rows, setRows] = useState(emptyRows);
  const [overviewData, setOverviewData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [workflowRows, setWorkflowRows] = useState({ allocation: [], distribution: [] });
  const [staffMembers, setStaffMembers] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [userError, setUserError] = useState("");
  const [accountCreationReady, setAccountCreationReady] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (activeSection === "dashboard") {
      reportsAPI.getDashboardOverview()
        .then((result) => setOverviewData(result?.overview || result || {}))
        .catch((error) => setNotice(error.message));
    }
  }, [activeSection]);



  useEffect(() => {
    if (activeSection !== "requests") return;
    let cancelled = false;
    requestAPI.getAll().then((result) => { if (!cancelled) { setRequests(result.requests || []); setRequestError(""); } }).catch((error) => { if (!cancelled) setRequestError(error.message); }).finally(() => { if (!cancelled) setRequestsLoading(false); });
    return () => { cancelled = true; };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "users") return;
    userAPI.getAll().then((result) => { setAccountCreationReady(result.accountCreationReady !== false); setUserError(""); setRows((current) => ({ ...current, users: result.users.map((user) => ({ databaseId: user.id, name: user.name, email: user.email, studentId: user.studentId, avatar: user.avatar || "", role: user.role, campus: user.campus, detail: `${user.email} · ${user.role} · ${user.campus}`, status: user.status, action: user.status === "suspended" ? "Restore" : "Suspend" })) })); }).catch((error) => setUserError(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "catalog") return;
    resourceAPI.getAll().then((result) => {
      setRows((current) => ({ ...current, catalog: result.resources.map((resource) => ({ databaseId: resource._id, name: resource.name, image: getResourceImage(resource), detail: `${resource.category} · ${resource.campus}`, status: resource.status, action: "Edit" })) }));
    }).catch((error) => setNotice(error.message));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "allocation") {
      Promise.all([allocationAPI.getAll(), userAPI.getAll()]).then(([allocationResult, userResult]) => {
        setStaffMembers(userResult.users.filter((user) => user.role === "staff" && user.status !== "suspended"));
        setWorkflowRows((current) => ({ ...current, allocation: (allocationResult.allocations || []).map((allocation) => ({
          databaseId: allocation._id,
          studentName: allocation.student?.name || "Student",
          resourceName: allocation.resource?.name || "Resource",
          quantity: allocation.quantity,
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
    setRequestError("");
    try {
      if (request.eligibilityStatus !== "eligible") {
        await requestAPI.verifyEligibility(request.databaseId, { eligible: true, notes: request.notes || "" });
      }
      const result = await requestAPI.approve(request.databaseId, {});
      setRequests((current) => current.map((item) => item.databaseId === request.databaseId ? result.request : item));
      setNotice("Request approved and moved to allocation.");
      return result.request;
    } catch (error) {
      setRequestError(error.message);
      return null;
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
    <div className="admin-topline"><div className="admin-title-copy"><span className="dashboard-kicker">Administration / {sections[activeSection].label}</span><h1>{sections[activeSection].title}</h1><p>{sections[activeSection].description}</p></div><div className="admin-campus-context"><span className="admin-context-icon">{activeCampus?.logo ? <img className="admin-context-logo" src={activeCampus.logo} alt={`${activeCampus.shortName} logo`} /> : <DashboardIcon name="school" />}</span><div><small>Campus workspace</small><strong>{user?.activeCampus || "All campuses"}</strong></div></div></div>
    {notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}
    {activeSection === "dashboard" ? <Overview overview={overviewData} /> : activeSection === "audit" ? <AuditLogPanel /> : activeSection === "profile" ? <ProfilePanel setNotice={setNotice} /> : activeSection === "inventory" ? <InventoryPanel setNotice={setNotice} /> : activeSection === "requests" ? <RequestPanel loading={requestsLoading} requests={requests} requestError={requestError} approveRequest={approveRequest} /> : activeSection === "users" ? <UserPanel accountCreationReady={accountCreationReady} onIdUpdated={result => { setAccountCreationReady(result.accountCreationReady); setRows(current => ({ ...current, users: current.users.map(item => item.databaseId === result.user.id ? { ...item, studentId: result.user.studentId } : item) })); }} onCreated={user => setRows(current => ({ ...current, users: [...current.users, { databaseId: user.id, name: user.name, email: user.email, studentId: user.studentId, avatar: user.avatar || "", role: user.role, campus: user.campus, detail: `${user.email} ? ${user.role} ? ${user.campus}`, status: user.status, action: "Suspend" }] }))} users={rows.users} error={userError} onStatus={updateManagedUser} onDelete={deleteManagedUser} /> : activeSection === "allocation" ? <AllocationPanel rows={workflowRows.allocation} staffMembers={staffMembers} onAssign={assignAllocation} /> : activeSection === "distribution" ? <DistributionPanel /> : activeSection === "campuses" ? <CampusPanel /> : activeSection === "notifications" ? <NotificationsPanel /> : activeSection === "reports" ? <ReportsPanel /> : <RecordPanel section={activeSection} rows={workflowRows[activeSection] || rows[activeSection] || []} onAdd={activeSection === "catalog" ? addResource : null} onAction={(index, action) => completeAction(activeSection, index, action)} />}
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

  return <div className="admin-overview">
  <section className="admin-metrics" aria-labelledby="admin-metrics-title"><div className="admin-section-heading"><div><h2 id="admin-metrics-title">At a glance</h2><p>Your resource operations in one place</p></div><span>Overview</span></div><div className="admin-stats"><AdminStat label="Pending requests" value={pendingRequests} change="Live from system" tone="orange" /><AdminStat label="Available resources" value={availableResources} change="Current inventory" tone="blue" /><AdminStat label="Active users" value={activeUsers} change="Registered accounts" tone="green" /><AdminStat label="Scheduled claims" value={scheduledClaims} change="Live schedule count" tone="navy" /></div></section>
  <section className="admin-panel admin-quick"><PanelHeading title="Quick actions" description="Jump straight into common administrator workflows" /><div className="quick-action-grid"><Link to="/admin/requests"><DashboardIcon name="requests" /><span>Review requests<small>Approve and verify</small></span>→</Link><Link to="/admin/inventory"><DashboardIcon name="inventory" /><span>Receive resources<small>Update stock levels</small></span>→</Link><Link to="/admin/distribution"><DashboardIcon name="calendar" /><span>Schedule distribution<small>Plan collection windows</small></span>→</Link><Link to="/admin/reports"><DashboardIcon name="reports" /><span>View analytics<small>Track performance</small></span>→</Link></div></section>
  <div className="admin-grid"><section className="admin-panel"><PanelHeading title="Needs your attention" description="Prioritized work across the school network" /><div className="attention-list"><Attention icon="studentRequests" title={`${pendingRequests} requests awaiting approval`} detail="Review student eligibility and approve valid requests." action="Review requests" href="/admin/requests" /><Attention icon="inventory" title={`${availableResources} resources in stock`} detail="Monitor inventory levels and receive new stock as needed." action="Manage inventory" href="/admin/inventory" /><Attention icon="claimCalendar" title={`${scheduledClaims} scheduled claims`} detail="Confirm release quantities and collection staff." action="View schedule" href="/admin/distribution" /></div></section><section className="admin-panel"><PanelHeading title="Operations snapshot" description="Current fulfillment performance" /><div className="progress-block"><div><span>Request fulfillment</span><strong>{fulfillmentRate}%</strong></div><div className="progress"><i style={{ width: `${Math.min(100, Math.max(0, fulfillmentRate))}%` }} /></div></div><div className="progress-block"><div><span>Approval rate</span><strong>{approvalRate}%</strong></div><div className="progress green"><i style={{ width: `${Math.min(100, Math.max(0, approvalRate))}%` }} /></div></div><div className="progress-block"><div><span>Resources released</span><strong>{resourcesReleased}</strong></div><div className="progress orange"><i style={{ width: `${resourcesReleased ? 100 : 0}%` }} /></div></div></section></div>
</div>; }
function AdminStat({ label, value, change, tone }) {
  const icon = { orange: "studentRequests", blue: "inventory", green: "users", navy: "claimCalendar" }[tone];
  return <article className={`admin-stat ${tone}`}>
    <div className="admin-stat-heading"><span>{label}</span><span className="admin-stat-icon" aria-hidden="true"><DashboardIcon name={icon} /></span></div>
    <strong>{value.toLocaleString()}</strong>
    <small>{change}</small>
  </article>;
}
function PanelHeading({ title, description }) { return <div className="admin-panel-heading"><div><h2>{title}</h2><p>{description}</p></div></div>; }
function Attention({ icon, title, detail, action, href }) { return <div className="attention-row" data-icon={icon}><b aria-hidden="true"><DashboardIcon name={icon} /></b><div><strong>{title}</strong><small>{detail}</small></div><Link to={href}>{action} →</Link></div>; }

function ResourceThumbnail({ resource }) {
  const [failedImage, setFailedImage] = useState("");
  const image = getResourceImage(resource);
  return <div className="record-icon resource-thumbnail">
    {image && image !== failedImage
      ? <img src={image} alt={resource.name} loading="lazy" onError={() => setFailedImage(image)} />
      : <span aria-hidden="true">{resource.name.slice(0, 2).toUpperCase()}</span>}
  </div>;
}

function RecordPanel({ section, rows, onAction, onAdd }) { const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ name: "", category: "Academic materials", detail: "" }); const filteredRows = rows.filter((row) => `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase())); const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value })); const submit = async (event) => { event.preventDefault(); if (!form.name.trim() || !form.detail.trim()) return; try { await onAdd({ name: form.name.trim(), detail: `${form.category} · ${form.detail.trim()}`, status: "Published", action: "Edit" }); setForm({ name: "", category: "Academic materials", detail: "" }); setShowForm(false); } catch (error) { window.alert(error.message); } }; return <section className="admin-panel record-panel"><div className="record-toolbar"><div><h2>{sections[section].label}</h2><p>{rows.length} records in this workspace</p></div><div className="record-tools">{onAdd && <button className="admin-secondary" onClick={() => setShowForm((visible) => !visible)}>{showForm ? "Close" : "+ Add resource"}</button>}<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." aria-label="Search records" /></div></div>{showForm && <form className="resource-form" onSubmit={submit}><label>Resource name<input value={form.name} onChange={update("name")} placeholder="e.g. Science Laboratory Kit" required /></label><label>Category<select value={form.category} onChange={update("category")}><option>Academic materials</option><option>Uniforms</option><option>Footwear</option><option>Identification</option><option>Other</option></select></label><label>Description or eligibility<input value={form.detail} onChange={update("detail")} placeholder="e.g. Grades 10-12" required /></label><button className="admin-primary" type="submit">Add to catalog</button></form>}<div className="record-list">{filteredRows.map((row, index) => <div className="record-row" key={`${row.name}-${index}`}>{section === "catalog" ? <ResourceThumbnail resource={row} /> : <div className="record-icon">{row.name.slice(0, 2).toUpperCase()}</div>}<div className="record-copy"><strong>{row.name}</strong><small>{row.detail}</small></div><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span><button className="row-action" disabled={row.action === "View"} onClick={() => onAction(row.databaseId, row.action)}>{row.action}</button></div>)}</div>{!filteredRows.length && <div className="empty-state">No matching records found.</div>}</section>; }
function UserPanel({ users, error, onStatus, onDelete, onCreated, onIdUpdated, accountCreationReady }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.studentId || ""} ${user.campus}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (!role || user.role === role) && (!status || user.status === status)
  ).sort((a, b) => a.name.localeCompare(b.name));
  const hasFilters = search || role || status;
  const clearFilters = () => { setSearch(""); setRole(""); setStatus(""); };

  return <section className="admin-panel record-panel user-management-panel users-organized">
    <div className="users-heading"><div><h2>Registered users <span>{users.length}</span></h2><p>Manage accounts and access across your school.</p></div></div>
    <div className="users-summary" aria-label="Account summary">
      {[['Total users', users.length, 'blue'], ['Active', users.filter(user => user.status === 'active').length, 'green'], ['Suspended', users.filter(user => user.status === 'suspended').length, 'rose']].map(([label, count, tone]) => <div key={label} data-summary-tone={tone}><span>{label}</span><strong>{count}</strong></div>)}
    </div>
    <div className="users-create">{accountCreationReady ? <CreateUserForm onCreated={onCreated} /> : <p className="account-review-notice" role="status">New accounts are paused while existing student IDs are reviewed. Correct duplicate IDs below using the school roster. Select All campuses to review every account. Login remains available.</p>}</div>
    <div className="users-filters">
      <label className="users-search">Search users<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email, student ID, or campus" /></label>
      <label>Role<select value={role} onChange={event => setRole(event.target.value)}><option value="">All roles</option><option value="student">Student</option><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
      <label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
      {hasFilters && <button className="row-action" onClick={clearFilters}>Clear filters</button>}
    </div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <div className="users-table-wrap"><table className="users-table">
      <caption className="users-results" aria-live="polite">Showing {filteredUsers.length} of {users.length} users ? Name A?Z</caption>
      <thead><tr><th scope="col">User</th><th scope="col">Student ID</th><th scope="col">Role</th><th scope="col">Campus</th><th scope="col">Status</th><th scope="col" className="users-actions-heading">Actions</th></tr></thead>
      <tbody>{filteredUsers.map(user => <tr key={user.databaseId}>
        <td><div className="users-identity"><span className="users-avatar" aria-hidden="true">{user.avatar ? <img src={user.avatar} alt="" /> : user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td>
        <td>{user.role === "student" ? <StudentIdEditor user={user} onUpdated={onIdUpdated} /> : "?"}</td>
        <td><span className={`users-role ${user.role}`}>{user.role}</span></td>
        <td className="users-campus">{user.campus || 'Unassigned'}</td>
        <td><span className={`users-status ${user.status}`}>{user.status}</span></td>
        <td><div className="users-actions"><button className="row-action" aria-label={`${user.status === 'suspended' ? 'Restore' : 'Suspend'} ${user.name}`} onClick={() => onStatus(user, user.status === "suspended" ? "active" : "suspended")}>{user.status === 'suspended' ? 'Restore' : 'Suspend'}</button><button className="row-action delete-action" aria-label={`Delete ${user.name}`} onClick={() => onDelete(user)}>Delete</button></div></td>
      </tr>)}</tbody>
    </table></div>
    {!error && !filteredUsers.length && <div className="users-empty"><strong>{users.length ? 'No matching users' : 'No users yet'}</strong><p>{users.length ? 'Try another search or adjust your filters.' : 'Add a user to get started.'}</p>{hasFilters && <button className="row-action" onClick={clearFilters}>Clear filters</button>}</div>}
  </section>;
}


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

function AllocationPanel({ rows, staffMembers, onAssign }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const filteredRows = rows.filter((row) => {
    const matchesSearch = `${row.name} ${row.detail}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "All statuses" || row.status === status;
    return matchesSearch && matchesStatus;
  });
  const assignedCount = rows.filter((row) => row.assignedStaff).length;

  return <section className="admin-panel allocation-panel">
    <div className="allocation-heading"><div><h2>Resource allocations</h2><p>Review approved resources and assign a distributor.</p></div><span className="allocation-total">{rows.length} total</span></div>
    <div className="allocation-summary">
      <div data-tone="assigned"><span>Assigned</span><strong>{assignedCount}</strong><small>Distributor selected</small></div>
      <div data-tone="pending"><span>Awaiting assignment</span><strong>{rows.length - assignedCount}</strong><small>Needs a distributor</small></div>
      <div data-tone="released"><span>Released</span><strong>{rows.filter((row) => row.status.toLowerCase() === "released").length}</strong><small>Resources handed over</small></div>
    </div>
    <div className="allocation-filters">
      <label className="allocation-search"><span>Search allocations</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, ID, or resource…" /></label>
      <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{[...new Set(rows.map((row) => row.status))].map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    <div className="allocation-table-wrap"><table className="allocation-table">
      <thead><tr><th scope="col">Resource</th><th scope="col">Student</th><th scope="col">Quantity</th><th scope="col">Status</th><th scope="col">Distributor</th></tr></thead>
      <tbody>{filteredRows.map((row) => <tr key={row.databaseId}>
        <td data-label="Resource"><strong>{row.resourceName}</strong></td>
        <td data-label="Student"><div className="allocation-student"><strong>{row.studentName}</strong><small>Student ID: {row.name}</small></div></td>
        <td data-label="Quantity"><span className="allocation-quantity">{row.quantity} <small>{Number(row.quantity) === 1 ? "unit" : "units"}</small></span></td>
        <td data-label="Status"><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status.replaceAll("_", " ")}</span></td>
        <td data-label="Distributor"><select className="allocation-distributor" aria-label={`Distributor for ${row.studentName}, ${row.resourceName}`} value={row.assignedStaff?._id || row.assignedStaff || ""} onChange={(event) => onAssign(row, event.target.value)}><option value="">Unassigned</option>{staffMembers.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></td>
      </tr>)}</tbody>
    </table></div>
    {!filteredRows.length && <div className="allocation-empty"><strong>{rows.length ? "No matching allocations" : "No allocations yet"}</strong><p>{rows.length ? "Try another search or status filter." : "Approved resource requests will appear here."}</p>{rows.length > 0 && <button type="button" className="admin-secondary" onClick={() => { setSearch(""); setStatus("All statuses"); }}>Clear filters</button>}</div>}
    <div className="allocation-footer" aria-live="polite">Showing {filteredRows.length} of {rows.length} allocations</div>
  </section>;
}


export default AdminDashboard;
