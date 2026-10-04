# Authentication and email MFA

Password authentication now starts an email-code challenge. Only successful OTP
verification, or a valid trusted-device cookie plus password, issues the existing
JWT session. Old password-only sessions are rejected; users must sign in again.

## Local setup

From the outer workspace directory:

```powershell
npm install --prefix school-logistics-system
npm run install:all --prefix school-logistics-system
npm run auth:setup
npm run email:check --prefix school-logistics-system/backend
npm run dev
```

No new npm dependencies or database engine were added. For a fresh installation,
copy `backend/.env.example` to `backend/.env` only if the latter does not already
exist, then configure MongoDB and SMTP. The existing `MONGO_URI` is still supported;
`MONGODB_URI` takes precedence. Do not commit `.env` files.

`auth:setup` generates independent cryptographically random keys for missing/short
`JWT_SECRET`, `OTP_SECRET`, and `AUTH_AUDIT_SECRET`. Existing valid keys are preserved;
values are never printed. In this workspace, setup added only the OTP and audit keys.
The JWT key and existing SMTP settings were preserved. Restart the backend afterward.

Open `http://localhost:5173/login`. Use a consistent hostname. The default frontend
proxies `/api` to port 5000. If overriding `VITE_API_URL`, set `FRONTEND_ORIGIN` to the
exact frontend origin, including its port.

## Environment and email provider

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` / existing `MONGO_URI` | Existing Mongoose connection |
| `JWT_SECRET` | Existing JWT signing key, at least 32 bytes |
| `OTP_SECRET` | Independent HMAC key protecting low-entropy codes, at least 32 bytes |
| `AUTH_AUDIT_SECRET` | Independent audit signing key, at least 32 bytes |
| `FRONTEND_ORIGIN` | Allowed browser origin; defaults to `http://localhost:5173` |
| `NODE_ENV` | `production` requires HTTPS and SMTP TLS |
| `TRUST_PROXY_HOPS` | Configure only behind a known trusted reverse proxy |
| `PORT` | Backend port; default 5000 |
| `EMAIL_PROVIDER` | Existing `gmail`, `mailtrap`, or custom SMTP configuration |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Provider endpoint; typically 587/STARTTLS or 465 with `SMTP_SECURE=true` |
| `SMTP_USER`, `SMTP_PASS` | Provider credentials, stored only in environment configuration |
| `EMAIL_FROM` | Provider-authorized sender |
| `VITE_API_URL` | Optional frontend API URL; default `/api` |

Use the sender account's App Password for Gmail. For transactional SMTP, configure
the provider's host, port, credentials, verified sender/domain, and required SPF/DKIM
records. Mailtrap sandbox captures test emails; production needs a delivery-enabled
provider. `email:check` tests SMTP connection/authentication without sending mail.
Login checks SMTP acceptance and fails closed on provider errors. SMTP acceptance
does not prove inbox delivery. SMS was not added: this app has no configured SMS
provider or verified phone-number model.

## Login and security behavior

1. Enter the registered school email and password. There is no username field in the
   current account model. Existing email policy and bcrypt verification are reused.
   Unknown accounts and incorrect passwords return the same credentials error.
2. Active-account and signup-email-verification checks run before MFA. Three wrong
   passwords lock the account for three minutes.
3. A CSPRNG generates a six-digit code, including possible leading zeros, valid for
   five minutes. Email is its only delivery channel. The response contains a random
   restricted challenge and deadlines, never the code or a full session.
4. The database stores an HMAC of the code bound to the challenge, and a hash of the
   challenge. Five attempts are reserved atomically. A 60-second per-account cooldown
   covers both login issuance and resends. Each issuance replaces the old challenge.
5. Verification atomically consumes the challenge; concurrent requests cannot issue
   two sessions. Delivery failure leaves the challenge unusable. Expired challenges
   can be resent for ten further minutes; older challenges require password login.
6. Sessions retain the original eight-hour lifetime, or seven days with “Keep me
   signed in in this tab.” JWTs include purpose, issuer, audience, expiry, session
   version, and `pwd` plus `otp` or `device` markers. There were no refresh tokens in
   the existing architecture. Protected APIs require the second-factor marker and
   load current account status, role, and campus authorization from MongoDB.
7. `/login` displays the reusable responsive OTP component with numeric validation,
   countdown, Verify, Resend, and optional device trust. Pending challenges stay in
   component memory; a reload requires another password login after the cooldown.

