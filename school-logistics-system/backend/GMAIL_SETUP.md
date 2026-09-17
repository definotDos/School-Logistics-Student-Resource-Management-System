# Gmail verification email setup

The backend sends verification codes using the sender account in `backend/.env`.
The signup form's email address is the recipient.

1. Enable 2-Step Verification on the sender's Google account.
2. Generate an App Password for that account at https://myaccount.google.com/apppasswords.
3. Set these existing entries in `backend/.env`:

   ```dotenv
   EMAIL_PROVIDER=gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-sender@gmail.com
   SMTP_PASS=your-google-app-password
   EMAIL_FROM=your-sender@gmail.com
   ```

   Use the actual sender address and generated App Password. Do not use the
   account's regular password. Spaces in Gmail App Passwords are removed automatically.
   Keep credentials private. Some managed Google accounts do not allow App Passwords.
4. From the backend directory, run `npm run email:check`. This checks authentication
   without sending email or creating an account.
5. Restart `npm run dev`, then sign up with a real recipient email. Enter the
   six-digit email code within 15 minutes, then log in.

If Gmail returns `EAUTH` or `535`, generate a new App Password from the same
Google account as `SMTP_USER`, replace `SMTP_PASS`, and repeat steps 4–5.
Successful authentication does not guarantee inbox delivery; check Spam as well.
If email delivery fails during signup, the newly created account is deleted so
the same details can be used again.

Google instructions: https://support.google.com/accounts/answer/185833
