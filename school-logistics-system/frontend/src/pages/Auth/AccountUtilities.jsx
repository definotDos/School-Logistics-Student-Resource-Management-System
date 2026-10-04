import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import EmailChange from "../../components/EmailChange";
import AppearancePanel from "../../components/AppearancePanel";
import TrustedDevices from "../../components/TrustedDevices";
import DashboardIcon from "../../components/DashboardIcon";
import { useAuth } from "../../context/useAuth";
import useStudentTheme from "../../hooks/useStudentTheme";
import "./AdminDashboard.css";
import "../../components/AccountUtilities.css";

const guides = {
  student: [
    { title: "Request a resource", path: "/resources", answer: "Open Browse Resources, choose an available resource, and submit your request. Check My Requests for the review result." },
    { title: "Track a request", path: "/requests", answer: "My Requests shows your submitted requests and their current status. If a request needs clarification, bring its details to your campus office." },
    { title: "Collect approved resources", path: "/claim-schedule", answer: "Check Claim Schedule for your pickup date, location, and claim instructions before visiting the distribution point. Bring your student ID." },
    { title: "Review previous collections", path: "/distribution-history", answer: "Distribution History lists your recorded resource collections." },
  ],
  staff: [
    { title: "Review student requests", path: "/staff/review_requests", answer: "Open Review Requests to inspect submissions, then use Verify Eligibility and Approve / Reject to process them." },
    { title: "Manage resource claims", path: "/staff/manage_schedules", answer: "Use Claim Schedules to manage pickup arrangements. Verify Claims lets you check claims before recording distribution." },
    { title: "Find student records", path: "/staff/student_history", answer: "Student History provides prior distribution records. Use Reports for summaries of your campus activity." },
  ],
  admin: [
    { title: "Manage resources and stock", path: "/admin/inventory", answer: "Use Resource Catalog to manage the resource directory and Inventory to maintain stock. Check the active campus before making changes." },
    { title: "Process requests and distribution", path: "/admin/requests", answer: "Review submissions in Requests, assign resources through Allocation, and manage releases in Distribution." },
    { title: "Manage account access", path: "/admin/users", answer: "Users contains account management controls. Confirm the selected account and campus before changing access." },
    { title: "Review system activity", path: "/admin/audit", answer: "Audit Logs provides recorded system activity. Use Reports to review resource and distribution summaries." },
  ],
};

