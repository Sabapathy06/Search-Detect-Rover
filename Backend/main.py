from fastapi import Body, Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, DateTime, Float, Integer, String, create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from datetime import datetime
from pathlib import Path
import cv2
import numpy as np
import os
import shutil
import time
from werkzeug.utils import secure_filename

app = FastAPI(title="Rescue Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
PRIORITY_LEVELS = ("CRITICAL", "HIGH", "MEDIUM", "LOW")
PRIORITY_ORDER = {level: index for index, level in enumerate(PRIORITY_LEVELS)}
DEFAULT_NAME = "Unknown Person"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'rescue.db')}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_camera_state = {"connected": False, "source": None, "last_check": None}


class PersonDetection(Base):
    __tablename__ = "person_detection"
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(String(50), unique=True)
    name = Column(String(120), default=DEFAULT_NAME)
    health = Column(String(100), default="Stable")
    image_filename = Column(String(200), default="")
    image_path = Column(String(255), default="")
    date = Column(String(20), default="")
    time = Column(String(20), default="")
    priority = Column(Integer, default=0, nullable=False)
    priority_level = Column(String(20), default="MEDIUM")
    ai_suggested_priority = Column(String(20), default="")
    confidence = Column(Float, nullable=True)
    source = Column(String(80), default="Manual Upload")
    status = Column(String(40), default="Detected")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


def ensure_database_schema():
    with engine.begin() as connection:
        columns = connection.execute(text("PRAGMA table_info(person_detection)")).fetchall()
        existing = {column[1] for column in columns}
        migrations = {
            "image_path": "ALTER TABLE person_detection ADD COLUMN image_path VARCHAR(255) DEFAULT ''",
            "date": "ALTER TABLE person_detection ADD COLUMN date VARCHAR(20) DEFAULT ''",
            "time": "ALTER TABLE person_detection ADD COLUMN time VARCHAR(20) DEFAULT ''",
            "priority": "ALTER TABLE person_detection ADD COLUMN priority INTEGER DEFAULT 0",
            "created_at": "ALTER TABLE person_detection ADD COLUMN created_at DATETIME",
            "name": f"ALTER TABLE person_detection ADD COLUMN name VARCHAR(120) DEFAULT '{DEFAULT_NAME}'",
            "priority_level": "ALTER TABLE person_detection ADD COLUMN priority_level VARCHAR(20) DEFAULT 'MEDIUM'",
            "ai_suggested_priority": "ALTER TABLE person_detection ADD COLUMN ai_suggested_priority VARCHAR(20) DEFAULT ''",
            "confidence": "ALTER TABLE person_detection ADD COLUMN confidence FLOAT",
            "source": "ALTER TABLE person_detection ADD COLUMN source VARCHAR(80) DEFAULT 'Manual Upload'",
            "status": "ALTER TABLE person_detection ADD COLUMN status VARCHAR(40) DEFAULT 'Detected'",
            "latitude": "ALTER TABLE person_detection ADD COLUMN latitude FLOAT",
            "longitude": "ALTER TABLE person_detection ADD COLUMN longitude FLOAT",
        }
        for column_name, statement in migrations.items():
            if column_name not in existing:
                connection.execute(text(statement))


ensure_database_schema()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize_person_id(person_id):
    if person_id is None:
        return None
    value = str(person_id).strip().upper()
    if not value:
        return None
    if value.startswith("P-"):
        value = "P" + value[2:]
    if value.startswith("P") and value[1:].isdigit():
        return f"P{int(value[1:]):03d}"
    if value.isdigit():
        return f"P{int(value):03d}"
    return value


def is_valid_person_id(value):
    normalized = normalize_person_id(value)
    return bool(normalized and normalized.startswith("P") and normalized[1:].isdigit())


def looks_like_filename(value):
    if not value:
        return False
    lowered = str(value).lower()
    return any(lowered.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS)


