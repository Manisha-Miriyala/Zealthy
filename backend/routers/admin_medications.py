import uuid
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/admin/medications", tags=["admin-medications"])


def _serialize(med: models.Medication) -> schemas.MedicationResponse:
    return schemas.MedicationResponse(
        id=med.id,
        name=med.name,
        dosages=json.loads(med.dosages),
        is_active=med.is_active,
    )


@router.get("", response_model=List[schemas.MedicationResponse])
def list_medications(db: Session = Depends(get_db)):
    meds = db.query(models.Medication).filter(models.Medication.is_active == True).all()
    return [_serialize(m) for m in meds]


@router.post("", response_model=schemas.MedicationResponse, status_code=201)
def create_medication(body: schemas.MedicationCreate, db: Session = Depends(get_db)):
    med = models.Medication(
        id=str(uuid.uuid4()),
        name=body.name,
        dosages=json.dumps(body.dosages),
        is_active=True,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return _serialize(med)


@router.put("/{med_id}", response_model=schemas.MedicationResponse)
def update_medication(
    med_id: str, body: schemas.MedicationCreate, db: Session = Depends(get_db)
):
    med = db.query(models.Medication).filter(models.Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    med.name = body.name
    med.dosages = json.dumps(body.dosages)
    db.commit()
    db.refresh(med)
    return _serialize(med)


@router.delete("/{med_id}")
def delete_medication(med_id: str, db: Session = Depends(get_db)):
    med = db.query(models.Medication).filter(models.Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    med.is_active = False
    db.commit()
    return {"message": "Medication deactivated successfully"}