function HelpPanel({ user }) {
  const [query, setQuery] = useState("");
  const topics = [...(guides[user.role] || guides.student),
    { title: "Update my name or email", path: "/settings", answer: "Open Settings to save your display name or change your email. Email changes require a verification code sent to the new inbox." },
    { title: "Resolve an account or campus issue", answer: "For an incorrect campus, access issue, or a request that needs clarification, contact your campus resource office or system administrator. Include the affected resource or request reference and what happened. Never share your password or verification code." },
  ];
  const matches = topics.filter(topic => `${topic.title} ${topic.answer}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <section className="utility-card">
      <h2>How can we help?</h2>
      <label htmlFor="help-search">Search guides</label>
      <input id="help-search" type="search" placeholder="Try requests, email, or claims" value={query} onChange={event => setQuery(event.target.value)} />
      <p className="utility-muted" role="status">{matches.length} {matches.length === 1 ? "guide" : "guides"} found</p>
      <div className="utility-faq" key={query}>
        {matches.map(topic => <details key={topic.title} open={query.trim() ? true : undefined}><summary>{topic.title}</summary><p>{topic.answer}</p>{topic.path && <Link to={topic.path}>Open {topic.title.toLowerCase()} <span aria-hidden="true">→</span></Link>}</details>)}
        {!matches.length && <p>No matching guides. Try another keyword or contact your campus office below.</p>}
      </div>
    </section>
    <aside className="utility-card">
      <h2>Campus support</h2>
      <p>Contact your campus resource office or system administrator for help with your account or resource requests.</p>
      <dl className="utility-details"><div><dt>Campus</dt><dd>{user.activeCampus || user.campus || "All campuses"}</dd></div><div><dt>Account</dt><dd>{user.email}</dd></div></dl>
      <h3>Before you contact support</h3>
      <ul><li>Note the resource name and request reference, if available.</li><li>Describe what you tried and any error shown.</li><li>Keep your password and verification codes private.</li></ul>
      <Link className="utility-action" to={user.role === "admin" ? "/admin" : user.role === "staff" ? "/staff" : "/student"}>Back to dashboard</Link>
    </aside>
  </>;
}

function SectionHeading({ icon, title, description }) {
  return <div className="utility-section-heading"><span className="utility-section-icon"><DashboardIcon name={icon} /></span><div><h2>{title}</h2>{description && <p className="utility-muted">{description}</p>}</div></div>;
}

function SettingsPanel({ user }) {
  const { updateUser } = useAuth();
  const [name, setName] = useState(user.name || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setNotice(""); setError("");
    if (!name.trim()) { setError("Enter your full name."); return; }
    setBusy(true);
    try { await updateUser({ name: name.trim() }); setName(name.trim()); setNotice("Your name has been saved."); }
    catch (err) { setError(err.message || "Unable to save your name. Please try again."); }
    finally { setBusy(false); }
  };
  return <>
    <div className="utility-stack">
      <section className="utility-card">
        <SectionHeading icon="profile" title="Personal information" description="Manage how your name appears in your workspace." />
        <form onSubmit={save} aria-busy={busy}>
          <label htmlFor="settings-name">Full name</label>
          <input id="settings-name" autoComplete="name" value={name} onChange={event => { setName(event.target.value); setNotice(""); setError(""); }} required disabled={busy} />
          <button className="utility-action" type="submit" disabled={busy || name.trim() === user.name}>{busy ? "Saving…" : "Save changes"}</button>
          {notice && <p role="status" className="utility-success">{notice}</p>}{error && <p role="alert" className="utility-error">{error}</p>}
        </form>
      </section>
      <section className="utility-card"><SectionHeading icon="audit" title="Email and verification" description="Keep your school email up to date and secure." /><EmailChange /></section>
    </div>
    <div className="utility-stack">
      <section className="utility-card"><SectionHeading icon="school" title="Account access" description="Your school and workspace details." /><dl className="utility-details"><div><dt>Role</dt><dd><span className="utility-role">{user.role}</span></dd></div><div><dt>Campus</dt><dd>{user.campus || "Not assigned"}</dd></div>{(user.studentId || user.employeeId) && <div><dt>{user.role === "student" ? "Student ID" : "Employee ID"}</dt><dd>{user.role === "student" ? user.studentId : user.employeeId}</dd></div>}</dl><div className="utility-support"><p className="utility-muted">Need to correct your campus or account access?</p><Link to="/help">Get account support <span aria-hidden="true">→</span></Link></div></section>
      <AppearancePanel />
      <TrustedDevices />
    </div>
  </>;
}

export default function AccountUtilities({ page }) {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useStudentTheme(user.role === "staff" ? "srmsStaffDashboardTheme" : "srmsDashboardTheme");
  const isHelp = page === "help";
  return <div className={`admin-shell organized-workspace utility-shell ${isDarkMode ? "dark-mode" : ""}`}>
    <Sidebar type={user.role} />
    <div className="admin-content"><Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(current => !current)} />
      <main className="utility-main"><header className="utility-heading"><span>YOUR WORKSPACE</span><h1>{isHelp ? "Help and Support" : "Settings"}</h1><p>{isHelp ? "Find answers and get back to your school resources." : "Manage your account details and workspace preferences."}</p></header>
        <div className="utility-grid">{isHelp ? <HelpPanel user={user} /> : <SettingsPanel user={user} />}</div>
      </main>
    </div>
  </div>;
}
