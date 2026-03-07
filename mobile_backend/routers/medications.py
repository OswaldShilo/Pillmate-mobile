from fastapi import APIRouter, Depends, HTTPException, Query, status
import sqlite3
from typing import Annotated, List, Optional

from db.sqlite import get_db
from routers.auth import get_current_user
from models import (
    PrescriptionCreate, Prescription,
    MedicationCreate, Medication,
    AlarmCreate, Alarm,
    DoseLogCreate, DoseLog,
)

router = APIRouter(tags=["medications"])


# ── Prescriptions (doctor visit records) ──────────────────────────────────────


@router.get("/prescriptions", response_model=List[Prescription])
def get_prescriptions(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, user_id, image_uri, doctor_name, visit_date, notes, created_at FROM prescriptions WHERE user_id = ? ORDER BY created_at DESC",
        (current_user["id"],)
    )
    return [dict(row) for row in cursor.fetchall()]


@router.post("/prescriptions", response_model=Prescription, status_code=status.HTTP_201_CREATED)
def create_prescription(
    prescription: PrescriptionCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO prescriptions (user_id, image_uri, doctor_name, visit_date, notes) VALUES (?, ?, ?, ?, ?)",
        (current_user["id"], prescription.image_uri, prescription.doctor_name, prescription.visit_date, prescription.notes)
    )
    db.commit()
    pid = cursor.lastrowid
    cursor.execute("SELECT id, user_id, image_uri, doctor_name, visit_date, notes, created_at FROM prescriptions WHERE id = ?", (pid,))
    return dict(cursor.fetchone())


@router.delete("/prescriptions/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prescription(
    prescription_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("DELETE FROM prescriptions WHERE id = ? AND user_id = ?", (prescription_id, current_user["id"]))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return


# ── Medications (daily medicines) ─────────────────────────────────────────────


@router.get("/medications", response_model=List[Medication])
def get_medications(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, user_id, name, dosage, frequency, image_uri, created_at FROM medications WHERE user_id = ? ORDER BY created_at DESC",
        (current_user["id"],)
    )
    return [dict(row) for row in cursor.fetchall()]


@router.post("/medications", response_model=Medication, status_code=status.HTTP_201_CREATED)
def create_medication(
    medication: MedicationCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO medications (user_id, name, dosage, frequency, image_uri) VALUES (?, ?, ?, ?, ?)",
        (current_user["id"], medication.name, medication.dosage, medication.frequency, medication.image_uri)
    )
    db.commit()
    mid = cursor.lastrowid
    cursor.execute("SELECT id, user_id, name, dosage, frequency, image_uri, created_at FROM medications WHERE id = ?", (mid,))
    return dict(cursor.fetchone())


@router.put("/medications/{medication_id}", response_model=Medication)
def update_medication(
    medication_id: int,
    medication: MedicationCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "UPDATE medications SET name = ?, dosage = ?, frequency = ?, image_uri = ? WHERE id = ? AND user_id = ?",
        (medication.name, medication.dosage, medication.frequency, medication.image_uri, medication_id, current_user["id"])
    )
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    cursor.execute("SELECT id, user_id, name, dosage, frequency, image_uri, created_at FROM medications WHERE id = ?", (medication_id,))
    return dict(cursor.fetchone())


@router.delete("/medications/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(
    medication_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("DELETE FROM medications WHERE id = ? AND user_id = ?", (medication_id, current_user["id"]))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    return


# ── Alarms ────────────────────────────────────────────────────────────────────


@router.get("/alarms", response_model=List[Alarm])
def get_alarms(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, user_id, medication_id, time, label, enabled FROM alarms WHERE user_id = ? ORDER BY time ASC",
        (current_user["id"],)
    )
    return [dict(row) for row in cursor.fetchall()]


@router.post("/alarms", response_model=Alarm, status_code=status.HTTP_201_CREATED)
def create_alarm(
    alarm: AlarmCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM medications WHERE id = ? AND user_id = ?", (alarm.medication_id, current_user["id"]))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Medication not found")

    cursor.execute(
        "INSERT INTO alarms (user_id, medication_id, time, label, enabled) VALUES (?, ?, ?, ?, ?)",
        (current_user["id"], alarm.medication_id, alarm.time, alarm.label, alarm.enabled)
    )
    db.commit()
    aid = cursor.lastrowid
    cursor.execute("SELECT id, user_id, medication_id, time, label, enabled FROM alarms WHERE id = ?", (aid,))
    return dict(cursor.fetchone())


@router.delete("/alarms/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm(
    alarm_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("DELETE FROM alarms WHERE id = ? AND user_id = ?", (alarm_id, current_user["id"]))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return


# ── Dose Logs ─────────────────────────────────────────────────────────────────


@router.get("/doses", response_model=List[DoseLog])
def get_doses(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
):
    cursor = db.cursor()
    if date:
        cursor.execute(
            "SELECT id, user_id, medication_id, status, logged_at FROM dose_logs WHERE user_id = ? AND DATE(logged_at) = ? ORDER BY logged_at DESC",
            (current_user["id"], date)
        )
    else:
        cursor.execute(
            "SELECT id, user_id, medication_id, status, logged_at FROM dose_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 100",
            (current_user["id"],)
        )
    return [dict(row) for row in cursor.fetchall()]


@router.post("/doses", response_model=DoseLog, status_code=status.HTTP_201_CREATED)
def log_dose(
    dose: DoseLogCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM medications WHERE id = ? AND user_id = ?", (dose.medication_id, current_user["id"]))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Medication not found")

    cursor.execute(
        "INSERT INTO dose_logs (user_id, medication_id, status) VALUES (?, ?, ?)",
        (current_user["id"], dose.medication_id, dose.status)
    )
    db.commit()
    lid = cursor.lastrowid
    cursor.execute("SELECT id, user_id, medication_id, status, logged_at FROM dose_logs WHERE id = ?", (lid,))
    return dict(cursor.fetchone())


@router.delete("/doses/{dose_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dose(
    dose_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("DELETE FROM dose_logs WHERE id = ? AND user_id = ?", (dose_id, current_user["id"]))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Dose log not found")
    return
