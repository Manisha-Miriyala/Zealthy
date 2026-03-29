from datetime import datetime, timedelta
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/patient", tags=["patient"])


# ── Recurring appointment expansion ──────────────────────────────────────────

def _parse_dt(dt_str: str) -> datetime:
    """Parse ISO datetime string (handles both date-only and datetime strings)."""
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime: {dt_str}")


def _add_months(dt: datetime, months: int) -> datetime:
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    import calendar
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def expand_appointments(
    appointments: List[models.Appointment],
    range_start: datetime,
    range_end: datetime,
) -> List[Dict[str, Any]]:
    """
    Expand recurring appointments into individual occurrences within [range_start, range_end].
    Returns a list of dicts compatible with AppointmentResponse.
    """
    result: List[Dict[str, Any]] = []

    for apt in appointments:
        if not apt.is_active:
            continue

        try:
            apt_dt = _parse_dt(apt.datetime)
        except ValueError:
            continue

        series_end = None
        if apt.series_end_date:
            try:
                series_end = _parse_dt(apt.series_end_date)
            except ValueError:
                pass

        def effective_end(dt: datetime) -> bool:
            if dt > range_end:
                return False
            if series_end and dt > series_end:
                return False
            return True

        def make_occurrence(dt: datetime, suffix: str) -> Dict[str, Any]:
            return {
                "id": f"{apt.id}_{suffix}",
                "user_id": apt.user_id,
                "provider": apt.provider,
                "datetime": dt.strftime("%Y-%m-%dT%H:%M:%S"),
                "repeat": apt.repeat,
                "is_active": True,
                "series_end_date": apt.series_end_date,
            }

        if apt.repeat == "none":
            if range_start <= apt_dt <= range_end:
                result.append(make_occurrence(apt_dt, "0"))

        elif apt.repeat == "weekly":
            current = apt_dt
            idx = 0
            while current <= range_end and idx < 52:
                if effective_end(current) is False:
                    break
                if current >= range_start:
                    result.append(make_occurrence(current, f"w{idx}"))
                current += timedelta(weeks=1)
                idx += 1

        elif apt.repeat == "monthly":
            current = apt_dt
            idx = 0
            while current <= range_end and idx < 12:
                if effective_end(current) is False:
                    break
                if current >= range_start:
                    result.append(make_occurrence(current, f"m{idx}"))
                current = _add_months(current, 1)
                idx += 1

    result.sort(key=lambda x: x["datetime"])
    return result


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=schemas.DashboardResponse)
def get_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now()
    seven_days = now + timedelta(days=7)

    # Appointments within next 7 days (expand recurring)
    upcoming_apts = expand_appointments(current_user.appointments, now, seven_days)[:5]

    # Refills within next 7 days
    upcoming_refills = [
        p for p in current_user.prescriptions
        if p.is_active and now <= _parse_dt(p.refill_on) <= seven_days
    ]
    upcoming_refills.sort(key=lambda p: p.refill_on)

    return schemas.DashboardResponse(
        patient=schemas.UserResponse.model_validate(current_user),
        upcoming_appointments=[schemas.AppointmentResponse(**a) for a in upcoming_apts],
        upcoming_refills=[schemas.PrescriptionResponse.model_validate(p) for p in upcoming_refills],
    )


# ── Full appointment schedule (3 months) ────────────────────────────────────

@router.get("/appointments", response_model=List[schemas.AppointmentResponse])
def get_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now()
    three_months = _add_months(now, 3)

    occurrences = expand_appointments(current_user.appointments, now, three_months)
    return [schemas.AppointmentResponse(**o) for o in occurrences]


# ── Full prescription list (next 3 months) ───────────────────────────────────

@router.get("/prescriptions", response_model=List[schemas.PrescriptionResponse])
def get_prescriptions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now()
    three_months = _add_months(now, 3)

    active = [
        p for p in current_user.prescriptions
        if p.is_active and _parse_dt(p.refill_on) >= now
    ]
    active.sort(key=lambda p: p.refill_on)
    return [schemas.PrescriptionResponse.model_validate(p) for p in active]
