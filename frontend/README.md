# CuraClinic — Frontend

React + TypeScript + Vite dashboard for CuraClinic, with a Login/Signup
authentication layer in front of it. The Main Project itself (all existing
pages, components, hooks, and its localStorage-based data) is unchanged —
authentication was added on top of it, not into it.

## Stack

- React 18 + TypeScript
- Vite
- React Router v7
- Tailwind CSS (utility classes are used sparingly; most UI styling lives in `src/index.css`)
- Axios (used only by the auth service, to talk to the backend)
- Lucide React (icons)

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173` by default. Sign up, then log in —
you'll need the [backend](../backend) running for that (see its README).

### Environment variables

| Variable        | Default                         | Used by                          |
|-----------------|----------------------------------|-----------------------------------|
| `VITE_API_URL`  | `http://localhost:4000/api`      | `src/services/authService.ts` only — nothing else in the app calls the network. |

### Scripts

| Command            | Description                          |
|---------------------|---------------------------------------|
| `npm run dev`        | Start the Vite dev server            |
| `npm run build`      | Type-check and build for production  |
| `npm run preview`    | Preview the production build locally |
| `npm run lint`        | Run ESLint                           |
| `npm run typecheck`  | Run `tsc --noEmit`                    |

## Project structure

```
src/
├─ components/
│  ├─ auth/            Login/Signup UI pieces (AuthLayout, OtpInput, ProtectedRoute)
│  ├─ layout/           Shell, Sidebar, Topbar
│  └─ ...                Existing Main Project components (patients, doctors, appointments, etc.)
├─ pages/
│  ├─ auth/             LoginPage, SignupPage
│  └─ ...                Existing Main Project pages (Dashboard, Doctors, Patients, ...)
├─ hooks/
│  ├─ useAuth.tsx        Auth session state (token/user), backed by its own storage key
│  └─ ...                Existing Main Project hooks
├─ services/
│  ├─ authService.ts     Calls the auth backend (signup, request-otp, verify-otp)
│  └─ ...                Existing Main Project services (all still localStorage-only)
├─ utils/
│  ├─ authStorage.ts     Isolated localStorage key for the auth session
│  └─ storage.ts         Existing Main Project storage helper (untouched, unused by auth)
├─ styles/
│  └─ auth.css           Styles for the Login/Signup screens only
├─ config/
│  └─ api.ts             Axios client pointed at VITE_API_URL
├─ App.tsx               Adds /login, /signup routes; wraps existing routes in ProtectedRoute
└─ main.tsx
```

## Authentication

- **Signup** (`/signup`) — full name + email, no password, no OTP. Creates a
  Supabase account via the backend.
- **Login** (`/login`) — email → backend emails a 6-digit OTP → enter the code
  → on success you're redirected into the app.
- The session (`{ token, user }`) is stored under a single dedicated
  localStorage key, `curaclinic.auth.session` — entirely separate from the
  Main Project's existing data keys (`curaclinic.<domain>.<key>`, e.g.
  `curaclinic.account.profileFields`). Nothing about the app's existing data
  system was changed.
- All existing routes are wrapped in `ProtectedRoute`; visiting the app
  without a valid session redirects to `/login`.
- The sidebar's "Sign out" button clears the session and returns to `/login`.

## Notes

- Everything under `components/`, `pages/`, `hooks/`, `services/`, `utils/`,
  and `data/` that isn't under an `auth/`-named folder or file is the
  original Main Project, unmodified.
- The Login/Signup screens reuse the app's existing palette (teal
  `#078d81`/`#007d72`, background `#faf9ff`, Inter) via their own stylesheet
  (`styles/auth.css`) so they read as part of the same product without
  touching `index.css`'s existing rules for the rest of the app.