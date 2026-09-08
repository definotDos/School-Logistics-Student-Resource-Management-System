# Dashboard and Navigation Workflow Audit

Date checked: 2026-09-08

## Validation Run

- `npm run lint --prefix school-logistics-system/frontend` passed.
- `npm run build --prefix school-logistics-system/frontend` passed after running outside the sandbox. The sandboxed run failed before app compilation because Tailwind's native Windows binary could not be loaded and Vite hit `spawn EPERM`.
- Backend integration tests were not run because they need an explicit disposable MongoDB database.

## Workflow To Check

1. Public access
   - Open `/`.
   - Click login and signup links.
   - Confirm unknown URLs redirect to `/`.

2. Authentication
   - Sign up as student, staff, and admin.
   - Verify email if required.
   - Log in with each role.
   - Confirm protected routes redirect unauthenticated users to `/login`.
   - Confirm wrong-role routes redirect users to their own dashboard.
   - Log out from the sidebar and confirm token/user storage is cleared.

3. Student dashboard and navigation
   - `/student`: overview stats, recent requests, upcoming claim, profile edit, notification dropdown.
   - `/resources`: browse resources and create request.
   - `/requests`: view requests and cancel pending request.
   - `/claim-schedule`: view scheduled claims.
   - `/distribution-history`: view released/completed distributions.

4. Admin dashboard and navigation
   - `/admin`: overview stats and quick links.
   - `/admin/users`: list users, suspend/restore, delete.
   - `/admin/catalog`: list catalog and add resource.
   - `/admin/inventory`: stock overview and receive resources.
   - `/admin/requests`: approve pending requests.
   - `/admin/allocation`: list allocations and assign distributor.
   - `/admin/distribution`: list claim schedules.
   - `/admin/campuses`: campus records.
   - `/admin/reports`: analytics view.
   - `/admin/notifications`: notification records.
   - `/admin/audit`: audit log.
   - `/admin/profile`: edit admin profile.

5. Staff dashboard and navigation
   - `/staff`: overview stats and quick links.
   - `/staff/verify_eligibility`: verify student eligibility.
   - `/staff/review_requests`: review pending requests.
   - `/staff/approve_reject`: approve/reject requests.
   - `/staff/manage_schedules`: schedule reserved allocations.
   - `/staff/verify_claims`: verify claim, then release allocation.
   - `/staff/monitor_distribution`: monitor releases.
   - `/staff/student_history`: view student request history.
   - `/staff/update_status`: update request workflow status.
   - `/staff/reports`: generate reports.
   - `/staff/notifications`: send notifications.

6. Full request lifecycle
   - Student creates request.
   - Staff verifies eligibility.
   - Staff or admin approves request.
   - Allocation is created and inventory is reserved.
   - Admin assigns distributor.
   - Staff creates claim schedule.
   - Student sees claim schedule.
   - Staff verifies claim identity.
   - Staff releases resource.
   - Student sees distribution history.
   - Admin/staff reports and audit logs reflect the workflow.

## Not Working Or High-Risk Items

1. Student request cancel likely fails.
   - `backend/src/controllers/requestController.js` checks `request.status !== "Pending"` and writes `"Cancelled"`, but `backend/src/models/Request.js` uses lowercase statuses: `pending`, `cancelled`, etc.
   - Expected fix: use `pending` and `cancelled` in the controller.

2. Admin user suspend/restore likely fails.
   - `frontend/src/pages/Auth/AdminDashboard.jsx` sends `active` or `suspended`.
   - `backend/src/controllers/userController.js` validates only `Active` and `Suspended`.
   - `backend/src/models/User.js` allows only `active` and `suspended`.
   - Expected fix: make the controller accept/save lowercase values.

3. Backend request status filtering is inconsistent.
   - `requestAPI.getByStatus(status)` calls `/requests/status/:status`.
   - `backend/src/controllers/requestController.js` validates title-case statuses such as `Pending`, then queries those values.
   - The `Request` model stores lowercase statuses, so status filtering can return no data or reject valid lowercase values.
   - Expected fix: normalize aliases before validation/querying, like `updateRequestStatus` already does.

4. Reports/dashboard counts may be wrong.
   - `backend/src/controllers/reportsController.js` and `distributionController.js` count request statuses like `Pending`, `Approved`, and `Completed`.
   - The `Request` model stores `pending`, `approved`, and `completed`.
   - Impact: admin and staff overview stats may show zero even when data exists.

5. Some admin sidebar sections are placeholders.
   - `/admin/campuses` uses the generic record panel but no campus rows are loaded from backend.
   - `/admin/notifications` uses the generic record panel but no notifications are loaded for admin.
   - `/admin/reports` currently shows static report cards/charts, not fetched report data.

6. Staff notification send may fail when there are no existing notification rows.
   - `/staff/notifications` loads existing notifications and only sends from those rows.
   - `handleSendNotification` needs a recipient user id, but the panel does not provide a create-new-recipient workflow.

7. Search boxes in the top navbar are visual only.
   - `Navbar.jsx` renders a search input, but it has no state, submit action, or filtering behavior.

8. Campus switcher is disabled.
   - `Sidebar.jsx` disables the assigned campus button and `handleCampusChange` is empty.
   - This may be intentional for assigned-campus locking, but the add-campus UI is unreachable because the campus menu never opens.

9. Several visible symbols are mojibake.
   - Frontend files contain strings like `â†’`, `Ã—`, `Â·`, and `âœ“`.
   - The UI will show corrupted characters instead of arrows, multiplication signs, middle dots, and check marks.

10. Legacy standalone admin routes still exist but are not in the sidebar.
    - `/inventory` and `/reports` are protected admin routes.
    - Sidebar uses `/admin/inventory` and `/admin/reports`.
    - This is not broken, but it creates duplicate access paths and can confuse testing.

## Suggested Fix Order

1. Fix backend status casing for requests, cancellations, user status updates, reports, and distribution progress.
2. Replace mojibake characters in dashboard UI files.
3. Decide whether campus switching should be locked or functional; remove unreachable add-campus UI if locked.
4. Add real admin data loading for notifications/campuses/reports or label those sections as placeholders.
5. Add a create-notification flow that selects a recipient.
6. Add integration tests for request cancel, user suspend/restore, status filtering, and report overview counts.
