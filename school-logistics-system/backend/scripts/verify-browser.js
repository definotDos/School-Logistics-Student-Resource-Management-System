// Run with --apply only after approval: checks existing sessions and creates one labeled request.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { publicUser } = require("../src/controllers/authController");
const User = require("../src/models/User");
const Request = require("../src/models/Request");
const Resource = require("../src/models/Resource");
const Inventory = require("../src/models/Inventory");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  assert(process.argv.includes("--apply"), "Explicit --apply is required.");
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/school_logistics");
  const users = {};
  for (const role of ["student", "admin", "staff"]) {
    users[role] = await User.findOne({ role, status: "active", emailVerified: true });
    assert(users[role], `Existing ${role} is required.`);
  }
  const server = app.listen(5000, "127.0.0.1");
  const frontend = path.resolve(__dirname, "../../frontend");
  const vite = spawn(process.execPath, [path.join(frontend, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5173", "--strictPort"], { cwd: frontend, env: { ...process.env, VITE_API_URL: "http://127.0.0.1:5000/api" }, windowsHide: true, stdio: "ignore" });
  const profile = path.resolve(__dirname, "../.browser-verification");
  const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=9222", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let socket;
  const errors = [];
  try {
    let targets;
    for (let i = 0; i < 100; i++) {
      try { targets = await (await fetch("http://127.0.0.1:9222/json")).json(); await fetch("http://127.0.0.1:5173"); break; } catch { await pause(200); }
    }
    assert(targets?.length, "Browser and Vite did not start.");
    socket = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0; const pending = new Map();
    socket.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.id) { const done = pending.get(msg.id); pending.delete(msg.id); if (msg.error) done?.reject(new Error(msg.error.message)); else done?.resolve(msg.result); }
      if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description || ""));
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map(a => a.value || a.description || "").join(" "));
      if (msg.method === "Network.responseReceived" && msg.params.response.status >= 400 && msg.params.response.url.includes("/api/")) errors.push(`API ${msg.params.response.status} ${new URL(msg.params.response.url).pathname}`);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
    await send("Runtime.enable"); await send("Network.enable"); await send("Page.enable");
    const evaluate = async expression => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const waitFor = async expression => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); }
      throw new Error(`Browser condition timed out: ${expression}`);
    };
    const navigate = async route => {
      await send("Page.navigate", { url: `http://127.0.0.1:5173${route}` });
      await waitFor("document.readyState === 'complete'"); await pause(500);
    };
    const login = async role => {
      await navigate("/login");
      const token = jwt.sign({ id: users[role]._id }, process.env.JWT_SECRET || "development_secret", { expiresIn: "15m" });
      await evaluate(`localStorage.setItem('srmsToken', ${JSON.stringify(token)}); localStorage.setItem('srmsUser', ${JSON.stringify(JSON.stringify(publicUser(users[role])))});`);
      await navigate(role === "student" ? "/student" : `/${role}`);
    };
    const input = async (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing input'); Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
    const clickText = async text => evaluate(`(() => { const el = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!el) throw new Error('Missing button'); el.click(); })()`);

    await login("admin");
    for (const route of ["/admin/users", "/admin/catalog", "/admin/inventory", "/admin/requests", "/admin/allocation", "/admin/distribution", "/admin/campuses", "/admin/reports", "/admin/notifications", "/admin/audit", "/admin/profile"]) {
      await navigate(route); assert(await evaluate("!!document.querySelector('main')"), route);
    }
    await navigate("/inventory"); assert.equal(await evaluate("location.pathname"), "/admin/inventory");
    await navigate("/reports"); assert.equal(await evaluate("location.pathname"), "/admin/reports");
    await input('input[aria-label="Search resources and requests"]', 'Workflow verification');
    await waitFor("document.querySelectorAll('.search-results a').length > 0");
    await navigate("/admin/requests");
    await input('select[aria-label="Filter requests"]', 'cancelled');
    await pause(300);
    assert(await evaluate("[...document.querySelectorAll('.record-list .status-pill')].every(e => e.textContent === 'cancelled')"));
    console.log("PASS all admin pages, live search, status filter, legacy redirects");

    await login("staff");
    for (const section of ["verify_eligibility", "review_requests", "approve_reject", "manage_schedules", "verify_claims", "monitor_distribution", "student_history", "update_status", "reports", "notifications"]) await navigate(`/staff/${section}`);
    assert(await evaluate("[...document.querySelectorAll('select option')].some(o => o.value === " + JSON.stringify(String(users.student._id)) + ")"), "Recipient picker must contain existing student");
    const title = `Browser verification ${Date.now()}`;
    await input('.resource-form select', String(users.student._id));
    await input('.resource-form input', title);
    await input('.resource-form textarea', 'Browser notification persistence check');
    await clickText("Send notification"); await waitFor("document.body.innerText.includes('Notification sent.')");
    await send("Page.reload"); await pause(900);
    assert(await evaluate(`document.body.innerText.includes(${JSON.stringify(title)})`));
    console.log("PASS staff sections and notification compose/send/refresh");

    await login("student");
    await evaluate("document.querySelector('button[aria-label=Notifications]').click()");
    await waitFor(`document.body.innerText.includes(${JSON.stringify(title)})`);
    const resource = await Resource.findOne({ name: /^Workflow verification /, campus: users.student.campus }).sort({ createdAt: -1 });
    assert(resource, "Run API verification first.");
    // Replenish the clearly labeled validation ledger only; never alter real catalog stock.
    const originalStock = await Inventory.findOne({ resource: resource._id }).lean();
    await Inventory.updateOne({ resource: resource._id }, { $inc: { available: 1 } });
    try {
      await navigate("/resources");
      await input('input[placeholder="Search resources..."]', resource.name);
      await pause(300); await clickText("Request Resource"); await clickText("Submit Request");
      await waitFor("document.body.innerText.includes('Request submitted')");
      const pendingRequest = await Request.findOne({ student: users.student._id, resourceRef: resource._id, status: "pending" });
      assert(pendingRequest, "Browser request must persist in MongoDB.");
      await navigate("/requests");
      await evaluate(`(() => { const row = [...document.querySelectorAll('tbody tr')].find(r => r.innerText.includes(${JSON.stringify(`REQ-${String(pendingRequest._id).slice(-8).toUpperCase()}`)})); row.querySelector('button').click(); })()`);
      await waitFor("document.body.innerText.includes('Request cancelled and saved')");
      assert.equal((await Request.findById(pendingRequest._id)).status, "cancelled");
      await send("Page.reload"); await pause(900);
      assert(await evaluate(`(() => { const row = [...document.querySelectorAll('tbody tr')].find(r => r.innerText.includes(${JSON.stringify(`REQ-${String(pendingRequest._id).slice(-8).toUpperCase()}`)})); return row && row.innerText.toLowerCase().includes('cancelled') && !row.querySelector('button'); })()`));
      await navigate("/resources");
      await input('input[placeholder="Search resources..."]', resource.name);
      await pause(300); await clickText("Request Resource"); await clickText("Submit Request");
      await waitFor("document.body.innerText.includes('Request submitted')");
      const completionRequest = await Request.findOne({ student: users.student._id, resourceRef: resource._id, status: "pending" });
      await login("admin"); await navigate("/admin/requests");
      await evaluate(`(() => { const row = [...document.querySelectorAll('.record-row')].find(r => r.innerText.includes(${JSON.stringify(`REQ-${String(completionRequest._id).slice(-8).toUpperCase()}`)})); row.querySelector('button').click(); })()`);
      await waitFor("document.body.innerText.includes('Request approved and moved to allocation.')");
      assert.equal((await Request.findById(completionRequest._id)).status, "approved");
      const allocation = await require("../src/models/Allocation").findOne({ request: completionRequest._id });
      await navigate("/admin/distribution");
      await input('.resource-form select', String(allocation._id));
      await input('input[type="date"]', '2026-09-11');
      await input('.resource-form label:nth-child(3) input', '09:00');
      await input('.resource-form label:nth-child(4) input', '10:00');
      await input('input[type="text"]', 'Browser workflow verification');
      await clickText("Create schedule");
      await waitFor("[...document.querySelectorAll('.record-row')].some(r => r.innerText.includes('Browser workflow verification'))");
      await evaluate("[...document.querySelectorAll('.record-row')].find(r => r.innerText.includes('Browser workflow verification') && r.innerText.includes('Verify identity')).querySelector('button').click()");
      await waitFor("[...document.querySelectorAll('.record-row')].some(r => r.innerText.includes('Browser workflow verification') && r.innerText.includes('Release resources'))");
      await evaluate("[...document.querySelectorAll('.record-row')].find(r => r.innerText.includes('Browser workflow verification') && r.innerText.includes('Release resources')).querySelector('button').click()");
      await waitFor("![...document.querySelectorAll('.record-row')].some(r => r.innerText.includes('Browser workflow verification') && r.querySelector('button'))");
      assert.equal((await Request.findById(completionRequest._id)).status, "completed");
      await navigate("/admin/users");
      const userRow = `[...document.querySelectorAll('.user-record')].find(r => r.innerText.includes(${JSON.stringify(users.student.email)}))`;
      await evaluate(`${userRow}.querySelector('button').click()`);
      await waitFor(`${userRow}.innerText.includes('Restore')`);
      assert.equal((await User.findById(users.student._id)).status, "suspended");
      await evaluate(`${userRow}.querySelector('button').click()`);
      await waitFor(`${userRow}.innerText.includes('Suspend')`);
      assert.equal((await User.findById(users.student._id)).status, "active");
      await input('select[aria-label="Active campus"]', users.student.campus);
      await pause(600); await send("Page.reload"); await pause(900);
      assert.equal(await evaluate("document.querySelector('select[aria-label=\"Active campus\"]').value"), users.student.campus);
      await input('select[aria-label="Active campus"]', users.admin.activeCampus || "");
      await pause(500);
      console.log("PASS approval, scheduling, verification, completion, suspend/restore and campus selection through UI and MongoDB");
      await login("student");
    } finally { await Inventory.updateOne({ resource: resource._id }, { $set: { available: originalStock.available } }); }
    await navigate("/claim-schedule"); await navigate("/distribution-history");
    assert(!await evaluate("document.querySelector('select[aria-label=\"Active campus\"]') !== null"), "Students cannot switch campus");
    console.log("PASS student create/cancel through UI, persisted reload, recipient notification and assigned-campus lock");
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(__dirname, "browser-verification.png"), Buffer.from(screenshot.data, "base64"));
    assert.deepEqual(errors, [], `Browser errors: ${errors.join(" | ")}`);
    console.log("PASS browser console, runtime exceptions and API error monitoring");
  } finally {
    await User.updateOne({ _id: users.student._id }, { status: users.student.status });
    await User.updateOne({ _id: users.admin._id }, { activeCampus: users.admin.activeCampus || "" });
    socket?.close(); browser.kill(); vite.kill(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
