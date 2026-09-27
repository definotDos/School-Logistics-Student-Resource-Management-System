# Deploy to Vercel

The repository-level `vercel.json` builds the frontend in
`school-logistics-system/frontend` and serves its `dist` directory.

1. Commit and push the deployment configuration to the branch connected to Vercel.
2. In Vercel project Settings, set Root Directory to the repository root (leave it blank).
3. Use the Vite framework preset. Clear any dashboard overrides for Install Command,
   Build Command, and Output Directory so `vercel.json` supplies these settings.
4. Add `VITE_API_URL` to the production environment variables, with your public
   backend API URL, for example `https://your-backend.example.com/api`.
5. Deploy the latest commit. Changing environment variables requires a new build.
6. Open `/`, then open and refresh `/login` to check the SPA fallback. Check login
   with an existing account after connecting the backend.

The frontend-folder `vercel.json` also supports projects whose Root Directory is
`school-logistics-system/frontend`; in that case use `npm ci`, `npm run build`, and
`dist`. Do not mix those paths with the repository-root configuration.

## Backend

This static frontend deployment does not run the Express backend. The Vite `/api`
proxy runs only during local development. Without `VITE_API_URL`, production API
requests go to the frontend host and will not reach Express.

Deploy `school-logistics-system/backend` to a Node.js host using `npm ci` as the
install command and `npm start` as the start command. Set `MONGODB_URI` to a database
reachable from that host and set `JWT_SECRET` to a strong private value. Configure
`EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
and `EMAIL_FROM` as required by your email provider for verification and password
reset emails. The server uses the host's `PORT` environment variable.

Store database, JWT, and SMTP credentials only on the backend host. `VITE_`
variables are included in public frontend assets; `VITE_API_URL` is a public URL.
