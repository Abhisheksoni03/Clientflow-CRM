# ClientFlow

ClientFlow is a small authenticated client relationship manager for tracking contacts, lead sources, deal values, activity, and next follow-ups. It uses a React frontend, an Express REST API, and MongoDB Atlas. Each account sees only its own records. There are no bundled sample records or fake dashboard metrics.

## Project objectives

- Provide a secure, easy-to-demo workspace for individual client accounts.
- Track the relationship and practical next step for each lead without relying on hardcoded frontend fixtures.
- Show charts and totals only from records returned by MongoDB.

## Features

- Email/password registration and login, signed JWT sessions, and per-account client isolation.
- Client create, view, edit, and delete, with contact details, status, lead source, deal amount, and expected close date.
- Server-side search, status/source filters, sort, pagination, and filtered CSV download.
- Client profile drawer with a dated activity timeline, editable details, follow-up reminders, and completion controls.
- Dashboard metrics, lead-source bars, pipeline value, recent clients, seven-day acquisition chart, and upcoming/overdue reminders, all derived from database records.
- Persistent light/dark theme toggle, responsive interface, form validation, and API error reporting.
- Password reset by email with single-use, hashed reset tokens that expire after 30 minutes.
- Sign-in, registration, and password-reset endpoints have rate limits.
- No automatic seed operation or built-in example clients.

## Technology stack

- **Frontend:** React 18, Vite, Lucide icons, CSS.
- **Backend:** Node.js, Express 4, Mongoose 8, dotenv, CORS, bcryptjs, JSON Web Token, and express-rate-limit.
- **Database:** MongoDB Atlas (or a MongoDB server you manage).

## Project structure

```text
clientflow/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── middleware/requireAuth.js
│       ├── models/Client.js
│       ├── models/User.js
│       ├── routes/auth.js
│       ├── routes/clients.js
│       ├── routes/dashboard.js
│       ├── scripts/migrateLegacyClients.js
│       └── server.js
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── api.js
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
├── .gitignore
├── PRESENTATION.md
└── README.md
```

## Prerequisites

- Node.js 18 or later and npm.
- A MongoDB database and its connection URI. A free MongoDB Atlas cluster is sufficient for a demonstration.
- An internet connection to install npm packages and, when using Atlas, connect to your cluster.

## Create a free MongoDB Atlas database

Atlas changes its signup screens over time, but the general setup is:

1. Create or sign in to a MongoDB account at [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database).
2. Create a project and choose **Build a Database**. Select the **Free** (M0) tier and a nearby region/cloud provider, then create the cluster. Free-tier availability can vary by region and account.
3. In **Security / Database Access**, add a database user. Create your own username and a strong password. These are database credentials—not your MongoDB account login. Do not commit them or put them in frontend code.
4. In **Security / Network Access**, add the public IP address of the computer running the backend. Avoid opening access to every IP (`0.0.0.0/0`) for a normal setup; if your network's public IP changes, update the allowlist.
5. Open the cluster's **Connect** flow, choose **Drivers**, select Node.js, and copy the connection string. It resembles:

   ```text
   mongodb+srv://<db_username>:<db_password>@<cluster-host>/?retryWrites=true&w=majority
   ```

6. Create a local backend environment file only if one does not already exist. This preserves any existing Atlas credentials:

   ```powershell
   if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
   ```

7. Edit `backend\.env`. Replace the empty `MONGODB_URI` value with the Atlas URI you copied; use the database user you created and add `clientflow` as the database name before the `?`. For example, the shape should be:

   ```text
   MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_URL_ENCODED_PASSWORD@YOUR_CLUSTER_HOST/clientflow?retryWrites=true&w=majority
   ```

   `YOUR_DB_USER`, password, and cluster host above are instructions, **not credentials**. Do not paste angle-bracket placeholders into the final value. If your password contains reserved URI characters (such as `@`, `:`, `/`, `?`, or `#`), percent-encode the password component, or choose a strong password made of URI-safe characters. Keep the complete URI private and do not share it in screenshots or source control. `.env` files are ignored by Git.

   Leave `PORT=5000` and `CLIENT_ORIGIN=http://localhost:5173` unless you choose different local ports/origins. The frontend API origin can be changed in `frontend\.env` (create it from `frontend\.env.example` only if it does not already exist) by setting `VITE_API_URL`.

The backend checks that the URI is present, connects to MongoDB, and only then starts listening. If the URI is missing, malformed, or Atlas denies the connection, startup reports an error instead of silently switching to fake or in-memory data.

## Install and run

From the project root, install each app's dependencies in its own folder:

```powershell
Set-Location backend
npm install
Set-Location ..\frontend
npm install
```

After creating and configuring `backend\.env`, use **two separate terminals**:

**Terminal 1 — backend**

```powershell
Set-Location backend
npm run dev
```

The development command restarts the API when backend files change. For a non-watch run, use `npm start` instead.

**Terminal 2 — frontend**

```powershell
Set-Location frontend
npm run dev
```