def suggest_priority_from_confidence(confidence):
    if confidence is None:
        return ""
    try:
        score = float(confidence)
    except (TypeError, ValueError):
        return ""
    if score >= 90:
        return "HIGH"
    if score >= 75:
        return "MEDIUM"
    return "LOW"


def normalize_person_name(name):
    value = str(name or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="Person name is required")
    return value[:120]


def default_person_name(person_id):
    normalized_id = normalize_person_id(person_id)
    if normalized_id and normalized_id[1:].isdigit():
        return f"Person {int(normalized_id[1:]):03d}"
    return "Person"


def normalize_priority_level(level, fallback="MEDIUM"):
    if not level:
        return fallback
    value = str(level).strip().upper()
    if value in PRIORITY_LEVELS:
        return value
    aliases = {
        "CRITICAL": "CRITICAL",
        "HIGH": "HIGH",
        "MEDIUM": "MEDIUM",
        "LOW": "LOW",
        "URGENT": "CRITICAL",
        "SERIOUS": "HIGH",
        "MINOR": "LOW",
        "STABLE": "MEDIUM",
    }
    return aliases.get(value, fallback)


def generate_next_person_id(db: Session):
    max_number = 0
    for person in db.query(PersonDetection).all():
        candidate = normalize_person_id(person.person_id)
        if candidate and candidate.startswith("P") and candidate[1:].isdigit():
            max_number = max(max_number, int(candidate[1:]))

    if os.path.isdir(UPLOAD_FOLDER):
        for filename in os.listdir(UPLOAD_FOLDER):
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_IMAGE_EXTENSIONS:
                continue
            stem = os.path.splitext(filename)[0]
            candidate = normalize_person_id(stem)
            if candidate and candidate.startswith("P") and candidate[1:].isdigit():
                max_number = max(max_number, int(candidate[1:]))

    return f"P{max_number + 1:03d}"


def format_display_date(date_value, created_value):
    if date_value:
        return date_value
    return created_value.strftime("%d %b %Y")


def serialize_person(person: PersonDetection):
    record_id = normalize_person_id(person.person_id) or f"P{person.id:03d}"
    created_value = person.created_at or person.timestamp or datetime.utcnow()
    date_value = person.date or created_value.strftime("%d %b %Y")
    time_value = person.time or created_value.strftime("%H:%M:%S")
    image_name = person.image_filename or os.path.basename(person.image_path or "")
    image_url = person.image_path or (f"/static/uploads/{image_name}" if image_name else "/static/placeholder.svg")
    priority_level = normalize_priority_level(person.priority_level or person.health, "MEDIUM")
    ai_suggested = normalize_priority_level(person.ai_suggested_priority, "") if person.ai_suggested_priority else suggest_priority_from_confidence(person.confidence)
    display_name = person.name or DEFAULT_NAME
    if looks_like_filename(display_name) or display_name == os.path.splitext(image_name)[0]:
        display_name = DEFAULT_NAME
    return {
        "id": person.id,
        "person_id": record_id,
        "name": display_name,
        "health": person.health or "Stable",
        "photo": image_name,
        "date": date_value,
        "time": time_value,
        "priority": person.priority or 0,
        "priority_level": priority_level,
        "ai_suggested_priority": ai_suggested,
        "confidence": person.confidence,
        "source": person.source or "Manual Upload",
        "status": person.status or "Detected",
        "latitude": person.latitude,
        "longitude": person.longitude,
        "filename": image_name,
        "image_filename": image_name,
        "image_path": person.image_path or image_url,
        "image_url": image_url,
        "timestamp": created_value.strftime("%Y-%m-%d %H:%M:%S") if created_value else "",
        "created_at": created_value.strftime("%Y-%m-%d %H:%M:%S") if created_value else "",
    }


def get_next_priority(db: Session):
    highest = db.query(PersonDetection).filter(PersonDetection.status != "Rescued").order_by(PersonDetection.priority.desc()).first()
    if highest is None:
        return 1
    return (highest.priority or 0) + 1


