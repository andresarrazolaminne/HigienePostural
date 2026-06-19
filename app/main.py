import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings
from app.routers import assessments, auth, branding, companies, reports, sessions, sites, users
from app.services.assessment_queue import recover_stuck_queued_on_startup
from app.services.storage_service import StorageError, get_storage_service

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=()"
        return response


app = FastAPI(title="Higiene Postural API", version="0.1.0")

_settings = get_settings()
_origins = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(branding.router, prefix="/branding", tags=["branding"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])
app.include_router(sites.router, prefix="/sites", tags=["sites"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(assessments.router, prefix="/assessments", tags=["assessments"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])


@app.on_event("startup")
def _startup_checks() -> None:
    settings = get_settings()
    logger.info(
        "Arranque: environment=%s storage_backend=%s",
        settings.environment,
        settings.storage_backend,
    )
    if settings.storage_backend != "s3":
        return
    try:
        svc = get_storage_service()
        if hasattr(svc, "verify_access"):
            svc.verify_access()
        logger.info("S3 accesible: bucket=%s prefix=%s", settings.s3_bucket, settings.s3_prefix)
    except StorageError as e:
        logger.error("S3 no disponible al arranque: %s", e)
    recover_stuck_queued_on_startup()


@app.get("/health")
def health():
    settings = get_settings()
    payload: dict[str, str] = {"status": "ok", "storage_backend": settings.storage_backend}
    if settings.storage_backend == "s3":
        payload["s3_bucket"] = settings.s3_bucket
    return payload