Open the Vite URL shown in the frontend terminal (by default `http://localhost:5173`). If the database is not configured or the backend is not running, the UI displays an API error; no demo records are substituted.

Build the frontend with `Set-Location frontend; npm run build`.

On first launch, open the frontend and choose **Create an account**. Each registered account is private and only lists records created under that account. Use a strong password; there is no email verification. Password reset is available after the backend administrator configures SMTP as described below.

### JWT signing secret

The backend requires `JWT_SECRET` to be a private random string of at least 32 characters. Add a locally generated value to `backend\.env` without displaying it in the terminal:

```powershell
Set-Location backend
$secret = node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
Add-Content .env "JWT_SECRET=$secret"
Remove-Variable secret
```

Do this only if `JWT_SECRET` is not already present in `backend\.env`; do not replace an existing secret, because doing so invalidates current sessions. Keep `.env` private and out of source control. The repository's `.env.example` intentionally leaves both MongoDB URI and JWT secret empty.

### Password reset email

Password reset is optional until an SMTP provider is configured; the API can start without email settings. To enable it, add the SMTP host, port, username, password, and sender address supplied by your email provider to `backend\.env`. Do not put real values in `.env.example` or frontend environment variables. For Gmail, use `smtp.gmail.com` on port `587` and an **App Password** (with 2-Step Verification enabled), not your normal account password. Other email providers have their own SMTP host and authentication instructions.

Set `PASSWORD_RESET_APP_URL` to the exact frontend origin users should open, for example `http://localhost:5173` during local development or your deployed HTTPS URL. If blank, reset links use the first `CLIENT_ORIGIN` value. Restart the backend after changing `.env`. The API never returns reset tokens; it emails a single-use link that expires after 30 minutes. Forgot-password responses do not reveal whether an email address has an account. If SMTP is absent or email delivery fails, the API reports that reset email is unavailable rather than pretending it was sent. Completing a reset increments the account session version and invalidates its existing JWTs, so sign in again with the new password.

### Existing client records

Records created before account authentication do not have an owner and are therefore **not shown** to newly registered accounts. They are not deleted. To explicitly assign all unowned client records to a chosen account:

1. Register/sign in using the account that should own those records.
2. Back up your database and verify that every unowned record belongs with that account. This migration assigns **all** unowned Client documents to the selected account.
3. In `backend\.env`, temporarily set `MIGRATION_OWNER_EMAIL` to that account's email and `MIGRATE_UNOWNED_CLIENTS=true`.
4. From the `backend` folder, run `npm run migrate:legacy-clients`. Read the reported count; the script does not print credentials.
5. Remove the two temporary migration settings from `.env`.

Do not run this migration if records belong to different people. This simple demo intentionally does not guess ownership.

## Environment variables

| Variable | Used by | Required | Description |
|---|---|---:|---|
| `MONGODB_URI` | Backend | Yes | Private MongoDB connection string, including the `clientflow` database name. |
| `JWT_SECRET` | Backend | Yes | Private random signing key, at least 32 characters; generate locally as above. |
| `PORT` | Backend | No | API port; defaults to `5000`. |
| `CLIENT_ORIGIN` | Backend | No | Comma-separated allowed browser origins for CORS; defaults to `http://localhost:5173,http://127.0.0.1:5173`. Include the exact address used to open the frontend. |
| `VITE_API_URL` | Frontend | No | API base URL; defaults to `http://localhost:5000/api`. Set it in `frontend/.env` before starting Vite if needed. |
| `SMTP_HOST` | Backend | For password reset | SMTP hostname from your email provider. |
| `SMTP_PORT` | Backend | For password reset | SMTP port; defaults to `587` and uses TLS. Port `465` uses implicit TLS. |
| `SMTP_USER` | Backend | For password reset | SMTP account username. |
| `SMTP_PASSWORD` | Backend | For password reset | SMTP password or provider-issued app password; keep private. |
| `EMAIL_FROM` | Backend | For password reset | Verified sender address or display name and address. |
| `PASSWORD_RESET_APP_URL` | Backend | No | Frontend base URL used in reset emails; defaults to the first `CLIENT_ORIGIN`. |
| `MIGRATION_OWNER_EMAIL` | Migration only | Conditional | Account email receiving unowned pre-authentication clients. |
| `MIGRATE_UNOWNED_CLIENTS` | Migration only | Conditional | Must be `true` to confirm the explicit legacy-data migration. |

Never put `MONGODB_URI` or `JWT_SECRET` in a `VITE_` variable: Vite exposes frontend variables to browser code.

## REST API

