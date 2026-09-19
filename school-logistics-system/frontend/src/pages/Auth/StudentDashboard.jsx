import EmailChange from "../../components/EmailChange";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/useAuth";
import { distributionAPI, requestAPI } from "../../services/api";
import DashboardIcon from "../../components/DashboardIcon";
import "./StudentDashboard.css";
import useStudentTheme from "../../hooks/useStudentTheme";

const gradeOptions = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "6th Year"];
const programGroups = {
  "Junior high school": ["Junior High School"],
  "Senior high school strands": ["STEM", "ABM", "HUMSS", "GAS", "TVL", "Arts and Design", "Sports"],
  "College courses": ["BS Information Technology", "BS Computer Science", "BS Information Systems", "BS Business Administration", "BS Accountancy", "BS Criminology", "BS Nursing", "BS Psychology", "BS Civil Engineering", "BS Hospitality Management", "BS Tourism Management", "Bachelor of Elementary Education", "Bachelor of Secondary Education"],
};
const strandOptions = Object.values(programGroups).flat();
const profileProgram = (value) => !value || value === "Please Select Your Course Or Strand" || value === "Other Course" ? "" : value;

function StudentDashboard() {
  const { user, updateUser } = useAuth();
  const [isDarkMode, setIsDarkMode] = useStudentTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [customProgram, setCustomProgram] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [draftProfile, setDraftProfile] = useState(() => ({
    name: user?.name || "User",
    email: user?.email || "",
    grade: user?.grade === "Please Select Your Program" ? "" : user?.grade || "",
    strand: profileProgram(user?.strand),
    avatar: user?.avatar || "",
  }));
  const [requests, setRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [dashboardError, setDashboardError] = useState("");
  useEffect(() => {
    requestAPI.getMyRequests()
      .then((result) => setRequests(result.requests || []))
      .catch((error) => setDashboardError(error.message));
    distributionAPI.getMySchedules()
      .then((result) => setSchedules(result.schedules || []))
      .catch((error) => setDashboardError((current) => current || `Requests loaded, but schedules could not be loaded: ${error.message}`));
  }, []);
  const counts = {
    total: requests.length,
    pending: requests.filter((request) => request.status === "pending").length,
    approved: requests.filter((request) => request.status === "approved").length,
    released: requests.filter((request) => ["released", "completed"].includes(request.status)).length,
  };
  const upcomingClaim = schedules.find((schedule) => ["Scheduled", "Confirmed"].includes(schedule.status));
  const claimDate = upcomingClaim?.pickupDate ? new Date(upcomingClaim.pickupDate) : null;
  const firstName = user?.name?.split(" ")[0] || "Student";
  const profileName = user?.name || "User";
  const profileInitials = profileName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const updateDraft = (field, value) => {
    setDraftProfile((current) => ({ ...current, [field]: value }));
  };

  const handleAvatarChange = (event) => {
    const [file] = event.target.files;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const scale = Math.min(size / image.width, size / image.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        updateDraft("avatar", canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const openProfile = () => {
    setDraftProfile({
      name: user?.name || "User",
      email: user?.email || "",
      grade: user?.grade === "Please Select Your Program" ? "" : user?.grade || "",
      strand: profileProgram(user?.strand),
      avatar: user?.avatar || "",
    });
    setProfileSaved(false);
    setCustomProgram(Boolean(profileProgram(user?.strand)) && !strandOptions.includes(user.strand));
    setProfileError("");
    setProfileOpen(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (profileSaving) return;
    setProfileError("");
    if (!draftProfile.name.trim() || !draftProfile.grade || !draftProfile.strand.trim()) {
      setProfileError("Enter your name, program or course, and grade or year level.");
      return;
    }
    setProfileSaving(true);
    try {
      const details = { name: draftProfile.name.trim(), grade: draftProfile.grade, strand: draftProfile.strand.trim(), avatar: draftProfile.avatar };
      await updateUser(details);
      setProfileSaved(true);
      window.setTimeout(() => setProfileOpen(false), 900);
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className={`dashboard-shell student-shell organized-workspace ${isDarkMode ? 'dark-mode' : ''}`}>

      <Sidebar />

      <div className="dashboard-content flex flex-1 flex-col">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} />

        <main className={`student-dashboard flex-1 p-6 lg:p-8 ${isDarkMode ? 'dark-mode' : ''}`}>
          <div className="dashboard-welcome">
            <div>
              <span className="dashboard-kicker">Student Portal / Overview</span>
              <h1>Welcome back, {firstName}!</h1>
              <p>Keep track of your school resources in one place.</p>
            </div>
            <div className="dashboard-welcome-actions">
              <button className="dashboard-profile-trigger" type="button" onClick={openProfile}>
                {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{profileInitials}</span>}
                <span><strong>{profileName}</strong><small>{user?.grade || "Grade 11"} · {user?.strand || "STEM"}</small></span>
                <b aria-hidden="true">›</b>
              </button>
              <Link className="dashboard-primary-action" to="/resources"><span aria-hidden="true">+</span> Request a resource</Link>
            </div>
          </div>

          {dashboardError && <p className="profile-error" role="alert">{dashboardError}</p>}

          <div className="dashboard-stats">
            <StatCard label="Total Requests" value={counts.total} tone="navy" icon="requests" detail="All your resource requests" />
            <StatCard label="Pending Review" value={counts.pending} tone="gold" icon="history" detail="Awaiting staff review" />
            <StatCard label="Approved" value={counts.approved} tone="green" icon="resources" detail="Approved by your school" />
            <StatCard label="Released" value={counts.released} tone="blue" icon="school" detail="Released or completed" />
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-panel requests-panel">
              <div className="panel-heading"><div><span className="dashboard-kicker">Activity</span><h2>Recent Requests</h2><p>{counts.total} requests in your account</p></div><Link to="/requests">View all <span aria-hidden="true">→</span></Link></div>
              <div className="request-list">
                {requests.length ? requests.slice(0, 5).map((request, index) => (
                  <div className="request-row" key={request.databaseId || `${request.resourceId || request.resource}-${index}`}>
                    <RequestPicture request={request} />
                    <div>
                      <strong>{request.resourceName || request.resource || "Resource"}</strong>
                      <small>Requested {new Date(request.date).toLocaleDateString()}</small>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                )) : <div className="student-empty-state"><DashboardIcon name="requests" /><strong>No requests yet</strong><p>Browse school resources to make your first request.</p><Link to="/resources">Browse resources <span aria-hidden="true">&rarr;</span></Link></div>}
              </div>
            </section>


            <section className="dashboard-panel claim-panel">
              <div className="panel-heading"><div><span className="dashboard-kicker">Next step</span><h2>Upcoming Claim</h2><p>{upcomingClaim ? "One collection is scheduled" : "No collection scheduled"}</p></div>{claimDate && <span className="claim-day"><DashboardIcon name="calendar" /><b>{claimDate.getDate()}</b><span>{claimDate.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</span></span>}</div>
              {upcomingClaim ? <>
                <div className="claim-resource"><span>{(upcomingClaim.resource?.name || "R").charAt(0)}</span><div><strong>{upcomingClaim.resource?.name || "Resource"}</strong><small>{upcomingClaim.status === "Confirmed" ? "Identity verified" : "Approved and ready for collection"}</small></div></div>
                <div className="claim-details"><span>◷ <b>{upcomingClaim.startTime} - {upcomingClaim.endTime}</b></span><span>⌖ <b>{upcomingClaim.location}</b></span></div>
              </> : <div className="student-empty-state"><DashboardIcon name="calendar" /><strong>You're all caught up</strong><p>Your collection time and location will appear here when a claim is scheduled.</p></div>}
              <Link className="panel-action" to="/claim-schedule">View claim details <span>→</span></Link>
            </section>
          </div>

          {profileOpen && (
            <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setProfileOpen(false)}>
              <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
                <button className="profile-modal-close" type="button" aria-label="Close profile editor" onClick={() => setProfileOpen(false)}>×</button>
                <div className="profile-modal-heading"><div><span className="dashboard-kicker">Your account</span><h2 id="profile-title">Edit your profile</h2><p className="profile-modal-copy">Keep your student details up to date.</p></div><span className="profile-account-chip">Student</span></div>
                <form onSubmit={saveProfile} aria-busy={profileSaving}>
                  <div className="profile-section profile-photo-section"><span className="profile-section-title">Profile photo</span><label className="profile-photo-picker">{draftProfile.avatar ? <img src={draftProfile.avatar} alt="Profile preview" /> : <span>{profileInitials}</span>}<span className="profile-photo-copy"><strong>{profileName}</strong><small>Choose a clear photo for your student account</small></span><input type="file" accept="image/*" onChange={handleAvatarChange} /><b>Change photo</b></label></div>
                  <div className="profile-section"><span className="profile-section-title">Personal details</span>
                  <div className="profile-form-grid profile-personal-fields">
                    <label>Full name<input value={draftProfile.name} onChange={(event) => updateDraft("name", event.target.value)} required /></label>
                  </div></div>
                  <div className="profile-section"><span className="profile-section-title">Academic details</span>
                  <div className="profile-form-grid">
                    <div className="profile-program-field">
                      <label htmlFor="student-program">Program / course / strand</label>
                      <select id="student-program" value={customProgram ? "other" : draftProfile.strand} required disabled={profileSaving || profileSaved} aria-describedby="student-program-help" onChange={(event) => { setCustomProgram(event.target.value === "other"); updateDraft("strand", event.target.value === "other" ? "" : event.target.value); }}>
                        <option value="" disabled>Select your program</option>
                        {Object.entries(programGroups).map(([group, programs]) => <optgroup key={group} label={group}>{programs.map((program) => <option key={program} value={program}>{program}</option>)}</optgroup>)}
                        <option value="other">Other — enter your course</option>
                      </select>
                      {customProgram && <label className="profile-custom-program" htmlFor="student-custom-program">Your program or course<input id="student-custom-program" value={draftProfile.strand} onChange={(event) => updateDraft("strand", event.target.value)} placeholder="Enter the full course name" required disabled={profileSaving || profileSaved} /></label>}
                      <small id="student-program-help">Can’t find your course? Choose Other to enter it.</small>
                    </div>
                    <label>Grade / year level<select value={draftProfile.grade} onChange={(event) => updateDraft("grade", event.target.value)} required><option value="" disabled>Select your level</option>{draftProfile.grade && !gradeOptions.includes(draftProfile.grade) && <option value={draftProfile.grade}>{draftProfile.grade}</option>}<optgroup label="Junior high school">{gradeOptions.slice(0, 4).map((grade) => <option key={grade} value={grade}>{grade}</option>)}</optgroup><optgroup label="Senior high school">{gradeOptions.slice(4, 6).map((grade) => <option key={grade} value={grade}>{grade}</option>)}</optgroup><optgroup label="College">{gradeOptions.slice(6).map((grade) => <option key={grade} value={grade}>{grade}</option>)}</optgroup></select></label>
                  </div></div>
                  {profileError && <p className="profile-error" role="alert">{profileError}</p>}
                  <div className="profile-modal-actions"><button type="button" className="profile-cancel" onClick={() => setProfileOpen(false)}>Cancel</button><button type="submit" className={`profile-save ${profileSaved ? "saved" : ""}`} disabled={profileSaving || profileSaved}>{profileSaving ? "Saving..." : profileSaved ? "Saved" : "Save changes"}</button></div>
                </form>
                <details className="profile-email-settings"><summary>School email settings</summary><div className="profile-form-grid profile-personal-fields"><EmailChange /></div></details>
              </section>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function RequestPicture({ request }) {
  const name = request.resourceName || request.resource || "Resource";
  const label = `${name} ${request.category || ""}`.toLowerCase();
  const picture = label.includes("shoe") || label.includes("footwear") ? "/Shoes.jpg"
    : label.includes("mathematics") ? "/mathematics-book.svg"
    : label.includes("uniform") ? "/school-uniform.svg"
    : label.includes("module") || label.includes("book") ? "/learning-modules.svg"
    : label.includes("student id") || label.includes("identification") ? "/student-id.svg" : "";
  const src = request.resourceImage || picture;
  const [failedSrc, setFailedSrc] = useState(null);

  return <span className="request-symbol request-picture">
    {src && failedSrc !== src
      ? <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
      : name.charAt(0).toUpperCase()}
  </span>;
}

function StatCard({ label, value, tone, icon, detail }) {
  return <div className={`dashboard-stat ${tone}`}><div className="student-stat-heading"><span>{label}</span><DashboardIcon name={icon} /></div><strong>{value}</strong><small>{detail}</small></div>;
}

export default StudentDashboard;
