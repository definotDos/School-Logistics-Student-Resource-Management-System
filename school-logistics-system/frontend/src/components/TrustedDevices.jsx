import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
export default function TrustedDevices() {
  const [devices, setDevices] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    authAPI.listDevices().then(result => { if (active) setDevices(result.devices); }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  const revoke = async () => {
    setBusy(true);
    try { const result = await authAPI.revokeDevices(); setDevices([]); setMessage(result.message); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <section className="utility-card"><h2>Trusted devices</h2>
    <p>{devices.length} trusted {devices.length === 1 ? 'device' : 'devices'}. Revoke trust to require an email code on the next sign-in.</p>
    <ul>{devices.map(device => <li key={device._id}>Added {new Date(device.createdAt).toLocaleDateString()} · Expires {new Date(device.expiresAt).toLocaleDateString()}</li>)}</ul>
    <button className="utility-action" type="button" onClick={revoke} disabled={busy}>{busy ? 'Revoking...' : 'Revoke all trusted devices'}</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
