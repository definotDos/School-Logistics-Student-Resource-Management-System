# Authentication

## Local setup

Run `npm run auth:setup` to create a missing JWT signing key, then `npm run dev`.
Configure MongoDB and email delivery in `backend/.env`.

## Sign-in flow

1. Enter your email and password.
2. The server checks your password, account status, and signup email verification.
3. A session is created and your student, staff, or administrator dashboard opens.

Sessions last eight hours, or seven days with Remember me, using the existing
per-tab session storage. Three consecutive incorrect passwords lock login for
three minutes. Password resets revoke existing sessions.

Signup email verification and emailed password-reset codes remain available.

## Upgrading

Restart the backend and refresh the frontend. Startup removes retired
authenticator fields (including `twoFactor`) and their challenge indexes from
existing user records. Passwords and account details are preserved. This cleanup
can safely run again on each startup. Keep `JWT_SECRET` configured with at least
32 bytes. The retired `MFA_ENCRYPTION_KEY` environment variable is no longer used
and can be removed from deployment configuration.
