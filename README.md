# Zealthy Mini EMR

A modern Electronic Medical Records (EMR) system with two portals: a **Patient Portal** where patients can log in, view their appointments and prescriptions, and book new appointments — and an **Admin Portal** where clinic staff can manage all patients, providers, medications, appointments, and prescriptions.

---

## Live Application

| Portal | URL |
|--------|-----|
| Patient Portal | — |
| Admin Portal | — |
| Backend API | — |

---

## What This Application Does

### For Patients
- **Secure login** — patients sign in with email and password
- **Dashboard** — at-a-glance view of upcoming appointments (next 7 days) and prescription refills due soon
- **Appointments** — full 3-month schedule showing recurring appointments expanded into individual occurrences
- **Prescriptions** — current medications with dosage, quantity, and refill dates
- **Book appointments** — choose a provider, pick a date, and select from available time slots

### For Clinic Staff (Admin)
- **Patient management** — create, view, edit, and delete patient accounts
- **Provider management** — add and manage healthcare providers (name + specialty)
- **Medication catalog** — maintain the list of available medications and dosages
- **Appointment scheduling** — schedule appointments for any patient with any provider, set repeat frequency (weekly/monthly), and optionally set a series end date
- **Prescription management** — assign medications to patients with dosage, quantity, and refill schedule

---

## Demo Credentials

Two patients are pre-loaded for testing:

| Name | Email | Password |
|------|-------|----------|
| Mark Johnson | mark@some-email-provider.net | Password123! |
| Lisa Smith | lisa@some-email-provider.net | Password123! |

On the Patient Portal login screen, click the **"Use"** button next to either name to auto-fill the credentials.

The Admin Portal at `/admin` requires no login.

---

## How to Run Locally

You need **Python 3.9+** and **Node.js 18+** installed.

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend starts at `http://localhost:8000`. On first run it automatically creates the database (`zealthy.db`) and seeds it with sample data.

To reset the database and start fresh:

```bash
rm zealthy.db
python seed.py
```

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

The app opens at `http://localhost:3000`.

The frontend connects to `http://localhost:8000/api` by default. To point it at a different backend, set the environment variable before starting:

```bash
REACT_APP_API_URL=https://your-backend-url/api npm start
```

---

## Project Structure

```
Zealthy/
├── frontend/                    # React application (what you see in the browser)
│   ├── src/
│   │   ├── components/
│   │   │   ├── PatientPortal.tsx   # Patient login, dashboard, appointments, prescriptions
│   │   │   └── AdminEMR.tsx        # Admin panel — patients, providers, medications
│   │   ├── services/
│   │   │   └── api.ts              # All API calls to the backend
│   │   ├── hooks/
│   │   │   └── usePageTitle.ts     # Sets the browser tab title per page
│   │   ├── App.tsx                 # Routes: / → Patient Portal, /admin → Admin EMR
│   │   └── App.css                 # Design system — colors, fonts, layout, components
│   └── package.json
│
├── backend/                     # Python API server
│   ├── main.py                  # App entry point — registers all routes, seeds DB on startup
│   ├── models.py                # Database table definitions (User, Appointment, Prescription, etc.)
│   ├── schemas.py               # Request/response data shapes and validation
│   ├── auth.py                  # Password hashing, JWT token creation and verification
│   ├── database.py              # Database connection and session management
│   ├── seed.py                  # Loads sample patients, providers, and medications
│   ├── requirements.txt         # Python dependencies
│   └── routers/
│       ├── auth_router.py           # POST /api/auth/login
│       ├── patient_router.py        # Patient-facing: dashboard, appointments, prescriptions
│       ├── appointments_router.py   # Provider availability and appointment booking
│       ├── admin_patients.py        # Admin CRUD for patients, appointments, prescriptions
│       ├── admin_providers.py       # Admin CRUD for providers
│       └── admin_medications.py     # Admin CRUD for medications
│
├── railway.json                 # Railway deployment configuration (backend)
└── README.md
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript | User interface |
| Routing | React Router 7 | Navigation between pages |
| HTTP client | Axios | API requests from browser to server |
| Backend | Python + FastAPI | REST API server |
| ORM | SQLAlchemy | Database access layer |
| Database | SQLite | Stores all data in a single file (`zealthy.db`) |
| Authentication | JWT (JSON Web Tokens) | Secure patient login sessions |
| Frontend hosting | Vercel | Serves the React app |
| Backend hosting | Railway | Runs the Python API |

---

## API Overview

All endpoints are prefixed with `/api`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Patient login — returns a JWT token |

### Patient (requires login token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patient/dashboard` | Dashboard stats for logged-in patient |
| GET | `/api/patient/appointments` | Appointments for next 3 months (recurring expanded) |
| POST | `/api/patient/appointments` | Book a new appointment |
| PUT | `/api/patient/appointments/{id}` | Update an appointment |
| DELETE | `/api/patient/appointments/{id}` | Cancel an appointment |
| GET | `/api/patient/prescriptions` | Active prescriptions |
| GET | `/api/providers/{provider}/availability/{date}` | Available time slots for a provider on a given date |

### Admin (no login required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/patients` | List all patients / Create patient |
| GET/PUT/DELETE | `/api/admin/patients/{id}` | View / Update / Delete a patient |
| POST/PUT/DELETE | `/api/admin/patients/{id}/appointments` | Manage patient appointments |
| POST/PUT/DELETE | `/api/admin/patients/{id}/prescriptions` | Manage patient prescriptions |
| GET/POST/PUT/DELETE | `/api/admin/providers` | Manage providers |
| GET/POST/PUT/DELETE | `/api/admin/medications` | Manage medications |

Interactive API documentation (auto-generated) is available at:
- `http://localhost:8000/docs` — when running locally
- `https://zealthy-production.up.railway.app/docs` — live

---

## Key Design Decisions

**Recurring appointments** are stored as a single record (e.g., "weekly with Dr. Kim West") and expanded into individual date occurrences on the fly when the patient views their schedule. This keeps the database clean while showing the full calendar view patients expect.

**Global dosage list** — all medications share the same set of available dosages (1mg through 1000mg), matching the exercise specification.

**No admin authentication** — the admin portal is intentionally open for this demo. In a production system, admin routes would require role-based authentication.

---

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-yellow?logo=python)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue?logo=sqlite)](https://sqlite.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-black?logo=vercel)](https://vercel.com/)
[![Railway](https://img.shields.io/badge/Railway-Backend-purple?logo=railway)](https://railway.app/)

> Live URLs will be added after deployment.
