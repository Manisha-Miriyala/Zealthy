import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/admin/providers", tags=["admin-providers"])


@router.get("", response_model=List[schemas.ProviderResponse])
def list_providers(db: Session = Depends(get_db)):
    return db.query(models.Provider).filter(models.Provider.is_active == True).all()


@router.post("", response_model=schemas.ProviderResponse, status_code=201)
def create_provider(body: schemas.ProviderCreate, db: Session = Depends(get_db)):
    provider = models.Provider(
        id=str(uuid.uuid4()),
        name=body.name,
        specialty=body.specialty,
        is_active=True,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


@router.put("/{provider_id}", response_model=schemas.ProviderResponse)
def update_provider(
    provider_id: str, body: schemas.ProviderCreate, db: Session = Depends(get_db)
):
    provider = db.query(models.Provider).filter(models.Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider.name = body.name
    provider.specialty = body.specialty
    db.commit()
    db.refresh(provider)
    return provider


@router.delete("/{provider_id}")
def delete_provider(provider_id: str, db: Session = Depends(get_db)):
    provider = db.query(models.Provider).filter(models.Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider.is_active = False
    db.commit()
    return {"message": "Provider deactivated successfully"}