Base URL: `http://localhost:5000/api`

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/health` | Reports API/database connection state; returns `503` if the database is disconnected. |
| `POST` | `/auth/register` | Creates an account and returns a JWT; name, valid email, and 10–72 character password required. |
| `POST` | `/auth/login` | Verifies email/password and returns a JWT. |
| `POST` | `/auth/forgot-password` | Sends a generic, single-use reset link response; SMTP email settings must be configured. |
| `POST` | `/auth/reset-password` | Body `{ "token": "...", "password": "new password" }` sets a new password when the token is valid and not expired. |
| `GET` | `/auth/me` | Returns the signed-in account profile. |
| `GET` | `/dashboard` | Authenticated status/pipeline/source totals, recent clients, daily client counts, and up to eight upcoming/overdue reminders. |
| `GET` | `/clients?page=1&limit=10&q=lee&status=Lead&source=Referral&sort=newest` | Authenticated, owner-scoped search and filter. Returns `{ clients, total, page, limit, pages }`; page size is capped at 100. |
| `GET` | `/clients/export?q=lee&status=Lead&source=Referral` | Downloads all matching account-owned records as CSV (not only the current page). |
| `GET` | `/clients/:id` | Returns one account-owned client with activity; `404` if absent or owned by someone else. |
| `POST` | `/clients` | Creates a client for the signed-in account and records the creation activity. |
| `PUT` | `/clients/:id` | Updates allowed client fields and appends timeline events. |
| `POST` | `/clients/:id/activity` | Adds a 1–500 character timeline note. |
| `PATCH` | `/clients/:id/follow-up` | Body `{ "completed": true }` marks its reminder complete/reopened and records activity. |
| `DELETE` | `/clients/:id` | Deletes an account-owned client and returns `204`. |

All `/clients` and `/dashboard` routes require `Authorization: Bearer <token>`. Example create body (`Content-Type: application/json`):

```json
{
  "name": "Jordan Lee",
  "company": "Northwind Studio",
  "email": "jordan@example.com",
  "phone": "+1 555 010 0200",
  "status": "Lead",
  "source": "Referral",
  "dealValue": 2500,
  "expectedCloseDate": "2026-12-20",
  "followUpDate": "2026-11-01",
  "notes": "Met at the design meetup."
}
```

`name`, `company`, and `email` are required. `status` is `Lead`, `Active`, or `Inactive`; `source` is `Referral`, `Website`, `LinkedIn`, `Event`, `Cold outreach`, or `Other`. `dealValue` must be non-negative. Phone, dates, and notes are optional. Mongoose adds timestamps and an embedded activity timeline. CSV export protects spreadsheet formula-like values.

## How React communicates with Express

The React app calls request helpers in `frontend/src/api.js`. After sign-in, it sends the JWT in the `Authorization` header. Express verifies the token, scopes all client queries to that account's MongoDB owner ID, validates writes through Mongoose, and returns JSON (or a `204` delete). List filters and pagination run on the server; the dashboard queries database aggregates. The UI refreshes data after successful writes. MongoDB credentials and the JWT signing key stay in the backend environment file.

## Testing and checks

- Frontend production build: from `frontend`, run `npm run build`.
- API health check after the backend starts: open `http://localhost:5000/api/health`; a healthy result has `"status":"ok"` and `"database":"connected"`.
- Register two separate accounts and verify each sees only its own client records.
- Configure SMTP, request a password reset, then use the email link to set a new password. Verify the old password fails and the reset link cannot be reused.
- Create a client with a source, deal value, and follow-up date. Verify the dashboard totals, pipeline/source metrics, detail drawer, add-note timeline, and follow-up completion.
- Search/filter, move between result pages, and download CSV; inspect the downloaded file without exposing another account's records.
- API calls can be tried with Postman; register/login first and send the returned token as a Bearer token.

## Upload to GitHub

1. Create an empty repository on GitHub.
2. This workspace currently resolves to a parent Git repository at `C:\Users\abhisheksoni`, not a repository rooted in the project folder. To avoid staging unrelated files from your home folder, initialize a standalone repository from this project folder and verify its root before adding files:

   ```powershell
   Set-Location C:\Users\abhisheksoni\Desktop\clientflow
   git init
   git rev-parse --show-toplevel
   ```

   Confirm the printed path is `C:\Users\abhisheksoni\Desktop\clientflow`. Then push the project:

   ```powershell
   git add .
   git commit -m "Build ClientFlow CRM"
   git branch -M main
   git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
   git push -u origin main
   ```

3. Replace the example account and repository values with your own. Verify `backend/.env` is not staged; `.gitignore` excludes `.env` files and dependency/build folders.

## Known limitations

- Account registration has no email verification or account deletion. Password reset requires operator-configured SMTP. Refresh tokens are not implemented; signing out clears the browser token, and password reset revokes active JWTs.
- The browser stores the access token in local storage; protect the app against cross-site scripting and use secure, HTTPS deployment for any real customer data.
- Existing pre-authentication client documents have no owner and remain hidden until the operator explicitly assigns them with the documented migration. Do not assign unowned records if they have different owners.
- The CRM is a demonstration foundation, not a substitute for a reviewed production security, privacy, backup, and deployment process.
- There is no automatic seed script or sample data.
- Atlas setup, network allowlisting, and actual persistence require credentials and configuration supplied by the operator.
