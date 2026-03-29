from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models

router = APIRouter(prefix="/appointments", tags=["appointments"])

SLOT_DURATION = 30  # minutes
WORK_START = 9       # 9 AM
WORK_END = 21        # 9 PM


@router.get("/availability/{provider_name}")
def get_availability(
    provider_name: str,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Gather all booked slots for this provider on this date
    all_appointments = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.provider == provider_name,
            models.Appointment.is_active == True,
        )
        .all()
    )

    booked_starts: List[datetime] = []
    for apt in all_appointments:
        try:
            apt_dt = datetime.strptime(apt.datetime[:16], "%Y-%m-%dT%H:%M")
            if apt_dt.date() == target_date.date():
                booked_starts.append(apt_dt)
        except ValueError:
            continue

    # Generate all 30-minute slots from WORK_START to WORK_END
    available: List[str] = []
    current = target_date.replace(hour=WORK_START, minute=0, second=0, microsecond=0)
    end = target_date.replace(hour=WORK_END, minute=0, second=0, microsecond=0)

    while current < end:
        slot_end = current + timedelta(minutes=SLOT_DURATION)
        conflict = any(
            not (slot_end <= booked or current >= booked + timedelta(minutes=SLOT_DURATION))
            for booked in booked_starts
        )
        if not conflict:
            available.append(current.strftime("%Y-%m-%dT%H:%M"))
        current += timedelta(minutes=SLOT_DURATION)

    return {"provider": provider_name, "date": date, "available_slots": available}
