import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import hash_password
import models
import schemas

router = APIRouter(prefix="/admin/patients", tags=["admin-patients"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_or_404(user_id: str, db: Session) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found")
    return user


def _get_appointment_or_404(apt_id: str, user: models.User) -> models.Appointment:
    apt = next((a for a in user.appointments if a.id == apt_id), None)
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return apt


def _get_prescription_or_404(pres_id: str, user: models.User) -> models.Prescription:
    pres = next((p for p in user.prescriptions if p.id == pres_id), None)
    if not pres:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return pres


# ── Patient CRUD ──────────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.UserListItem])
def list_patients(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    result = []
    now = datetime.now()

    for user in users:
        active_apts = [a for a in user.appointments if a.is_active]
        future_sorted = sorted(
            [a for a in active_apts if a.datetime >= now.isoformat()],
            key=lambda x: x.datetime,
        )
        next_apt = future_sorted[0] if future_sorted else None

        result.append(
            schemas.UserListItem(
                id=user.id,
                name=user.name,
                email=user.email,
                total_appointments=len(active_apts),
                total_prescriptions=len([p for p in user.prescriptions if p.is_active]),
                next_appointment=schemas.AppointmentResponse.model_validate(next_apt)
                if next_apt
                else None,
            )
        )
    return result


@router.get("/{user_id}", response_model=schemas.UserDetailResponse)
def get_patient(user_id: str, db: Session = Depends(get_db)):
    return _get_user_or_404(user_id, db)


@router.post("", response_model=schemas.UserResponse, status_code=201)
def create_patient(body: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = models.User(
        id=str(uuid.uuid4()),
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_patient(user_id: str, body: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)

    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        user.email = body.email
    if body.password is not None:
        user.password_hash = hash_password(body.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_patient(user_id: str, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    db.delete(user)
    db.commit()
    return {"message": "Patient deleted successfully"}


# ── Appointment sub-routes ────────────────────────────────────────────────────

@router.post("/{user_id}/appointments", response_model=schemas.AppointmentResponse, status_code=201)
def create_appointment(
    user_id: str, body: schemas.AppointmentCreate, db: Session = Depends(get_db)
):
    _get_user_or_404(user_id, db)

    apt = models.Appointment(
        id=str(uuid.uuid4()),
        user_id=user_id,
        provider=body.provider,
        datetime=body.datetime,
        repeat=body.repeat,
        is_active=True,
        series_end_date=body.series_end_date,
    )
    db.add(apt)
    db.commit()
    db.refresh(apt)
    return apt


@router.put("/{user_id}/appointments/{apt_id}", response_model=schemas.AppointmentResponse)
def update_appointment(
    user_id: str,
    apt_id: str,
    body: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(user_id, db)
    apt = _get_appointment_or_404(apt_id, user)

    if body.provider is not None:
        apt.provider = body.provider
    if body.datetime is not None:
        apt.datetime = body.datetime
    if body.repeat is not None:
        apt.repeat = body.repeat
    if body.is_active is not None:
        apt.is_active = body.is_active
    if body.series_end_date is not None:
        apt.series_end_date = body.series_end_date

    db.commit()
    db.refresh(apt)
    return apt


@router.delete("/{user_id}/appointments/{apt_id}")
def delete_appointment(user_id: str, apt_id: str, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    apt = _get_appointment_or_404(apt_id, user)
    apt.is_active = False
    db.commit()
    return {"message": "Appointment deactivated successfully"}


# ── Prescription sub-routes ───────────────────────────────────────────────────

@router.post("/{user_id}/prescriptions", response_model=schemas.PrescriptionResponse, status_code=201)
def create_prescription(
    user_id: str, body: schemas.PrescriptionCreate, db: Session = Depends(get_db)
):
    _get_user_or_404(user_id, db)

    pres = models.Prescription(
        id=str(uuid.uuid4()),
        user_id=user_id,
        medication=body.medication,
        dosage=body.dosage,
        quantity=body.quantity,
        refill_on=body.refill_on,
        refill_schedule=body.refill_schedule,
        is_active=True,
    )
    db.add(pres)
    db.commit()
    db.refresh(pres)
    return pres


@router.put("/{user_id}/prescriptions/{pres_id}", response_model=schemas.PrescriptionResponse)
def update_prescription(
    user_id: str,
    pres_id: str,
    body: schemas.PrescriptionUpdate,
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(user_id, db)
    pres = _get_prescription_or_404(pres_id, user)

    if body.medication is not None:
        pres.medication = body.medication
    if body.dosage is not None:
        pres.dosage = body.dosage
    if body.quantity is not None:
        pres.quantity = body.quantity
    if body.refill_on is not None:
        pres.refill_on = body.refill_on
    if body.refill_schedule is not None:
        pres.refill_schedule = body.refill_schedule
    if body.is_active is not None:
        pres.is_active = body.is_active

    db.commit()
    db.refresh(pres)
    return pres


@router.delete("/{user_id}/prescriptions/{pres_id}")
def delete_prescription(user_id: str, pres_id: str, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    pres = _get_prescription_or_404(pres_id, user)
    db.delete(pres)
    db.commit()
    return {"message": "Prescription deleted successfully"}
