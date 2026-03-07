"""Pydantic models with proper validation rules."""

import re
from enum import Enum
from pydantic import BaseModel, field_validator
from typing import Optional


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHERS = "Others"


# ── Auth Models ────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str

class UserRegister(BaseModel):
    username: str
    password: str
    age: Optional[int] = None
    gender: Optional[Gender] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 20:
            raise ValueError("Username must be at most 20 characters")
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username can only contain letters, numbers, and underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 72:
            raise ValueError("Password must be at most 72 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 150):
            raise ValueError("Age must be between 1 and 150")
        return v


class ProfileUpdate(BaseModel):
    age: Optional[int] = None
    gender: Optional[Gender] = None

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 150):
            raise ValueError("Age must be between 1 and 150")
        return v


class UserProfile(BaseModel):
    id: int
    username: str
    age: Optional[int] = None
    gender: Optional[str] = None


# ── Prescription Models (doctor visit records) ────────────────────────────────


class PrescriptionCreate(BaseModel):
    image_uri: str = ""
    doctor_name: str = ""
    visit_date: str = ""
    notes: str = ""

    @field_validator("doctor_name")
    @classmethod
    def validate_doctor_name(cls, v: str) -> str:
        if len(v) > 100:
            raise ValueError("Doctor name must be at most 100 characters")
        return v.strip()


class Prescription(PrescriptionCreate):
    id: int
    user_id: int
    created_at: Optional[str] = None


# ── Medication Models (daily medicines) ───────────────────────────────────────


class MedicationCreate(BaseModel):
    name: str
    dosage: str = ""
    frequency: int = 1
    image_uri: str = ""

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Medication name is required")
        if len(v) > 100:
            raise ValueError("Medication name must be at most 100 characters")
        return v

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("Frequency must be between 1 and 10")
        return v


class Medication(MedicationCreate):
    id: int
    user_id: int
    created_at: Optional[str] = None


# ── Alarm Models ──────────────────────────────────────────────────────────────


class AlarmCreate(BaseModel):
    medication_id: int
    time: str
    label: str = ""
    enabled: bool = True

    @field_validator("time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{2}:\d{2}$", v):
            raise ValueError("Time must be in HH:MM format")
        parts = v.split(":")
        h, m = int(parts[0]), int(parts[1])
        if h < 0 or h > 23:
            raise ValueError("Hour must be 0-23")
        if m < 0 or m > 59:
            raise ValueError("Minute must be 0-59")
        return v


class Alarm(AlarmCreate):
    id: int
    user_id: int


# ── Dose Logging Models ──────────────────────────────────────────────────────


class DoseLogCreate(BaseModel):
    medication_id: int
    status: str = "taken"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ("taken", "missed", "skipped"):
            raise ValueError("Status must be 'taken', 'missed', or 'skipped'")
        return v


class DoseLog(DoseLogCreate):
    id: int
    user_id: int
    logged_at: Optional[str] = None