The existing role routes are `admin` → `/admin`, `staff` → `/staff`, and `student` →
`/student`. **Logistics Staff and Student Affairs are not separate backend roles in
this project**; the existing staff workspace serves staff accounts. Separate access
rules require an agreed role model and migration. Roles are never taken from the
login form. Direct dashboard URLs and manipulated frontend state cannot authorize APIs.

### Remember this device

After OTP verification, the checkbox creates a random 256-bit device token. Only its
SHA-256 hash is stored in MongoDB. The host-only `__Host-srms-device` cookie has
`Secure`, `HttpOnly`, `SameSite=Strict`, and `Path=/`. Trust lasts 30 days and never
replaces the password requirement.

Trust binds to session version, email hash, IP, and browser user agent. An IP/browser
change revokes that device. Expired/revoked/unknown trust, changed account credentials,
and prior password failures require OTP again. Dynamic networks may prompt more
frequently; this is conservative checking, not a behavioral risk engine.

`/settings` lists active devices and provides **Revoke all trusted devices**. Logout
increments `sessionVersion` and clears the cookie, invalidating all account sessions
and device trust. Password reset also invalidates all sessions/trust. Email changes
invalidate pending challenges and device trust through email binding. Device trust
never comes from localStorage or sessionStorage; the existing post-MFA JWT still uses
per-tab sessionStorage.

Secure cookies require HTTPS. Chromium supports them on localhost for development;
other local hostnames/LAN access should use local HTTPS. Do not remove the Secure flag.

### Deployment and audit

Production rejects HTTP and sends HSTS. Terminate TLS at a trusted proxy and set
`TRUST_PROXY_HOPS` accurately. Use a same-site frontend/API deployment. CORS accepts
only `FRONTEND_ORIGIN` with credentials; cross-site browser mutations are rejected.
Applicable mutations require JSON, and protected operations require bearer tokens.
A device cookie alone never authorizes an API operation. Auth responses are `no-store`.

The existing IP limiter permits 30 authentication requests per 15 minutes per process.
Password locks and OTP limits/cooldowns persist in MongoDB across processes. For
multiple backend instances, configure a shared ingress limit: the existing in-memory
IP counter resets on restart and is not distributed.

Authentication events form an HMAC chain with stream ID, sequence, previous signature,
timestamp, route, result, user ID when known, and IP. Passwords, codes, challenges,
device tokens, JWTs, request bodies, and query strings are excluded. Ship stdout to
append-only storage and retain each stream's final signature independently. Chaining
detects modification, reordering, and interior deletion. Detecting removal of the
tail requires an external anchor; local stdout is not immutable storage.

With `AUTH_AUDIT_SECRET` securely supplied in the environment, verify a complete
exported stream from `backend` using:

```powershell
node scripts/verify-auth-audit.js path/to/auth-log.jsonl
```

Retain the output anchors externally. The verifier does not load `.env` automatically
or compare external anchors for you.

## Database changes

`User.loginFactor` is a hidden subdocument containing hashed challenge, HMAC code,
expiry, resend deadline, attempts, used/ready status, session version, bound email,
and requested session lifetime. One challenge is retained per user. A sparse
`loginFactor.challengeHash` index supports lookup. Existing users need no backfill.
There is no User TTL index that could delete accounts when codes expire.

New `TrustedDevice` documents store user ID, hashed token/fingerprint/email, session
version, expiry, revocation, and timestamps. Indexes cover user, unique token hash,
and TTL cleanup. Every login explicitly checks expiry, independent of TTL deletion.
Mongoose creates the indexes normally; deployments disabling automatic indexing must
create those defined in `User.js` and `TrustedDevice.js` before rollout. Existing
startup cleanup removes only retired authenticator fields, not these new records.

## API contract

All paths are under `/api/auth`:

| Method/path | Input and result |
| --- | --- |
| `POST /login` | `{ email, password, rememberMe? }` → `{ requiresMfa, challenge, expiresAt, resendAt }`, or `{ user, token }` with valid device trust |
| `POST /mfa/verify` | `{ challenge, code, rememberDevice? }` → `{ user, token }`; optionally sets trusted cookie |
| `POST /mfa/resend` | `{ challenge }` → replacement challenge and deadlines; client must replace its old challenge |
| `GET /devices` | MFA bearer session → device IDs and creation/expiry dates, no secret hashes |
| `DELETE /devices` | MFA bearer session → revoke all device trust and clear cookie |
| `POST /logout` | MFA bearer session and `{}` → revoke all sessions/trust |

