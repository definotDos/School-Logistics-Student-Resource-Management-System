// Disposable database + in-memory test mail only. Never connects to a real inbox.
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');
assert(process.env.MONGODB_URI && new URL(process.env.MONGODB_URI).pathname.endsWith('_test'), 'Set an explicit disposable MONGODB_URI ending in _test');
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.OTP_SECRET = crypto.randomBytes(48).toString('hex');
process.env.AUTH_AUDIT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.FRONTEND_ORIGIN = 'http://localhost:5181';
process.env.NODE_ENV = 'test';
const mail = new Map();
require('../src/config/email').sendLoginCode = async (email, code) => { mail.set(email, code); };
const app = require('../src/app');
const { fixtures } = require('../tests/helpers/database');
const User = require('../src/models/User');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const data = await fixtures();
  const server = app.listen(5001);
  const frontend = path.resolve(__dirname, '../../frontend');
  const vite = spawn(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', '5181', '--strictPort'],
    { cwd: frontend, env: { ...process.env, VITE_API_URL: 'http://localhost:5001/api' }, windowsHide: true, stdio: 'ignore' });
  const profile = path.resolve(__dirname, '../../../.mfa-test-db/browser-profile');
  const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9223', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let targets;
    for (let i = 0; i < 100; i++) {
      try { targets = await (await fetch('http://127.0.0.1:9223/json')).json(); await fetch('http://localhost:5181'); break; } catch { await pause(200); }
    }
    assert(targets?.length, 'Browser or frontend did not start');
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let nextId = 0; const pending = new Map(); const errors = [];
    socket.onmessage = ({ data: payload }) => {
      const message = JSON.parse(payload);
      if (message.id) {
        const task = pending.get(message.id); pending.delete(message.id);
        if (message.error) task?.reject(new Error(message.error.message)); else task?.resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async expression => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); }
      throw new Error(`Browser condition timed out: ${expression}`);
    };
    const input = (selector, value) => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const navigate = async target => { await send('Page.navigate', { url: `http://localhost:5181${target}` }); await pause(500); };
    await send('Runtime.enable'); await send('Page.enable');
    await navigate('/admin'); await waitFor("location.pathname === '/login'");
    console.log('PASS direct dashboard URL redirects before authentication');
    for (const role of ['student', 'staff', 'admin']) {
      await navigate('/login');
      await waitFor("!!document.querySelector('input[type=email]')");
      await input('input[type=email]', data.users[role].email);
      await input('input[autocomplete="current-password"]', 'TestPassword123');
      await evaluate("document.querySelector('.auth-form').requestSubmit()");
      await waitFor("!!document.querySelector('input[autocomplete=\"one-time-code\"]')");
      assert.equal(await evaluate("sessionStorage.getItem('srmsToken')"), null);
      assert(await evaluate("document.body.innerText.includes('Resend code in')"));
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'OTP page overflows mobile width');
      await send('Emulation.clearDeviceMetricsOverride');
      const code = mail.get(data.users[role].email);
      assert(code, 'Test email was not delivered');
      if (role === 'student') {
        await input('input[autocomplete="one-time-code"]', code === '000000' ? '111111' : '000000');
        await evaluate("document.querySelector('.auth-form').requestSubmit()");
        await waitFor("!!document.querySelector('[role=alert]')");
      }
      await input('input[autocomplete="one-time-code"]', code);
      await evaluate("document.querySelector('.auth-form input[type=checkbox]').click()");
      await evaluate("document.querySelector('.auth-form').requestSubmit()");
      await waitFor(`location.pathname === '/${role}'`);
      await navigate('/settings'); await waitFor("document.body.innerText.includes('1 trusted device.')");
      await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Revoke all trusted devices').click()");
      await waitFor("document.body.innerText.includes('All trusted devices revoked.')");
      await evaluate("document.querySelector('.sidebar-logout').click()");
      await waitFor("location.pathname === '/login'");
      console.log(`PASS ${role}: password → email OTP → dashboard → device revocation → logout; responsive OTP form`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS no browser runtime exceptions');
  } finally {
    socket?.close(); browser.kill(); vite.kill();
    await new Promise(resolve => server.close(resolve));
    await User.deleteMany({ _id: { $in: Object.values(data.users).map(user => user._id) } });
    await mongoose.disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
