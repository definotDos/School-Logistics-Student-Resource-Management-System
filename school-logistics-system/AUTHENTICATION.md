# Authentication flows

- Public signup supports students and staff. Existing administrators create administrator accounts through User Management; the public API rejects administrator signup.
- Login without Remember me uses sessionStorage and an 8-hour token. Remember me uses localStorage and a 7-day token. Logout clears both stores.
- Unverified login opens verification after validating the password. Resume email verification on Login accepts an email without registering again. Pending email survives a tab refresh; use Resend code if needed. Verification returns to login.
- Forgot password sends a 15-minute, single-use reset code. Enter the code, a new password, and confirmation in the recovery dialog. Only the code hash is stored. Resetting a password invalidates previously issued sessions and does not bypass email verification or suspension.
- Email delivery requires working SMTP_USER, SMTP_PASS, and the appropriate SMTP_HOST/SMTP_PORT/EMAIL_FROM settings in backend/.env. Sandbox email providers capture mail rather than deliver to real inboxes.
- Authentication endpoints allow 30 requests per client IP per 15 minutes. This limiter is process-local; multiple backend instances need a shared limiter.

Validation: run frontend npm run build and npm run lint. Run backend npm test -- --runInBand tests/auth-recovery.test.js tests/auth-failures.test.js. Database integration tests require a disposable MONGODB_URI database whose name ends in _test.
