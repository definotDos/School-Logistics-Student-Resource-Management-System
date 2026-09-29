# Account validation

## Policy configuration

`shared/account-policy.json` is consumed by the frontend and backend. Deploy the shared directory alongside both applications.

- Email: exact `phinmaed.com` domain, as confirmed by the project owner. Subdomains and suffix lookalikes are rejected. Addresses are trimmed and lowercased; inbox ownership requires verification.
- Student ID: `03-01-2425-` followed by five digits (example `03-01-2425-12345`) or `03-2425-` followed by four digits (example `03-2425-1234`).
- Employee ID: `EMP-` followed by six digits (example `EMP-123456`). Employees use the existing `staff` or `admin` roles. IDs are stored in the existing `studentId` database field for compatibility with reports and the unique index.
- Courses and strands: the application's existing dropdown catalog, with the free-text option removed. This catalog has **not** been confirmed as the official list for every campus.

The ID patterns are application defaults, not verified PHINMA roster formats. Confirm the patterns and supported programs with the school before production rollout. Change the JSON patterns and help text together, then rebuild the frontend and restart the backend. Do not invent replacement IDs for existing users.

## Authorization and validation

Public signup supports students and staff. Staff first enter an employee ID; the server checks its format and availability before the UI reveals account details. Signup repeats ID validation and duplicate checks. This checks format and uniqueness only: no employee roster is connected, so it does not establish employment. Staff self-registration requires school email verification before login. Administrator accounts still require creation by an authenticated administrator. Profile role changes, verification flags, and other unsupported account fields are rejected.

Both registration forms require a name, institutional email, password, campus, and ID. Public student signup defers course selection to the profile. Administrator student creation requires a supported course/strand. Optional grade/year selections must be supported. Passwords have a minimum of eight characters and a maximum of 72 UTF-8 bytes, matching bcrypt's input limit.

The server checks active campuses, exact email formats, ID/role agreement, course selections, and duplicate normalized email/ID values. Unique database indexes also reject concurrent duplicate creation. Preserve these indexes; startup pauses account creation when legacy IDs prevent index creation.

Login uses email and password, with an optional boolean `rememberMe`. Roles come from the stored account. Email verification, recovery, and email changes use the same institutional email policy. Administrator-created accounts also require email verification and receive a code. Delivery failure rolls back creation.

Profile updates accept only the supported profile fields. Self-service changes to role, ID, and campus are prohibited. Email changes require verification of the new address; the unique email index resolves concurrent claims. Administrator student-ID corrections enforce the same student format and uniqueness. Profile images accept bounded PNG/JPEG/WebP data URLs.

## Existing accounts

No existing email, ID, role, or course is automatically rewritten by this change. Existing users with institutional emails retain login access while administrators resolve legacy ID conflicts. Existing non-institutional emails no longer pass login validation. Before deploying, review those accounts and arrange verified institutional email replacements, including administrator access. Validate existing employee assignments against the authoritative staff roster: a stored role or syntactically valid ID does not establish employment.

Review legacy course selections and map them to approved options. The profile form requires users to choose a supported course when saving academic details. Model validation also checks new accounts and changed identity fields.

## Verification

- Backend: `npm test -- --runInBand --testPathIgnorePatterns=tests/integration`
- Frontend: `npm run lint` and `npm run build`
- Database suites require an explicitly configured disposable MongoDB database ending in `_test`; the current environment has no configured test database. The older workflow suites also contain pre-verification signup assumptions and need modernization before they can validate the current workflow.

The security tests cover domain lookalikes, malformed types, role escalation, ID/role mismatches, invalid courses, profile field injection, duplicate checks, verification, password byte limits, and login input validation. Database uniqueness races still require validation against a disposable database.
