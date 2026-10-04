# Deployment: Vercel frontend + Render backend

## Current diagnosis

On October 5, 2026, read-only checks returned HTTP 200 JSON from both:
- https://school-logistics-student-resource.onrender.com/
- https://school-logistics-student-resource-m-beta.vercel.app/api/campuses/public

The API and frontend proxy are reachable. This does not prove email delivery.
The screenshot shows commit `3f91b76`, which already contains Resend support.
Render's reported email provider is Gmail. Render Free blocks SMTP ports 25,
465, and 587, including Gmail SMTP. If using Free, choose an email option below.
Redeploying unchanged Gmail settings will not remove this restriction.

The screenshot's `login_error` status 429 is the application's login-code cooldown,
not evidence of a Resend rate limit. Wait 60 seconds between login attempts.
For the browser's 503, find the matching `login_code_delivery_failed` event.

## 1. Render service settings

| Setting | Value |
| --- | --- |
| Repository | `definotDos/School-Logistics-Student-Resource-Management-System` |
| Branch | `main` |
| Root Directory | `school-logistics-system/backend` |
| Build Command | `npm ci` |
| Start Command | `npm start` |

Set these in **Render > Environment**. Local `.env` edits do not update Render.

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | `https://school-logistics-student-resource-m-beta.vercel.app` |
| `TRUST_PROXY_HOPS` | `1` for this Render proxy setup |
| `MONGODB_URI` | Existing database connection string; legacy `MONGO_URI` also works |
| `JWT_SECRET` | Existing private value, at least 32 bytes |
| `OTP_SECRET` | Existing independent private value, at least 32 bytes |
| `AUTH_AUDIT_SECRET` | Existing independent private value, at least 32 bytes |

Use Render's supplied `PORT`. Permit database connections from Render.
Preserve existing secrets when fixing email or routing.

## 2. Choose email delivery

### Option A: HTTPS email on Render Free

Verify a domain you own in Resend, create a sending API key, then set on Render:

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=<private sending API key>
EMAIL_FROM=School Logistics <noreply@your-verified-domain.com>
```

Replace the example sender. A student mailbox does not give you control of the
school's domain. Resend's test sender cannot deliver to arbitrary students.
SMTP settings are ignored in Resend mode.

### Option B: Keep Gmail

Use a Render plan or backend host that allows outbound Gmail SMTP. Changing a
paid plan is an account/billing action, not a code fix.

```dotenv
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<sender Gmail address>
SMTP_PASS=<Google App Password for that sender>
EMAIL_FROM=School Logistics <sender Gmail address>
```

Preserve valid credentials. Use an App Password, not the normal Google password.
Mailtrap sandbox does not deliver codes to student inboxes. Keep MFA enabled.

## 3. Vercel settings

Use the existing project. Leave **Root Directory blank** for repository-root
configuration. Select Vite and clear dashboard install/build/output overrides:

| Setting | Value from root `vercel.json` |
| --- | --- |
| Install Command | `npm ci --prefix school-logistics-system/frontend` |
| Build Command | `npm run build --prefix school-logistics-system/frontend` |
| Output Directory | `school-logistics-system/frontend/dist` |
| Production `VITE_API_URL` | `/api` (also the default) |

The API rewrite runs before the SPA fallback. Keeping requests on the frontend
domain also supports trusted-device cookies.

If your existing Vercel Root Directory is `school-logistics-system/frontend`,
keep that layout and use its `vercel.json`: install `npm ci`, build `npm run build`,
output `dist`. Do not mix directory layouts. If the backend hostname changes,
update the API destinations in both Vercel configuration files.

Never put database, email, or authentication secrets in frontend variables.
Every `VITE_` value is public in the built assets.

## 4. Check and deploy

1. Run `npm run deployment:check` from the repository root for a secret-safe
   production configuration check. Local development values intentionally fail
   production checks; leave the local development `.env` intact.
2. Where a Render shell is available, run `npm run deployment:check` there to
   inspect the actual deployment environment. It does not send mail or connect to MongoDB.
3. Commit and push reviewed changes to the connected branch. Save Render environment
   settings, then choose **Manual Deploy > Deploy latest commit**.
4. Check `deployment_configuration` in startup logs for the expected revision.
   Resend must show `emailTransport: resend_https`; Gmail shows `smtp`.
5. Redeploy Vercel after frontend environment changes, which require a new build.
6. Check the two public URLs above for HTTP 200 JSON. Refresh Vercel `/login` to
   confirm the SPA route works.
7. Wait 60 seconds after the last login attempt, sign in once, and complete the
   emailed code. Then check registration, password reset, and authorized dashboards.

`npm run email:check` verifies SMTP authentication without sending mail. In Resend
mode it checks only the presence of settings, not credentials or delivery.
A successful real application email flow is required before deployment is complete.

## Troubleshooting

| Symptom or log | Action |
| --- | --- |
| `ETIMEDOUT`, `ESOCKET`, `ECONNECTION` in delivery logs | Check SMTP network restrictions and hosting plan. |
| `EAUTH` | Check Gmail sender and App Password. |
| `EMAIL_CONFIGURATION` | Set required Resend key/sender on Render. |
| `EMAIL_PROVIDER_REJECTED`, `responseCode: 401/403` | Check Resend key permissions, verified domain, and recipient restrictions. |
| `EMAIL_PROVIDER_REJECTED`, `responseCode: 429` | Check provider throttling in its dashboard. |
| `login_error`, `status: 429` | Wait 60 seconds. The separate request limiter may require 15 minutes, as stated in its response. |
| Browser login 503 | Match the time to backend logs; email or database failures can cause this. |
| `HTTPS is required.` | Check Render `TRUST_PROXY_HOPS=1`. |
| `Untrusted request origin.` | Check exact frontend origin with no path or trailing slash. |
| API returns HTML | Check Vercel project root and API rewrite ordering. |
| Mongoose `new` warning | Replaced locally with `returnDocument: 'after'`; unrelated to email delivery. |

Share only log event names, codes, and statuses, never environment secrets or OTPs.

References: [Render Free restrictions](https://render.com/docs/free),
[Resend domain setup](https://resend.com/docs/dashboard/domains/introduction).
