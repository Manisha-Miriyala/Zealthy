# Zealthy Mini EMR

A modern Electronic Medical Records (EMR) system with two protected portals: a **Patient Portal** where patients securely log in to view appointments and prescriptions, and an **Admin Portal** where clinic staff manage all patient records, providers, medications, appointments, and prescriptions.

---

## Live Application

| Portal | URL |
|--------|-----|
| Patient Portal | https://zealthy-tau.vercel.app/ |
| Admin Portal | https://zealthy-tau.vercel.app/admin |
| Backend API | https://zealthy-tau.vercel.app/api |
| API Docs (Swagger) | https://zealthy-tau.vercel.app/api/docs |

---

## What This Application Does

### For Patients
- **Secure login** — JWT-based authentication with email and password
- **Dashboard** — at-a-glance view of appointments in the next 7 days and prescription refills due soon, plus basic patient info
- **Full appointment schedule** — 3-month view with recurring series expanded into individual occurrences
- **Prescriptions** — all active medications with dosage, quantity, and upcoming refill dates
- **Book appointments** — choose a provider, pick a date, select from available time slots, and optionally set a recurring schedule

### For Clinic Staff (Admin)
- **Patient management** — create, view, edit, and delete patient accounts with password control
- **Provider management** — add and manage healthcare providers with specialty
- **Medication catalog** — maintain the list of available medications and dosages
- **Appointment scheduling** — schedule appointments for any patient, set weekly/monthly repeat, and set a series end date
- **Prescription management** — assign medications with dosage, quantity, refill date, and refill schedule

---

## Demo Credentials

### Patient Portal (`/`)

| Name | Email | Password |
|------|-------|----------|
| Mark Johnson | mark@some-email-provider.net | Password123! |
| Lisa Smith | lisa@some-email-provider.net | Password123! |

Click **"Use"** on the login screen to auto-fill either patient's credentials instantly.

### Admin Portal (`/admin`)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@zealthy.com | Admin123! |

The Admin Portal has its own login gate — click **"Use"** to auto-fill. A link to the Admin Portal is available on the Patient Portal login page, and a "← Back to Patient Portal" link is shown on the Admin login page.

---

## How to Run Locally

You need **Python 3.9+** and **Node.js 18+** installed.

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend starts at `http://localhost:8000`. On first run it automatically creates the SQLite database (`zealthy.db`) and seeds it with sample data.

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

The app opens at `http://localhost:3000` and connects to `http://localhost:8000/api` by default.

To point the frontend at a different backend:

```bash
REACT_APP_API_URL=https://your-backend-url/api npm start
```

---

## Project Structure

```
Zealthy/
├── frontend/                        # React application
│   ├── public/
│   │   ├── zealthy-logo.svg         # Official Zealthy wordmark
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── PatientPortal.tsx    # Patient login, dashboard, appointments, prescriptions
│   │   │   └── AdminEMR.tsx         # Admin login, patient/provider/medication management
│   │   ├── services/
│   │   │   └── api.ts               # All API calls to the backend
│   │   ├── hooks/
│   │   │   └── usePageTitle.ts      # Sets the browser tab title per page
│   │   ├── App.tsx                  # Routes: / → Patient Portal, /admin → Admin EMR
│   │   └── App.css                  # Design system — Zealthy brand colors, fonts, components
│   └── package.json
│
├── backend/                         # Python FastAPI server
│   ├── main.py                      # App entry point — registers all routes, seeds DB on startup
│   ├── models.py                    # Database table definitions (SQLAlchemy ORM)
│   ├── schemas.py                   # Request/response validation (Pydantic)
│   ├── auth.py                      # Password hashing, JWT creation and verification
│   ├── database.py                  # DB connection — supports SQLite (local) and PostgreSQL (production)
│   ├── seed.py                      # Pre-loads sample patients, providers, and medications
│   ├── requirements.txt             # Python dependencies
│   └── routers/
│       ├── auth_router.py           # POST /api/auth/login
│       ├── patient_router.py        # Patient dashboard, appointments, prescriptions
│       ├── appointments_router.py   # Provider availability slots
│       ├── admin_patients.py        # Admin CRUD — patients, appointments, prescriptions
│       ├── admin_providers.py       # Admin CRUD — providers
│       └── admin_medications.py     # Admin CRUD — medications
│
├── api/
│   └── index.py                     # Vercel serverless function entry point
├── vercel.json                      # Vercel deployment configuration
└── README.md
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript | User interface |
| Routing | React Router 7 | Client-side navigation |
| HTTP client | Axios | API requests |
| Backend | Python + FastAPI | REST API server |
| ORM | SQLAlchemy 2 | Database access layer |
| Database (local) | SQLite | Zero-config local development |
| Database (production) | PostgreSQL (Neon) | Cloud-hosted persistent storage |
| Authentication | JWT + bcrypt | Secure sessions for both portals |
| Hosting | Vercel | Frontend + Python serverless API |

---

## API Overview

All endpoints are prefixed with `/api`. Full interactive documentation is available at `/api/docs`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login — returns a JWT access token |

### Patient (requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patient/dashboard` | 7-day summary of appointments and refills |
| GET | `/api/patient/appointments` | Full 3-month schedule with recurring appointments expanded |
| POST | `/api/patient/appointments` | Book a new appointment |
| PUT | `/api/patient/appointments/{id}` | Update an appointment |
| DELETE | `/api/patient/appointments/{id}` | Cancel an appointment |
| GET | `/api/patient/prescriptions` | All active prescriptions |
| GET | `/api/providers/{provider}/availability/{date}` | Available time slots for a provider |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/api/admin/patients` | List all patients / Create new patient |
| GET / PUT / DELETE | `/api/admin/patients/{id}` | View / Update / Delete a patient |
| POST / PUT / DELETE | `/api/admin/patients/{id}/appointments` | Manage a patient's appointments |
| POST / PUT / DELETE | `/api/admin/patients/{id}/prescriptions` | Manage a patient's prescriptions |
| GET / POST / PUT / DELETE | `/api/admin/providers` | Full provider management |
| GET / POST / PUT / DELETE | `/api/admin/medications` | Full medication catalog management |

---

## Key Design Decisions

**Both portals are protected** — the Patient Portal uses JWT-based login; the Admin Portal has its own credential-based login gate. Navigation links connect the two portals for easy demo access.

**Recurring appointments** are stored as a single record (e.g., "weekly with Dr. Kim West starting April 5") and expanded on the fly into individual occurrences when a patient views their schedule. This keeps the database clean while showing the full calendar view patients expect.

**Global dosage list** — all medications share the same set of available dosages (1mg through 1000mg), matching the official exercise specification.

**Database flexibility** — the backend automatically detects the database from the `DATABASE_URL` environment variable. SQLite is used locally for zero-config development; PostgreSQL (Neon) is used in production. No code changes required to switch.

**Design consistency** — the UI uses the official Zealthy brand: dark green (`#00531b`), cream backgrounds (`#fffaf2`), Gelasio serif headings, pill-shaped buttons, and the exact Zealthy wordmark SVG from getzealthy.com.

---

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-yellow?logo=python)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?logo=postgresql)](https://neon.tech/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com/)