Existing signup, verification, recovery, profile, and logistics routes remain.
Errors include 400 invalid/expired/used code, 401 credentials/session failure,
403 account/role/origin rejection, 423 password lock, 429 cooldown/rate limit,
and 503 database/email outage. Backend timing and permission checks are authoritative.

## Files changed

- New backend: `services/loginFactor.js`, `services/trustedDevices.js`,
  `services/authAudit.js`, `controllers/mfaController.js`, `models/TrustedDevice.js`.
- Backend integration: `controllers/authController.js`, `models/User.js`,
  `middleware/authMiddleware.js`, `utils/session.js`, `routes/authRoutes.js`,
  `app.js`, `server.js`, and `config/email.js`.
- Setup/tools: `backend/.env.example`, `scripts/setup-auth.js`,
  `scripts/verify-auth-audit.js`, and `scripts/verify-mfa-browser.js`.
  Root `.gitignore` excludes local test artifacts.
- New frontend: `components/auth/OtpVerification.jsx`, `components/TrustedDevices.jsx`.
  Integration: `context/AuthContext.jsx`, `pages/Auth/AuthPage.jsx`,
  `pages/Auth/AccountUtilities.jsx`, `components/Sidebar.jsx`, `services/api.js`.
- Tests: new MongoDB MFA integration and audit-integrity suites; updated existing
  authentication/session/recovery/email/setup tests and workflow fixtures for MFA.

## Verification and limitations

Verified on 2026-10-04 using a disposable local MongoDB replica set:

- 195 tests passed across 18 suites, including authentication, signup/recovery,
  account management, SMTP adapter, OTP replay/expiry/resend/concurrency/attempt limits,
  device expiry/revocation, unauthorized access, logout, and audit integrity.
- Separately passed the complete database workflow using actual password+OTP-issued
  sessions for student/staff/admin: catalog, request, eligibility, approval, allocation,
  schedule, identity verification, distribution, inventory, reports, notifications,
  audit records, and duplicate-release rejection.
- Hidden Edge checks passed direct-dashboard blocking; all three role redirects;
  incorrect/correct OTP; 390px mobile layout; device registration/revocation; logout;
  and absence of browser runtime exceptions.
- Frontend production build, ESLint, and `git diff --check` passed.
- Existing SMTP connection/authentication succeeded with `email:check`; no real email
  was sent. Automated delivery uses an in-memory mail substitute. A real inbox test
  remains necessary before rollout.

**The entire repository suite is not green.** An isolated copy of unchanged `HEAD`
produced 95 failures across `integration/workflow.test.js`, `integration/endpoints.test.js`,
and `integration/database-workflow.test.js`. Failures include retired signup/ID
contracts, status-casing assertions, cancellation rules, and rollback expectations
that differ from the current backend. Valid-ID/MFA fixtures and the main distribution
workflow assertions were updated for this change. Remaining legacy failures were not
hidden or skipped in Jest configuration. Full regression sign-off still requires
resolving those suites and workflow expectations; this is not production approval.

To reproduce, start a **disposable** MongoDB replica set on port 27028. With `mongod`
installed and on PATH, run in a separate terminal from the outer workspace:

```powershell
New-Item -ItemType Directory -Force .mfa-test-db
mongod --dbpath .mfa-test-db --port 27028 --bind_ip 127.0.0.1 --replSet slsTest
```

Keep that terminal running. From `school-logistics-system/backend` in another terminal,
initialize the replica set once, then run the tests:

```powershell
node scripts/init-test-replica.js
$env:MONGODB_URI='mongodb://127.0.0.1:27028/mfa_validation_test?replicaSet=slsTest'
npm test -- --runInBand --testPathIgnorePatterns='tests/integration/(database-workflow|workflow|endpoints)\.test\.js'
npm test -- --runInBand tests/integration/database-workflow.test.js -t 'login to database'
node scripts/verify-mfa-browser.js
# Full suite, including known legacy failures:
npm test -- --runInBand
```

Never run tests against production: some existing suites clear collections. Test
database names must end in `_test`. The browser script uses installed Microsoft Edge
on Windows, local ports 5001/5181/9223, generated test-only keys, and in-memory email.
Use a fresh disposable database if legacy fixtures conflict on IDs.

Manual inbox check: sign in with an active verified account, read the received code,
verify, confirm the correct dashboard, and sign out. Repeat with an incorrect code,
five-minute expiry, resend after 60 seconds, five failed attempts, and code reuse.
On a private device, enable trust, close/reopen the tab without logout, and verify
password login recognizes it. Revoke devices in Settings and verify the next login
requires OTP. Logout intentionally revokes trust, so it does not preserve a remembered
device for a subsequent login.
