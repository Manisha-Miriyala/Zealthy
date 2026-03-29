"""
Seed the database with sample data matching the official exercise JSON.
Usage: python seed.py
Re-run after deleting zealthy.db to reset all data.
"""
import json
import uuid
from datetime import datetime, timedelta

from database import engine, SessionLocal
import models
from auth import hash_password

models.Base.metadata.create_all(bind=engine)

# ── Global dosage list from the sample JSON ───────────────────────────────────
GLOBAL_DOSAGES = ["1mg", "2mg", "3mg", "5mg", "10mg", "25mg", "50mg",
                  "100mg", "250mg", "500mg", "1000mg"]

# ── Medications (names from sample JSON, all share the global dosage list) ────
MEDICATIONS = [
    "Diovan", "Lexapro", "Metformin", "Ozempic",
    "Prozac", "Seroquel", "Tegretol",
]

# ── Providers ─────────────────────────────────────────────────────────────────
PROVIDERS = [
    {"name": "Dr Kim West",    "specialty": "Cardiology"},
    {"name": "Dr Lin James",   "specialty": "Endocrinology"},
    {"name": "Dr Sally Field", "specialty": "Psychiatry"},
]

# ── Date helpers (relative to today so data never goes stale) ─────────────────
def future(days: int, hour: int = 10, minute: int = 0) -> str:
    dt = datetime.now() + timedelta(days=days)
    return dt.replace(hour=hour, minute=minute, second=0, microsecond=0).strftime(
        "%Y-%m-%dT%H:%M:%S"
    )

def future_date(days: int) -> str:
    return (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")


# ── Patients — matches the official exercise sample JSON exactly ──────────────
PATIENTS = [
    {
        "name": "Mark Johnson",
        "email": "mark@some-email-provider.net",
        "password": "Password123!",
        "appointments": [
            {
                "provider": "Dr Kim West",
                "datetime": future(5, 16, 30),
                "repeat": "weekly",
                "series_end_date": future_date(90),
            },
            {
                "provider": "Dr Lin James",
                "datetime": future(8, 18, 30),
                "repeat": "monthly",
                "series_end_date": None,
            },
        ],
        "prescriptions": [
            {
                "medication": "Lexapro",
                "dosage": "5mg",
                "quantity": 2,
                "refill_on": future_date(4),
                "refill_schedule": "monthly",
            },
            {
                "medication": "Ozempic",
                "dosage": "1mg",
                "quantity": 1,
                "refill_on": future_date(9),
                "refill_schedule": "monthly",
            },
        ],
    },
    {
        "name": "Lisa Smith",
        "email": "lisa@some-email-provider.net",
        "password": "Password123!",
        "appointments": [
            {
                "provider": "Dr Sally Field",
                "datetime": future(11, 18, 15),
                "repeat": "monthly",
                "series_end_date": None,
            },
            {
                "provider": "Dr Lin James",
                "datetime": future(14, 20, 0),
                "repeat": "weekly",
                "series_end_date": future_date(90),
            },
        ],
        "prescriptions": [
            {
                "medication": "Metformin",
                "dosage": "500mg",
                "quantity": 2,
                "refill_on": future_date(14),
                "refill_schedule": "monthly",
            },
            {
                "medication": "Diovan",
                "dosage": "100mg",
                "quantity": 1,
                "refill_on": future_date(24),
                "refill_schedule": "monthly",
            },
        ],
    },
]


def seed():
    db = SessionLocal()
    try:
        if db.query(models.Medication).count() > 0:
            print("Database already seeded — skipping.")
            return

        print("Seeding medications…")
        for name in MEDICATIONS:
            db.add(models.Medication(
                id=str(uuid.uuid4()),
                name=name,
                dosages=json.dumps(GLOBAL_DOSAGES),
                is_active=True,
            ))

        print("Seeding providers…")
        for p in PROVIDERS:
            db.add(models.Provider(
                id=str(uuid.uuid4()),
                name=p["name"],
                specialty=p["specialty"],
                is_active=True,
            ))

        print("Seeding patients…")
        for pat in PATIENTS:
            user_id = str(uuid.uuid4())
            db.add(models.User(
                id=user_id,
                name=pat["name"],
                email=pat["email"],
                password_hash=hash_password(pat["password"]),
            ))
            db.flush()

            for apt in pat["appointments"]:
                db.add(models.Appointment(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    provider=apt["provider"],
                    datetime=apt["datetime"],
                    repeat=apt["repeat"],
                    is_active=True,
                    series_end_date=apt.get("series_end_date"),
                ))

            for rx in pat["prescriptions"]:
                db.add(models.Prescription(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    medication=rx["medication"],
                    dosage=rx["dosage"],
                    quantity=rx["quantity"],
                    refill_on=rx["refill_on"],
                    refill_schedule=rx["refill_schedule"],
                    is_active=True,
                ))

        db.commit()
        print("Seed complete!\n")
        print("Demo credentials:")
        for p in PATIENTS:
            print(f"  {p['email']}  /  {p['password']}")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
