Account management
==================

Student IDs are unique across campuses and account types. New IDs are trimmed and
uppercased; a case-insensitive unique database index prevents concurrent duplicates.
Both signup and administrator account creation return a conflict for duplicate IDs.
Student IDs, roles, and assigned campuses cannot be changed through profile editing.

Restart the backend to apply the index. Startup first checks existing IDs after
normalization. If duplicates exist, it reports the conflicting account IDs and pauses
new registrations while keeping login and existing accounts available. Administrators
can use Users > Correct ID with the school's authoritative student roster. Once the
last conflict is corrected and the index is ready, registration resumes. It never
deletes or merges accounts. Non-conflicting legacy IDs are normalized and blank IDs
are removed before index creation.

Staff can open My Profile in their sidebar to edit their name and photo. Student,
staff, and administrator profiles share a separate email verification control.
Send a code to the new email, paste the full code, and select Verify and change email.
The old address remains active until verification. Codes expire after 15 minutes,
are stored as hashes, and are consumed atomically. Sending a new code replaces the
previous one. Successful changes invalidate outstanding password recovery codes.

Email delivery uses the existing backend SMTP configuration. Delivery failure leaves
the current email unchanged. Live email delivery requires valid SMTP credentials.

Local development: run `npm run dev` from the workspace root to start both services.
Open http://localhost:5173. Frontend requests use `/api`, which Vite proxies to
http://127.0.0.1:5000. Deployments must proxy `/api` to the backend or set VITE_API_URL
to the deployed API address before building.
