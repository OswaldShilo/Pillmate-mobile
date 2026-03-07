"""PillMate FastAPI backend.

Run:  uvicorn main:app --reload --port 8080

Endpoints:
    POST /analyze             image -> Gemini AI -> detected medications
    POST /medications/import  save detected meds to DynamoDB
    GET  /medications         list saved medications
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.sqlite import create_tables_if_not_exist
from routers import auth, medications

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Creating SQLite tables if not exist...")
    try:
        create_tables_if_not_exist()
        print("[Startup] Database ready.")
    except Exception as exc:
        print(f"[Startup] WARNING: {exc}")
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(medications.router)


@app.get("/")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}

