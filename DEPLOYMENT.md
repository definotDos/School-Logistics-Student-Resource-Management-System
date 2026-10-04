# Deploy to Vercel

The repository-level `vercel.json` builds the frontend in
`school-logistics-system/frontend` and serves its `dist` directory.

1. Commit and push the deployment configuration to the branch connected to Vercel.
2. In Vercel project Settings, set Root Directory to the repository root (leave it blank).
3. Use the Vite framework preset. Clear any dashboard overrides for Install Command,
   Build Command, and Output Directory so `vercel.json` supplies these settings.
4. Set `VITE_API_URL=/api` in Vercel's production environment variables (or remove
   the variable to use the default). Both Vercel configurations proxy `/api/*` to
   `https://school-logistics-student-resource.onrender.com/api/*` before the SPA
   fallback. Keeping requests on the frontend domain also supports the backend's
   same-site trusted-device cookie.
5. Deploy the latest commit. Changing environment variables requires a new build.
6. Open `/`, then open and refresh `/login` to check the SPA fallback. Check login
   with an existing account after connecting the backend.

The frontend-folder `vercel.json` also supports projects whose Root Directory is
`school-logistics-system/frontend`; in that case use `npm ci`, `npm run build`, and
`dist`. Do not mix those paths with the repository-root configuration.

## Backend

This static frontend deployment does not run the Express backend. Vite proxies
`/api` locally; the Vercel rewrite proxies it in production. If the backend URL
changes, update both `vercel.json` files.

Deploy `school-logistics-system/backend` to a Node.js host using `npm ci` as the
install command and `npm start` as the start command. Set `MONGODB_URI` to a database
reachable from that host and set `JWT_SECRET` to a strong private value. Configure
`EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
and `EMAIL_FROM` as required by your email provider for verification and password
reset emails. The server uses the host's `PORT` environment variable.

Store database, JWT, and SMTP credentials only on the backend host. `VITE_`
variables are included in public frontend assets; `VITE_API_URL` is a public URL.

## Required Render settings for this deployment

Use root directory `school-logistics-system/backend`, build command `npm ci`, and
start command `npm start`. Configure these environment variables on Render:

```dotenv
NODE_ENV=production
FRONTEND_ORIGIN=https://school-logistics-student-resource-m-beta.vercel.app
TRUST_PROXY_HOPS=1
```

Render terminates HTTPS at its reverse proxy. `TRUST_PROXY_HOPS=1` lets Express
recognize the forwarded HTTPS request; without it the API responds with
`HTTPS is required.` even when the browser uses HTTPS. Use this value only for
this deployment behind the hosting proxy. The frontend origin is the browser's
exact scheme and hostname, without a path or trailing slash.

Also set `MONGODB_URI`, `JWT_SECRET`, `OTP_SECRET`, `AUTH_AUDIT_SECRET`, and the
SMTP settings from `backend/.env.example`. Each of the three secrets must be
independent, private values of at least 32 bytes. Preserve existing secrets when
fixing routing. Use a database reachable from Render and an SMTP provider/port
supported by your hosting plan; email is required for verification and login OTP.

After deploying the backend and frontend changes:

1. Open `https://school-logistics-student-resource.onrender.com/`; expect JSON
   with `success: true`, not `HTTPS is required.`
2. Open `/api/campuses/public` on the Vercel domain; expect JSON, not HTML or 405.
3. Sign in with an existing account and complete email verification/OTP if asked.
4. Check registration, password reset, and the dashboards with authorized accounts.

Editing a local `.env` or `.env.example` does not update Vercel or Render settings.
Vercel environment changes need a new deployment/build.

## Login returns 503 after HTTPS and routing are fixed

First open `/api/campuses/public` on the Vercel domain. A 200 response containing
campuses confirms that routing and database reads work. It does not verify SMTP.

Check Render logs for `login_code_delivery_failed` at the failed login time:

| Code | Action |
| --- | --- |
| `ETIMEDOUT` / `ESOCKET` / `ECONNECTION` | Check the host's outbound SMTP restrictions and provider port. |
| `EAUTH` | Correct the sender credentials; Gmail requires an App Password for the sender account. |
| `EMAIL_DELIVERY_FAILED` | Check SMTP configuration and sender/recipient acceptance. |

Render Free web services block outbound SMTP ports 25, 465 and 587. Gmail SMTP
on 587 therefore cannot deliver login codes from that plan, even if it works on
your laptop. Use a hosting plan that permits your SMTP connection, or an email
provider offering a supported port (such as 2525). The current application uses
SMTP; an HTTP email provider requires a code integration before configuring it.
Mailtrap sandbox captures messages for testing; use a production delivery service
to send actual student emails. Keep MFA enabled while repairing delivery.

Run `npm run email:check` in the deployed backend environment to check SMTP
authentication without sending mail. Running it locally only checks your local
network/settings. After correcting deployment settings, wait 60 seconds after the
last login attempt before retrying, then complete the emailed code challenge.

Provider restriction reference: https://render.com/docs/free
