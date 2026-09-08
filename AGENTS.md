# Repository guidance

## Layout

- The repository root is a wrapper; application code lives in `school-logistics-system/`.
- `school-logistics-system/frontend/`: React 19, React Router, Vite, and Tailwind CSS 4. Uses JavaScript/JSX and ES modules.
- `school-logistics-system/backend/`: Express 5, Mongoose, JWT authentication, and Nodemailer. Uses JavaScript and CommonJS.
- Backend code is organized into `src/routes/`, `src/controllers/`, `src/models/`, `src/middleware/`, and `src/config/`. `src/server.js` mounts `/api` routes, connects to MongoDB, seeds a default resource catalog, and starts listening immediately.
- Frontend routing lives in `src/App.jsx`; shared UI in `src/components/`; dashboards and authenticated pages in `src/pages/Auth/`; authentication in `src/context/`; API helpers in `src/services/api.js`.
- Backend integration tests live in `backend/tests/integration/` and construct their own Express apps. Avoid importing `src/server.js` into tests because it starts the server and seeds data.

## Commands

Run these from the repository root:

```powershell
# Install the nested orchestration package, then both applications.
npm run install:all
npm run install:all --prefix school-logistics-system

# Start frontend and backend together.
npm run dev

# Start either application separately.
npm run dev --prefix school-logistics-system/frontend
npm run dev --prefix school-logistics-system/backend

# Frontend validation.
npm run lint --prefix school-logistics-system/frontend
npm run build --prefix school-logistics-system/frontend
```

The root `install:all` script only installs the nested orchestration package; the second install command installs frontend and backend dependencies. Keep npm lockfiles aligned with dependency changes. There is no frontend test script or backend lint script currently.

## Environment and data

- Treat `.env` files as secrets: do not print their contents, commit credentials, or copy secret values into documentation. Only modify environment configuration when required by the task.
- The backend loads dotenv from its working directory. MongoDB configuration checks `MONGODB_URI`, then `MONGO_URI`, then defaults to `mongodb://127.0.0.1:27017/school_logistics`. The backend port defaults to `5000`.
- The frontend API helper uses `VITE_API_URL`, defaulting to `http://localhost:5000/api`. Vite also proxies `/api` to port `5000`; set `VITE_API_URL=/api` to use that proxy.
- Check the relevant config and authentication code for required environment variable names without exposing configured values.

## Testing

- Run frontend lint and build for frontend changes. For backend behavior changes, run the relevant Jest integration suite when its database and configuration are available.
- **Use a disposable test database.** `backend/tests/setup.js` defaults to the application database, and `workflow.test.js` deletes all documents in registered collections during setup. Never run these suites against a database containing data to preserve.
- Set `MONGODB_URI` explicitly in the shell before running tests. For example, with a local disposable MongoDB database:

```powershell
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/school_logistics_test'
npm run test:integration --prefix school-logistics-system/backend -- --runInBand
```

- Other backend scripts are `test`, `test:watch`, and `test:coverage`. Workflow tests intentionally retain state between steps; do not add collection cleanup before each test.
- Report checks actually run and any failures or unavailable prerequisites. Documentation-only changes do not require starting the application or running database tests.

## Change conventions

- Follow the surrounding file's formatting and module style; avoid unrelated reformatting or framework migrations.
- Keep backend routes, controller behavior, Mongoose schemas, and frontend API helpers consistent when changing an endpoint. Preserve authentication and role checks for student, staff, and admin flows.
- Reuse shared UI components, authentication context, and API helpers. Authentication currently uses the `srmsToken` and `srmsUser` local-storage keys.
- Check model enums and `frontend/src/utils/status.js` before changing workflow statuses; request, allocation, claim, inventory, and distribution changes can affect each other.
- `frontend/FRONTEND_API_USAGE.md` provides additional API usage context; verify its examples against current routes and controllers. The frontend README is mostly Vite template documentation.
- Preserve existing user changes. Inspect `git status` before editing and do not restore deleted files or alter unrelated configuration unless the task calls for it.