def sort_persons(persons):
    return sorted(
        persons,
        key=lambda item: (
            PRIORITY_ORDER.get(item.get("priority_level") or "MEDIUM", 99),
            item.get("priority") or 0,
            item.get("created_at") or "",
        ),
    )


def get_directory_persons(db: Session):
    person_rows = db.query(PersonDetection).order_by(
        PersonDetection.priority_level.asc(),
        PersonDetection.priority.asc(),
        PersonDetection.created_at.asc(),
        PersonDetection.id.asc(),
    ).all()

    return sort_persons([serialize_person(person) for person in person_rows])


def find_person_record(identifier: str, db: Session):
    if identifier is None:
        return None

    raw_value = str(identifier).strip()
    if not raw_value:
        return None

    if raw_value.isdigit():
        by_id = db.query(PersonDetection).filter(PersonDetection.id == int(raw_value)).first()
        if by_id:
            return by_id

    normalized_id = normalize_person_id(raw_value)
    if normalized_id:
        person = db.query(PersonDetection).filter(PersonDetection.person_id == normalized_id).first()
        if person:
            return person

    person = db.query(PersonDetection).filter(PersonDetection.person_id == raw_value).first()
    if person:
        return person

    filename = find_upload_filename(raw_value)
    if filename:
        person = db.query(PersonDetection).filter(PersonDetection.image_filename == filename).first()
        if person:
            return person

    return db.query(PersonDetection).filter(PersonDetection.image_filename == raw_value).first()


def find_upload_filename(identifier: str):
    if identifier is None:
        return None

    raw_value = str(identifier).strip()
    if not raw_value or raw_value in {".", ".."}:
        return None

    candidate = os.path.basename(raw_value.replace("\\", "/"))
    if not candidate or candidate in {".", ".."}:
        return None

    if candidate.lower().endswith(tuple(SUPPORTED_IMAGE_EXTENSIONS)):
        filename = secure_filename(candidate)
        if filename and os.path.exists(os.path.join(UPLOAD_FOLDER, filename)):
            return filename

    lookup_name = os.path.splitext(candidate)[0]
    normalized_lookup = normalize_person_id(lookup_name)
    for filename in sorted(os.listdir(UPLOAD_FOLDER)):
        ext = os.path.splitext(filename)[1].lower()
        if ext not in SUPPORTED_IMAGE_EXTENSIONS:
            continue
        if filename == candidate:
            return filename
        if os.path.splitext(filename)[0] == lookup_name:
            return filename
        if normalize_person_id(os.path.splitext(filename)[0]) == normalized_lookup:
            return filename
    return None


def resolve_safe_upload_path(identifier: str):
    filename = find_upload_filename(identifier)
    if not filename:
        return None

    upload_root = Path(UPLOAD_FOLDER).resolve()
    candidate = (upload_root / filename).resolve()
    if not candidate.is_relative_to(upload_root):
        return None
    if not candidate.exists() or not candidate.is_file():
        return None
    return candidate


def delete_person_db_record(identifier: str, filename: str, db: Session):
    deleted = False
    person = find_person_record(identifier, db)
    if person:
        db.delete(person)
        deleted = True

    if not deleted:
        match_name = filename or os.path.basename(str(identifier) or "")
        normalized_id = normalize_person_id(identifier)
        for row in list(db.query(PersonDetection).all()):
            file_name = row.image_filename or os.path.basename(row.image_path or "")
            person_key = normalize_person_id(row.person_id)
            if (
                (match_name and file_name == match_name)
                or (normalized_id and person_key == normalized_id)
                or row.person_id == str(identifier)
            ):
                db.delete(row)
                deleted = True

    db.commit()
    return deleted


