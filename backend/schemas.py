from pydantic import BaseModel
from typing import Optional, List


# ── Appointment ──────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    provider: str
    datetime: str
    repeat: str = "none"
    series_end_date: Optional[str] = None


class AppointmentUpdate(BaseModel):
    provider: Optional[str] = None
    datetime: Optional[str] = None
    repeat: Optional[str] = None
    is_active: Optional[bool] = None
    series_end_date: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: str
    user_id: str
    provider: str
    datetime: str
    repeat: str
    is_active: bool
    series_end_date: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Prescription ─────────────────────────────────────────────────────────────

class PrescriptionCreate(BaseModel):
    medication: str
    dosage: str
    quantity: int = 1
    refill_on: str
    refill_schedule: str = "monthly"


class PrescriptionUpdate(BaseModel):
    medication: Optional[str] = None
    dosage: Optional[str] = None
    quantity: Optional[int] = None
    refill_on: Optional[str] = None
    refill_schedule: Optional[str] = None
    is_active: Optional[bool] = None


class PrescriptionResponse(BaseModel):
    id: str
    user_id: str
    medication: str
    dosage: str
    quantity: int
    refill_on: str
    refill_schedule: str
    is_active: bool

    model_config = {"from_attributes": True}


# ── User / Patient ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str

    model_config = {"from_attributes": True}


class UserDetailResponse(BaseModel):
    id: str
    name: str
    email: str
    appointments: List[AppointmentResponse] = []
    prescriptions: List[PrescriptionResponse] = []

    model_config = {"from_attributes": True}


class UserListItem(BaseModel):
    id: str
    name: str
    email: str
    total_appointments: int = 0
    total_prescriptions: int = 0
    next_appointment: Optional[AppointmentResponse] = None

    model_config = {"from_attributes": True}


# ── Provider ──────────────────────────────────────────────────────────────────

class ProviderCreate(BaseModel):
    name: str
    specialty: Optional[str] = None


class ProviderResponse(BaseModel):
    id: str
    name: str
    specialty: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


# ── Medication ────────────────────────────────────────────────────────────────

class MedicationCreate(BaseModel):
    name: str
    dosages: List[str]


class MedicationResponse(BaseModel):
    id: str
    name: str
    dosages: List[str]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    patient: UserResponse
    upcoming_appointments: List[AppointmentResponse]
    upcoming_refills: List[PrescriptionResponse]
