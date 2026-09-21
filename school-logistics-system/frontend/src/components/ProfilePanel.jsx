import { useState } from "react";
import { useAuth } from "../context/useAuth";
import DashboardIcon from "./DashboardIcon";
import EmailChange from "./EmailChange";
import "../pages/Auth/AdminDashboard.css";
import "./StaffProfile.css";
import "./AdminProfile.css";

export default function ProfilePanel({ setNotice }) {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", avatar: user?.avatar || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const choosePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setError("Choose a JPG, PNG, or WebP image.");
    if (file.size > 2 * 1024 * 1024) return setError("Profile pictures must be 2 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, avatar: reader.result }));
      setError("");
    };
    reader.onerror = () => setError("Unable to read this image. Please try another file.");
    reader.readAsDataURL(file);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError("Enter your full name.");
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateUser({ name: form.name.trim(), avatar: form.avatar });
      setNotice("Profile updated successfully.");
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSaving(false);
    }
  };
  const initials = (form.name.trim() || "Admin").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  if (user?.role === "staff") {
    const hasChanges = form.name !== (user?.name || "") || form.avatar !== (user?.avatar || "");
    return (
      <section className="staff-account" aria-label="Staff profile settings">
        <div className="staff-account-summary" role="group" aria-label="Account summary">
          <span className="staff-account-kicker">MY ACCOUNT</span>
          <div className="staff-account-avatar">
            {form.avatar ? <img src={form.avatar} alt="Profile preview" /> : <span>{initials}</span>}
          </div>
          <h2>{form.name.trim() || "Staff member"}</h2>
          <span className="staff-account-badge"><DashboardIcon name="profile" />Staff</span>
          <p className="staff-account-email">{user?.email}</p>
          <label className="staff-account-photo">
            Change photo
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePicture} disabled={saving} aria-describedby="staff-photo-help" />
          </label>
          <small id="staff-photo-help">JPG, PNG or WebP · Up to 2 MB</small>
          <div className="staff-account-access">
            <DashboardIcon name="school" />
            <div><strong>Staff access</strong><p>Your role and campus are managed by the system.</p></div>
          </div>
        </div>
        <div className="staff-account-details">
          <form className="staff-account-card" onSubmit={submit} aria-busy={saving}>
            <header><span className="staff-account-section-icon"><DashboardIcon name="profile" /></span><div><h3>Personal details</h3><p>Keep your name and profile photo up to date.</p></div></header>
            <div className="staff-account-body">
              <label htmlFor="staff-profile-name">Full name</label>
              <input id="staff-profile-name" name="name" autoComplete="name" value={form.name} onChange={update("name")} required disabled={saving} aria-describedby="staff-name-help" />
              <small id="staff-name-help">This name appears on your staff account.</small>
              {error && <p className="staff-account-error" role="alert">{error}</p>}
            </div>
            <footer>
              <span>{hasChanges ? "You have unsaved changes" : "Your profile is up to date"}</span>
              <button type="submit" disabled={saving || !hasChanges}>{saving ? "Saving..." : "Save changes"}</button>
            </footer>
          </form>
          <section className="staff-account-card" aria-label="School email settings">
            <header><span className="staff-account-section-icon"><DashboardIcon name="school" /></span><div><h3>Email settings</h3><p>Manage the email address linked to your account.</p></div></header>
            <div className="staff-account-body"><EmailChange /></div>
          </section>
        </div>
      </section>
    );
  }

  const hasChanges = form.name !== (user?.name || "") || form.avatar !== (user?.avatar || "");
  return (
    <section className="admin-account" aria-label="Administrator profile settings">
      <aside className="account-identity-card">
        <span className="account-eyebrow">YOUR ACCOUNT</span>
        <div className="account-avatar">{form.avatar ? <img src={form.avatar} alt="Profile preview" /> : <span>{initials}</span>}</div>
        <h2>{form.name.trim() || "Administrator"}</h2>
        <span className="account-role-badge"><DashboardIcon name="profile" />Administrator</span>
        <p className="account-email">{user?.email}</p>
        <label className="account-photo-button">Change photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePicture} disabled={saving} aria-describedby="admin-photo-help" /></label>
        <small id="admin-photo-help">JPG, PNG or WebP · Up to 2 MB</small>
        <div className="account-access">
          <h3><DashboardIcon name="school" />Account access</h3>
          <dl><div><dt>Role</dt><dd>Administrator</dd></div><div><dt>Campus</dt><dd>{user?.activeCampus || user?.campus || "All campuses"}</dd></div></dl>
          <p>Your role and campus are managed by the system.</p>
        </div>
      </aside>
      <div className="account-settings">
        <form className="account-card account-personal" onSubmit={submit} aria-busy={saving} aria-labelledby="admin-personal-title">
          <header><span className="account-section-icon"><DashboardIcon name="profile" /></span><div><span className="account-eyebrow">PROFILE</span><h3 id="admin-personal-title">Personal information</h3><p>Update your display name and profile photo.</p></div></header>
          <div className="account-card-body">
            <label htmlFor="admin-profile-name">Full name</label>
            <input id="admin-profile-name" name="name" autoComplete="name" value={form.name} onChange={update("name")} required disabled={saving} aria-describedby="admin-name-help" />
            <small id="admin-name-help">This name appears on your administrator account.</small>
            {error && <p className="account-error" role="alert">{error}</p>}
          </div>
          <footer><span className={`account-save-state ${hasChanges ? "is-pending" : ""}`} role="status">{hasChanges ? "You have unsaved changes" : "Your profile is up to date"}</span><button type="submit" disabled={saving || !hasChanges}>{saving ? "Saving changes…" : "Save changes"}</button></footer>
        </form>
        <section className="account-card account-email-card" aria-labelledby="admin-email-title">
          <header><span className="account-section-icon"><DashboardIcon name="school" /></span><div><span className="account-eyebrow">EMAIL & VERIFICATION</span><h3 id="admin-email-title">School email</h3><p>Manage the email address linked to your account.</p></div></header>
          <div className="account-card-body"><EmailChange /></div>
        </section>
      </div>
    </section>
  );
}
