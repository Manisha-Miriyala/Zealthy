import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

import models
from database import engine
from seed import seed
from routers import auth_router, admin_patients, admin_providers, admin_medications, patient_router, appointments_router

# ── Create tables & seed on startup ──────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)
seed()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Zealthy EMR API",
    description="Mini EMR + Patient Portal REST API",
    version="2.0.0",
)

# CORS — allow all in development; restrict in production via env var
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
prefix = "/api"
app.include_router(auth_router.router,          prefix=prefix)
app.include_router(admin_patients.router,       prefix=prefix)
app.include_router(admin_providers.router,      prefix=prefix)
app.include_router(admin_medications.router,    prefix=prefix)
app.include_router(patient_router.router,       prefix=prefix)
app.include_router(appointments_router.router,  prefix=prefix)


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "Zealthy EMR", "version": "2.0.0"}
