import uuid
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    appointments = relationship(
        "Appointment",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Appointment.datetime",
    )
    prescriptions = relationship(
        "Prescription",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Prescription.refill_on",
    )


class Provider(Base):
    __tablename__ = "providers"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    specialty = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Medication(Base):
    __tablename__ = "medications"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    dosages = Column(String, nullable=False)  # JSON-encoded list: '["10mg","20mg"]'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    provider = Column(String, nullable=False)
    datetime = Column(String, nullable=False)   # ISO local datetime string
    repeat = Column(String, default="none")     # none | weekly | monthly
    is_active = Column(Boolean, default=True)
    series_end_date = Column(String, nullable=True)  # end date for recurring series
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="appointments")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    medication = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    refill_on = Column(String, nullable=False)    # ISO date string YYYY-MM-DD
    refill_schedule = Column(String, default="monthly")  # monthly | weekly
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="prescriptions")