def delete_uploaded_file_for_person(identifier: str, filename: str):
    candidates = []
    match_name = filename or os.path.basename(str(identifier) or "")
    if match_name:
        candidates.append(match_name)
    normalized_id = normalize_person_id(identifier)
    if normalized_id:
        for ext in SUPPORTED_IMAGE_EXTENSIONS:
            candidates.append(f"{normalized_id}{ext}")

    seen = set()
    deleted_file = None
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        full_path = os.path.join(UPLOAD_FOLDER, secure_filename(candidate))
        if os.path.exists(full_path):
            os.remove(full_path)
            deleted_file = secure_filename(candidate)

    if not deleted_file and identifier:
        normalized_id = normalize_person_id(identifier)
        for file_name in sorted(os.listdir(UPLOAD_FOLDER)):
            full_path = os.path.join(UPLOAD_FOLDER, file_name)
            if not os.path.isfile(full_path):
                continue
            ext = os.path.splitext(file_name)[1].lower()
            if ext not in SUPPORTED_IMAGE_EXTENSIONS:
                continue
            if normalize_person_id(os.path.splitext(file_name)[0]) == normalized_id or file_name == match_name:
                os.remove(full_path)
                return file_name

    return deleted_file


def build_mission_log(db: Session):
    events = []
    for person in db.query(PersonDetection).order_by(PersonDetection.created_at.desc()).all():
        created_value = person.created_at or person.timestamp
        if not created_value:
            continue
        person_key = normalize_person_id(person.person_id) or person.person_id
        level = normalize_priority_level(person.priority_level, "MEDIUM")
        icon = "info"
        if level == "CRITICAL":
            icon = "critical"
        elif level == "HIGH":
            icon = "warning"
        events.append(
            {
                "time": created_value.strftime("%H:%M:%S"),
                "date": created_value.strftime("%d %b %Y"),
                "message": f"Person {person_key} detected",
                "level": level,
                "icon": icon,
                "timestamp": created_value.strftime("%Y-%m-%d %H:%M:%S"),
            }
        )

    events.sort(key=lambda item: item["timestamp"], reverse=True)
    return events[:50]


def build_stats(persons):
    stats = {
        "total_detected": len(persons),
        "confirmed_persons": len([p for p in persons if p.get("status") == "Confirmed"]),
        "possible_persons": len([p for p in persons if p.get("status") in ("Detected", "Possible")]),
        "false_detections": len([p for p in persons if p.get("status") == "False Positive"]),
        "critical": len([p for p in persons if p.get("priority_level") == "CRITICAL"]),
        "high": len([p for p in persons if p.get("priority_level") == "HIGH"]),
        "medium": len([p for p in persons if p.get("priority_level") == "MEDIUM"]),
        "low": len([p for p in persons if p.get("priority_level") == "LOW"]),
        "rescued": len([p for p in persons if p.get("status") == "Rescued" or p.get("health") == "Rescued"]),
    }
    return stats


@app.get("/")
def index() -> RedirectResponse:
    return RedirectResponse(url="/health")


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "message": "The backend is running successfully!"})


@app.get("/api/status")
def system_status(db: Session = Depends(get_db)):
    camera_connected = bool(_camera_state.get("connected"))
    return JSONResponse(
        {
            "success": True,
            "rover": {"connection": "Not connected", "status": "offline"},
            "backend": {"connection": "Connected", "status": "online"},
            "camera": {
                "connection": "Connected" if camera_connected else "Not connected",
                "status": "online" if camera_connected else "offline",
                "source": _camera_state.get("source"),
            },
            "gps": {"connection": "Not connected", "status": "offline", "locked": False},
            "battery": {"level": None, "status": "not_connected"},
            "motors": {"status": "not_connected"},
            "imu": {"status": "not_connected"},
            "ultrasonic": {"value": None, "status": "not_connected"},
            "thermal": {"value": None, "status": "not_connected"},
            "esp32_cam": {"status": "not_connected"},
            "persons_count": len(get_directory_persons(db)),
        }
    )


