from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import assessments, auth, companies, sessions, sites, users

app = FastAPI(title="Higiene Postural API", version="0.1.0")

_settings = get_settings()
_origins = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])
app.include_router(sites.router, prefix="/sites", tags=["sites"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(assessments.router, prefix="/assessments", tags=["assessments"])


@app.get("/health")
def health():
    return {"status": "ok"}
