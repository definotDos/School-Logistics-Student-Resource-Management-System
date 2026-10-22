# Employee registration

Click the landing-page logo to choose Admin sign up or Staff sign up. Direct links are `/signup?role=admin` and `/signup?role=staff`; `/signup` continues to register students.

Both forms require a full name, supported email address, matching passwords, and agreement to the terms. Staff registration also requires an employee ID (for example `UP-25-12345-A`); admin registration does not require an employee ID. The server validates account details and checks duplicate emails and any supplied IDs. Accounts cannot log in before email verification.

For admin registration, set `ADMIN_REGISTRATION_CODE` in the backend environment to a private, random value of 16–256 characters, then restart the backend. Give this code only to authorized administrators. Blank or short values disable admin registration. Do not put this code in frontend environment variables or commit it. Rotate it when it should no longer authorize new administrators.

The existing MongoDB connection, active `PHINMA University of Pangasinan` campus, and email provider configuration must be available. Configure the email provider using `.env.example`; run `npm run email:check` to check delivery configuration. Registration sends a six-digit OTP with a 15-minute expiry. The form supports pasting and resending codes and resumes pending verification after refresh. Successful verification returns to login. If the initial email fails, registration rolls back the new account and shows an error.

Validation: `npm test -- --runInBand tests/employee-registration.test.js tests/staff-signup.test.js tests/account-validation.test.js tests/auth-recovery.test.js`.