@app.get("/api/stats")
def api_stats(db: Session = Depends(get_db)):
    persons = get_directory_persons(db)
    return JSONResponse({"success": True, "stats": build_stats(persons)})


@app.get("/api/mission-log")
def mission_log(db: Session = Depends(get_db)):
    return JSONResponse({"success": True, "events": build_mission_log(db)})


@app.post("/upload")
async def upload_file(
    image: UploadFile = File(...),
    person_id: str = Form(...),
    health: str = Form("Stable"),
    db: Session = Depends(get_db),
):
    try:
        if image.filename == "":
            raise HTTPException(status_code=400, detail="Empty filename")

        if not person_id or not person_id.isdigit():
            raise HTTPException(status_code=400, detail="Invalid or missing person_id")

        valid_health = {"Critical", "Serious", "Minor", "Stable"}
        if health not in valid_health:
            health = "Stable"

        person_num = normalize_person_id(person_id)
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        filename = secure_filename(f"{person_num}{ext}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        person = db.query(PersonDetection).filter_by(person_id=person_num).first()
        timestamp = datetime.utcnow()
        if person:
            person.health = health
            person.image_filename = filename
            person.image_path = f"/static/uploads/{filename}"
            person.timestamp = timestamp
        else:
            person = PersonDetection(
                person_id=person_num,
                name=DEFAULT_NAME,
                health=health,
                image_filename=filename,
                image_path=f"/static/uploads/{filename}",
                date=timestamp.strftime("%d %b %Y"),
                time=timestamp.strftime("%H:%M:%S"),
                priority=get_next_priority(db),
                priority_level=normalize_priority_level(health, "MEDIUM"),
                source="Legacy Upload",
                status="Detected",
                timestamp=timestamp,
                created_at=timestamp,
            )
            db.add(person)

        db.commit()
        return JSONResponse({"status": "success", "filename": filename})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/persons")
async def create_person_capture(
    image: UploadFile = File(default=None),
    file: UploadFile = File(default=None),
    source: str = Form(default="Laptop Camera"),
    name: str = Form(default=""),
    confidence: float = Form(default=None),
    db: Session = Depends(get_db),
):
    uploaded_file = image or file
    if uploaded_file is None or uploaded_file.filename in (None, ""):
        raise HTTPException(status_code=400, detail="No image uploaded")

    ext = os.path.splitext(uploaded_file.filename)[1].lower()
    if ext not in SUPPORTED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use JPG, JPEG, PNG, or WEBP.")

    contents = await uploaded_file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 10 MB limit.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image file.")

    person_id = generate_next_person_id(db)
    safe_name = normalize_person_name(name) if str(name or "").strip() else default_person_name(person_id)
    timestamp = datetime.utcnow()
    date_value = timestamp.strftime("%d %b %Y")
    time_value = timestamp.strftime("%H:%M:%S")
    filename = secure_filename(f"{person_id}{ext}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    confidence_value = float(confidence) if confidence is not None else None
    ai_suggested = suggest_priority_from_confidence(confidence_value) or "MEDIUM"
    safe_source = (source or "Laptop Camera").strip()[:80]
    person = PersonDetection(
        person_id=person_id,
        name=safe_name,
        health="Stable",
        image_filename=filename,
        image_path=f"/static/uploads/{filename}",
        date=date_value,
        time=time_value,
        priority=get_next_priority(db),
        priority_level=ai_suggested,
        ai_suggested_priority=ai_suggested,
        confidence=confidence_value,
        source=safe_source,
        status="Detected",
        timestamp=timestamp,
        created_at=timestamp,
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    payload = serialize_person(person)
    payload["success"] = True
    return JSONResponse(payload)


@app.patch("/api/persons/{person_id}")
def update_person(person_id: str, payload: dict = Body(default={}), db: Session = Depends(get_db)):
    person = find_person_record(person_id, db)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")

    person.name = normalize_person_name((payload or {}).get("name"))
    db.commit()
    db.refresh(person)
    return JSONResponse({"success": True, **serialize_person(person)})


@app.get("/uploads/{filename}")
def get_file(filename: str):
    full = os.path.join(UPLOAD_FOLDER, secure_filename(filename))
    if not os.path.exists(full):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full)


@app.get("/api/persons")
def get_persons(db: Session = Depends(get_db)):
    ensure_database_schema()
    persons = get_directory_persons(db)
    active = [person for person in persons if person.get("status") != "Rescued" and person.get("health") != "Rescued"]
    rescued = [person for person in persons if person.get("status") == "Rescued" or person.get("health") == "Rescued"]
    active = sort_persons(active)
    rescued = sort_persons(rescued)
    return JSONResponse(
        {
            "success": True,
            "persons": persons,
            "active": active,
            "rescued": rescued,
            "stats": build_stats(persons),
        }
    )


@app.patch("/api/persons/{person_id}/priority")
def update_person_priority(person_id: str, payload: dict = Body(default={"direction": "up"}), db: Session = Depends(get_db)):
    payload = payload or {}
    level = payload.get("level")
    direction = payload.get("direction")

    current = find_person_record(person_id, db)
    if current is None:
        raise HTTPException(status_code=404, detail="Person not found")

    if level:
        normalized_level = normalize_priority_level(level)
        current.priority_level = normalized_level
        current.priority = get_next_priority(db)
        db.commit()
        return JSONResponse(
            {
                "success": True,
                "person_id": current.person_id,
                "priority": current.priority,
                "priority_level": current.priority_level,
            }
        )

    people = (
        db.query(PersonDetection)
        .filter(PersonDetection.status != "Rescued", PersonDetection.health != "Rescued")
        .order_by(PersonDetection.priority.asc(), PersonDetection.created_at.asc())
        .all()
    )
    active_ids = [p.id for p in people]
    if current.id not in active_ids:
        raise HTTPException(status_code=400, detail="Person is not in the active queue")

    index = active_ids.index(current.id)
    if direction == "up" and index > 0:
        other = people[index - 1]
        current.priority, other.priority = other.priority, current.priority
    elif direction == "down" and index < len(people) - 1:
        other = people[index + 1]
        current.priority, other.priority = other.priority, current.priority
    db.commit()
    return JSONResponse({"success": True, "person_id": current.person_id, "priority": current.priority, "priority_level": current.priority_level})


@app.delete("/api/persons/{identifier}")
def delete_person(identifier: str, db: Session = Depends(get_db)):
    safe_identifier = str(identifier).strip()
    if not safe_identifier or safe_identifier in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid person identifier")

    person = find_person_record(safe_identifier, db)
    actual_name = None
    if person and person.image_filename:
        actual_name = person.image_filename
    if not actual_name:
        actual_name = find_upload_filename(safe_identifier)

    file_deleted = False
    if actual_name:
        file_path = os.path.join(UPLOAD_FOLDER, secure_filename(actual_name))
        if os.path.exists(file_path):
            os.remove(file_path)
            file_deleted = True
    else:
        deleted_name = delete_uploaded_file_for_person(safe_identifier, None)
        file_deleted = bool(deleted_name)
        actual_name = deleted_name

    db_deleted = delete_person_db_record(safe_identifier, actual_name or safe_identifier, db)

    if db_deleted or file_deleted:
        return JSONResponse(
            {
                "success": True,
                "filename": actual_name or safe_identifier,
                "deleted": True,
                "db_deleted": db_deleted,
                "file_deleted": file_deleted,
            }
        )

    if person is not None:
        return JSONResponse({"success": True, "deleted": True, "db_deleted": True, "file_deleted": False})

    raise HTTPException(status_code=404, detail="Person or uploaded image not found")


@app.delete("/api/persons")
def delete_all_persons(db: Session = Depends(get_db)):
    for filename in os.listdir(UPLOAD_FOLDER):
        full_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.isfile(full_path):
            ext = os.path.splitext(filename)[1].lower()
            if ext in SUPPORTED_IMAGE_EXTENSIONS:
                os.remove(full_path)

    db.query(PersonDetection).delete()
    db.commit()
    return JSONResponse({"success": True, "deleted": True})


@app.post("/api/rescue/{person_id}")
def rescue_person(person_id: str, action: str = Query(default="rescue"), db: Session = Depends(get_db)):
    normalized_id = normalize_person_id(person_id)
    person = find_person_record(person_id, db)
    if not person:
        person = PersonDetection(
            person_id=normalized_id or person_id,
            name=DEFAULT_NAME,
            health="Rescued",
            image_filename="",
            image_path="/static/placeholder.svg",
            date=datetime.utcnow().strftime("%d %b %Y"),
            time=datetime.utcnow().strftime("%H:%M:%S"),
            status="Rescued",
            timestamp=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(person)

    if action == "safe":
        person.health = "Stable"
        person.status = "Confirmed"
    else:
        person.health = "Rescued"
        person.status = "Rescued"

    person.timestamp = datetime.utcnow()
    person.created_at = person.created_at or person.timestamp
    db.commit()
    return JSONResponse({"status": "ok", "health": person.health, "status": person.status})


CAMERA_URL = os.getenv("CAMERA_URL", "http://192.168.111.96:81/stream")
LOCAL_CAMERA_INDEX = int(os.getenv("LOCAL_CAMERA_INDEX", "0"))


def create_fallback_frame():
    frame = np.full((480, 640, 3), (8, 14, 24), dtype=np.uint8)
    cv2.putText(frame, "Camera unavailable", (95, 210), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, "Preview will resume when the stream is reachable", (48, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 205, 225), 1, cv2.LINE_AA)
    return frame


def open_camera_capture():
    try:
        capture = cv2.VideoCapture(CAMERA_URL)
        if capture.isOpened():
            return capture, "network"
        capture.release()
    except Exception:
        pass

    try:
        capture = cv2.VideoCapture(LOCAL_CAMERA_INDEX, cv2.CAP_DSHOW)
        if capture.isOpened():
            return capture, "local"
        capture.release()
    except Exception:
        pass

    try:
        capture = cv2.VideoCapture(LOCAL_CAMERA_INDEX)
        if capture.isOpened():
            return capture, "local"
        capture.release()
    except Exception:
        pass

    return None, None


def gen_frames():
    cap = None
    fallback_active = False
    while True:
        if cap is None or not cap.isOpened():
            if not fallback_active:
                cap, source = open_camera_capture()
                if cap is None:
                    fallback_active = True
                    _camera_state.update({"connected": False, "source": None, "last_check": datetime.utcnow().isoformat()})
                    print("[INFO] No camera available; using fallback preview.")
                else:
                    _camera_state.update({"connected": True, "source": source, "last_check": datetime.utcnow().isoformat()})
                    print(f"[INFO] Camera feed connected via {source}.")

            if cap is None:
                frame = create_fallback_frame()
                _, buffer = cv2.imencode(".jpg", frame)
                frame_bytes = buffer.tobytes()
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n'
                )
                time.sleep(2)
                continue

        success, frame = cap.read()
        if not success:
            try:
                cap.release()
            except Exception:
                pass
            cap = None
            fallback_active = False
            _camera_state.update({"connected": False, "source": None, "last_check": datetime.utcnow().isoformat()})
            time.sleep(2)
            continue

        _camera_state.update({"connected": True, "source": _camera_state.get("source"), "last_check": datetime.utcnow().isoformat()})
        _, buffer = cv2.imencode(".jpg", frame)
        frame_bytes = buffer.tobytes()
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n'
        )


@app.get("/video_feed")
def video_feed():
    return StreamingResponse(gen_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Backend.main:app", host="localhost", port=8000, reload=True)
