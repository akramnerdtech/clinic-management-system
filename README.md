# CuraClinic

A clinic operations dashboard (appointments, patients, doctors, specialties,
calendar, settings) with email + OTP authentication in front of it.

```
frontend/   Main Project (React/Vite dashboard, localStorage-based) + Login/Signup UI
backend/    Authentication only — Supabase (accounts) + Nodemailer (OTP email)
```

The dashboard itself is unchanged from the original Main Project — all of its
existing pages, components, and localStorage data/logic work exactly as
before. Authentication was added as a layer in front of it, not wired into
it: the backend only ever handles signup and OTP login, nothing else.

## How it fits together

1. User signs up with **full name + email** → frontend calls the backend →
   backend creates a Supabase account. No password, no OTP at this step.
2. User logs in with **email** → backend generates a 6-digit OTP → sends it
   via Nodemailer → user enters the code → backend verifies it → issues a
   session token (JWT) → frontend stores it and redirects into the dashboard.
3. From then on, `ProtectedRoute` in the frontend keeps the dashboard behind
   login. The session token lives in its own localStorage key,
   `curaclinic.auth.session`, completely separate from the dashboard's
   existing data (which stays under its own `curaclinic.<domain>.<key>` keys
   and is never sent to the backend).

## Running it locally

You'll need both running at once — the frontend calls the backend only for
signup/login.

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env   # Supabase URL + service role key, SMTP credentials, JWT secret
npm run dev             # http://localhost:4000
```

**2. Frontend**

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:4000/api
npm run dev             # http://localhost:5173
```

Then open `http://localhost:5173`, create an account, and log in with the
OTP emailed to you.

## Requirements

- Node.js 18+ (needed for native `fetch` in the backend)
- A Supabase project (for user accounts — Settings → API for the URL and
  service role key)
- An SMTP account for sending OTP emails (any provider Nodemailer supports)

## API reference (backend)

| Method | Path                          | Body                    | Notes                                  |
|--------|-------------------------------|--------------------------|------------------------------------------|
| POST   | `/api/auth/signup`            | `{ fullName, email }`    | Creates the Supabase account.            |
| POST   | `/api/auth/login/request-otp` | `{ email }`              | Emails a 6-digit OTP (5 min expiry).     |
| POST   | `/api/auth/login/verify-otp`  | `{ email, otp }`         | Returns `{ token, user }` on success.    |
| GET    | `/api/health`                 | —                        | Health check.                            |

OTPs are kept in an in-memory store (hashed, with expiry and a max-attempt
limit) — sufficient for a single-instance deployment. Swap it for Redis if
you ever run multiple backend instances.

## Environment variables

**`backend/.env`**

| Variable                    | Purpose                                               |
|-------------------------------|---------------------------------------------------------|
| `PORT`                        | Port the API listens on (default `4000`)               |
| `CORS_ORIGIN`                 | Comma-separated list of allowed frontend origins        |
| `SUPABASE_URL`                | Your Supabase project URL                                |
| `SUPABASE_SERVICE_ROLE_KEY`   | Service role key — required for the Admin API; never expose to the frontend |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Signs the app's own session token after OTP verification |
| `OTP_LENGTH` / `OTP_TTL_MINUTES` / `OTP_MAX_ATTEMPTS` | OTP behavior |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Nodemailer SMTP credentials |

**`frontend/.env`**

| Variable       | Purpose                                                  |
|-----------------|-------------------------------------------------------------|
| `VITE_API_URL`  | Base URL of the backend API (default `http://localhost:4000/api`) — used only by the auth service |

## Project structure

```
frontend/
└─ src/
   ├─ components/
   │  ├─ auth/          Login/Signup UI (AuthLayout, OtpInput, ProtectedRoute)
   │  ├─ layout/         Shell, Sidebar, Topbar
   │  └─ ...              Existing Main Project components (patients, doctors, appointments, etc.)
   ├─ pages/
   │  ├─ auth/           LoginPage, SignupPage
   │  └─ ...              Existing Main Project pages
   ├─ hooks/useAuth.tsx   Auth session state, backed by its own storage key
   ├─ services/authService.ts   Calls the backend (signup, request-otp, verify-otp)
   ├─ utils/authStorage.ts      Isolated localStorage key for the auth session
   ├─ styles/auth.css     Styles for the Login/Signup screens only
   ├─ config/api.ts       Axios client pointed at VITE_API_URL
   └─ App.tsx             Adds /login, /signup; wraps existing routes in ProtectedRoute

backend/
└─ src/
   ├─ config/            env loader, Supabase admin client, Nodemailer transport
   ├─ controllers/        authController.js
   ├─ routes/             authRoutes.js
   ├─ services/           supabaseService.js (create/find user), otpService.js (OTP store)
   └─ utils/              OTP generator, JWT sign/verify, email template
```

## What was and wasn't touched

- **Untouched:** every existing page, component, hook, service, and
  localStorage key in the Main Project.
- **Added:** `/login` and `/signup` routes and UI, `ProtectedRoute`, the auth
  service/hook/storage, and the backend in full.
- **Minimally wired:** the sidebar's "Sign out" button now calls the real
  logout instead of just showing a toast.