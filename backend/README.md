# CuraClinic Auth Backend

This backend does **one job**: authentication.

- **Signup** — Full Name + Email → creates a Supabase account. No password, no OTP.
- **Login** — Email → a 6-digit OTP is generated and emailed via Nodemailer → the
  user submits the OTP → on success, a session token (JWT) is issued.

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
- `JWT_SECRET` — used to sign the app's own session token after OTP
  verification.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` — SMTP
  credentials Nodemailer uses to send the OTP email.
- `CORS_ORIGIN` — your frontend's URL(s), comma-separated.

## API

| Method | Path                         | Body                          | Notes                                   |
|--------|------------------------------|--------------------------------|------------------------------------------|
| POST   | `/api/auth/signup`           | `{ fullName, email }`          | Creates the Supabase account.            |
| POST   | `/api/auth/login/request-otp`| `{ email }`                    | Emails a 6-digit OTP (5 min expiry).     |
| POST   | `/api/auth/login/verify-otp` | `{ email, otp }`               | Returns `{ token, user }` on success.    |
| GET    | `/api/health`                | —                               | Health check.                            |

OTPs are kept in an in-memory store (hashed, with expiry and a max-attempt
limit) — sufficient for a single-instance deployment. Swap it for Redis if
you ever run multiple instances.
