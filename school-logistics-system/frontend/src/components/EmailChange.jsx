import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { userAPI } from "../services/api";
import "./EmailChange.css";

export default function EmailChange() {
  const { user, updateUser } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const run = async (verify) => {
    setBusy(true); setError(""); setMessage("");
    try {
      if (verify) {
        await userAPI.confirmEmailChange({ email: sentTo, code: code.trim() });
        await updateUser({});
        setSentTo(""); setCode(""); setEmail("");
        setMessage("Email changed and verified.");
      } else {
        const result = await userAPI.requestEmailChange(email);
        setSentTo(email.trim().toLowerCase()); setCode(""); setMessage(result.message);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="email-change">
    <strong>School email</strong><span>{user?.email}</span>
    <small>Changing your email requires verification. Paste the code from your new inbox below within 15 minutes.</small>
    <label>New email<input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} autoComplete="email" /></label>
    <button type="button" onClick={() => run(false)} disabled={busy || !email.trim()}>{busy ? "Please wait..." : sentTo ? "Send a new code" : "Send verification code"}</button>
    {sentTo && <><small>Code sent to {sentTo}</small><label>Verification code<input value={code} onChange={e => setCode(e.target.value)} disabled={busy} autoComplete="one-time-code" /></label><button type="button" disabled={busy || !code.trim()} onClick={() => run(true)}>Verify and change email</button></>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </div>;
}
