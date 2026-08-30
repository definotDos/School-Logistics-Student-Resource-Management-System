import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/useAuth";
import { requestAPI, resourceAPI } from "../../services/api";
import DashboardIcon from "../../components/DashboardIcon";

const gradeOptions = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "1st Year", "2nd Year", "3rd Year", "4th Year"];
const strandOptions = ["STEM", "ABM", "HUMSS", "GAS", "TVL", "Arts and Design", "Sports", "BS Information Technology", "BS Business Administration", "Other Course"];

function StudentDashboard() {
  const { user, updateUser } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("srmsDashboardTheme");
    return savedTheme ? savedTheme === "dark" : false;
  });
  useEffect(() => {
    localStorage.setItem("srmsDashboardTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [draftProfile, setDraftProfile] = useState(() => ({
    name: user?.name || "Ramos, Markbrexsphere O.",
    email: user?.email || "maol.ramos.up@phinmaed.com",
    grade: user?.grade || "3rd Year",
    strand: user?.strand || "Batchelor of Science in Information Technology",
    avatar: user?.avatar || "",
  }));
  const [requests, setRequests] = useState([]);
  const [resourceNames, setResourceNames] = useState({});
  useEffect(() => {
    requestAPI.getMyRequests().then((result) => setRequests(result.requests)).catch(() => setRequests([]));
    resourceAPI.getAll().then((result) => {
      const map = {};
      result.resources.forEach((resource) => {
        map[resource._id] = resource.name;
      });
      setResourceNames(map);
    }).catch(() => setResourceNames({}));
  }, []);
  const counts = {
    total: requests.length,
    pending: requests.filter((request) => request.status === "pending").length,
    approved: requests.filter((request) => request.status === "approved").length,
    released: requests.filter((request) => request.status === "released").length,
  };
  const firstName = user?.name?.split(" ")[0] || "Markbrexsphere";
  const profileName = user?.name || "Ramos, Markbrexsphere O.";
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
      name: user?.name || "Ramos, Markbrexsphere O.",
      email: user?.email || "maol.ramos.up@phinmaed.com",
      grade: user?.grade || "3rd Year",
      strand: user?.strand || "Batchelor of Science in Information Technology",
      avatar: user?.avatar || "",
    });
    setProfileSaved(false);
    setProfileError("");
    setProfileOpen(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileError("");
    try {
      await updateUser(draftProfile);
      setProfileSaved(true);
      window.setTimeout(() => setProfileOpen(false), 900);
    } catch (error) {
      setProfileError(error.message);
    }
  };

  return (
    <div className={`dashboard-shell ${isDarkMode ? 'dark-mode' : ''}`}>

      <Sidebar />

      <div className="flex flex-1 flex-col">
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

          <div className="dashboard-stats">
            <StatCard label="Total Requests" value={counts.total} tone="navy" />
            <StatCard label="Pending Review" value={counts.pending} tone="gold" />
            <StatCard label="Approved" value={counts.approved} tone="green" />
            <StatCard label="Released" value={counts.released} tone="blue" />
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-panel requests-panel">
              <div className="panel-heading"><div><span className="dashboard-kicker">Activity</span><h2>Recent Requests</h2><p>{counts.total} requests in your account</p></div><Link to="/requests">View all <span aria-hidden="true">→</span></Link></div>
              <div className="request-list">
                {requests.length ? requests.map((request, index) => (
                  <div className="request-row" key={request.databaseId || `${request.resourceId || request.resource}-${index}`}>
                    <span className="request-symbol">{(resourceNames[request.resourceId] || request.resourceName || request.resource || "R").charAt(0).toUpperCase()}</span>
                    <div>
                      <strong>{resourceNames[request.resourceId] || request.resourceName || request.resource || "Resource"}</strong>
                      <small>Requested {new Date(request.date).toLocaleDateString()}</small>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                )) : <p className="request-empty">Your requests will appear here.</p>}
              </div>
            </section>

            <section className="dashboard-panel claim-panel">
              <div className="panel-heading"><div><span className="dashboard-kicker">Next step</span><h2>Upcoming Claim</h2><p>One collection is scheduled</p></div><span className="claim-day"><DashboardIcon name="calendar" /><b>29</b><span>WED</span></span></div>
              <div className="claim-resource"><span>U</span><div><strong>School Uniform Set</strong><small>Approved and ready for collection</small></div></div>
              <div className="claim-details"><span>◷ <b>9:00 AM - 11:00 AM</b></span><span>⌖ <b>Student Affairs Office</b></span></div>
              <Link className="panel-action" to="/claim-schedule">View claim details <span>→</span></Link>
            </section>
          </div>

          {profileOpen && (
            <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setProfileOpen(false)}>
              <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
                <button className="profile-modal-close" type="button" aria-label="Close profile editor" onClick={() => setProfileOpen(false)}>×</button>
                <div className="profile-modal-heading"><div><span className="dashboard-kicker">Your account</span><h2 id="profile-title">Edit your profile</h2><p className="profile-modal-copy">Keep your student details up to date.</p></div><span className="profile-account-chip">Student</span></div>
                <form onSubmit={saveProfile}>
                  <div className="profile-section profile-photo-section"><span className="profile-section-title">Profile photo</span><label className="profile-photo-picker">{draftProfile.avatar ? <img src={draftProfile.avatar} alt="Profile preview" /> : <span>{profileInitials}</span>}<span className="profile-photo-copy"><strong>{profileName}</strong><small>Choose a clear photo for your student account</small></span><input type="file" accept="image/*" onChange={handleAvatarChange} /><b>Change photo</b></label></div>
                  <div className="profile-section"><span className="profile-section-title">Personal details</span>
                  <div className="profile-form-grid">
                    <label>Full name<input value={draftProfile.name} onChange={(event) => updateDraft("name", event.target.value)} required /></label>
                    <label>Email address<input type="email" value={draftProfile.email} onChange={(event) => updateDraft("email", event.target.value)} required /></label>
                  </div></div>
                  <div className="profile-section"><span className="profile-section-title">Academic details</span>
                  <div className="profile-form-grid">
                    <label>Grade or year<select value={draftProfile.grade} onChange={(event) => updateDraft("grade", event.target.value)}>{!gradeOptions.includes(draftProfile.grade) && <option value={draftProfile.grade}>{draftProfile.grade}</option>}{gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
                    <label>Strand or course<select value={draftProfile.strand} onChange={(event) => updateDraft("strand", event.target.value)}>{!strandOptions.includes(draftProfile.strand) && <option value={draftProfile.strand}>{draftProfile.strand}</option>}{strandOptions.map((strand) => <option key={strand} value={strand}>{strand}</option>)}</select></label>
                  </div></div>
                  {profileError && <p className="profile-error" role="alert">{profileError}</p>}
                  <div className="profile-modal-actions"><button type="button" className="profile-cancel" onClick={() => setProfileOpen(false)}>Cancel</button><button type="submit" className={`profile-save ${profileSaved ? "saved" : ""}`} disabled={profileSaved}>{profileSaved ? "Saved" : "Save changes"}</button></div>
                </form>
              </section>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return <div className={`dashboard-stat ${tone}`}><span>{label}</span><strong>{value}</strong><small>Updated just now</small></div>;
}

export default StudentDashboard;