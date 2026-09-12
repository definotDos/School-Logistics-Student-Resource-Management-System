import { useState } from "react";
import { userAPI } from "../services/api";

export default function StudentIdEditor({ user, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.studentId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await userAPI.updateStudentId(user.databaseId, value);
      onUpdated(result); setEditing(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="student-id-editor">
    {editing ? <form onSubmit={save}>
      <label>Student ID for {user.name}<input value={value} onChange={e => setValue(e.target.value)} required maxLength={100} disabled={busy} /></label>
      <small>Use the ID from the official school roster.</small>
      <div><button className="row-action" disabled={busy} type="submit">{busy ? "Saving..." : "Save ID"}</button><button className="row-action" disabled={busy} type="button" onClick={() => setEditing(false)}>Cancel</button></div>
      {error && <p role="alert">{error}</p>}
    </form> : <><span>{user.studentId || "Not assigned"}</span><button className="row-action" type="button" onClick={() => { setValue(user.studentId || ""); setError(""); setEditing(true); }}>Correct ID</button></>}
  </div>;
}
