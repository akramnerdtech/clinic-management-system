# CuraClinic Auth Backend

This backend does **one job**: authentication.

- **Signup** — Full Name + Email → a 6-digit OTP is emailed via Nodemailer → the user
  verifies it → sets a Password (+ confirm) → only then is the Supabase account created.
- **Login** — Email + Password → on success, a session token (JWT) is issued.
  **Login never sends or asks for an OTP.**

OTPs are used for exactly one thing: verifying the email address of a _new_ account
during signup. Emails that already have an account are rejected at signup, so an
existing user is never sent an OTP.

It has no other routes, no clinic/app data, and no database beyond Supabase's
auth store. The Main Project's existing localStorage-based data is completely
untouched by this backend.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in your real values
npm run dev
```

Required environment variables (see `.env.example`):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project's
  API settings. The service role key is required to create/look up users via
  the Admin API; **never** expose it to the frontend.
- `JWT_SECRET` — signs the app's session token after login, and the short-lived
  (10 min) token that proves an email was OTP-verified during signup.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` — SMTP
  credentials Nodemailer uses to send the signup OTP email.
- `OTP_LENGTH`, `OTP_TTL_MINUTES`, `OTP_MAX_ATTEMPTS` — OTP settings (defaults 6 / 5 / 5).
- `CORS_ORIGIN` — your frontend's URL(s), comma-separated.

## API

| Method | Path                            | Body                                         | Notes                                                                                                                |
| ------ | ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/signup/request-otp`  | `{ fullName, email }`                        | Emails a 6-digit OTP (5 min expiry, 30 s resend cooldown). No account yet. `409` if the email is already registered. |
| POST   | `/api/auth/signup/verify-otp`   | `{ email, otp }`                             | Single-use OTP check. Returns `{ signupToken }` (valid 10 min).                                                      |
| POST   | `/api/auth/signup/set-password` | `{ signupToken, password, confirmPassword }` | Validates the password and creates the account. `201` on success.                                                    |
| POST   | `/api/auth/login`               | `{ email, password }`                        | Returns `{ token, user }`. `401` on bad credentials.                                                                 |
| GET    | `/api/health`                   | —                                            | Health check.                                                                                                        |

Password rules (enforced here, mirrored in the Signup page): at least 8 characters,
at most 72, and both entries must match. Passwords are never stored by this backend —
Supabase Auth hashes them (bcrypt) and verifies them at login.

The old `/api/auth/signup`, `/api/auth/login/request-otp` and `/api/auth/login/verify-otp`
routes have been removed.

OTPs are kept in an in-memory store (hashed, with expiry, a max-attempt limit and a
resend cooldown) — sufficient for a single-instance deployment. Swap it for Redis if
you ever run multiple instances.
