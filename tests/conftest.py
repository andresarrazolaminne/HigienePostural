"""Fixtures: SQLite en memoria y datos multi-empresa para pruebas de aislamiento."""

from __future__ import annotations

import os
from collections.abc import Generator
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Entorno de test antes de importar la app (get_settings cacheado).
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("STORAGE_BACKEND", "local")
os.environ.setdefault("UPLOAD_DIR", "uploads_test")

from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.database import get_db
from app.main import app
from app.models.assessment import Assessment
from app.models.company import Company
from app.models.expert_assignment import ExpertCompanyAssignment
from app.models.site import Site
from app.models.user import User, UserRole
from app.models.work_session import WorkSession
from app.core.review_status import APPROVED, PENDING

get_settings.cache_clear()

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@dataclass
class TenantFixture:
    company_a: Company
    company_b: Company
    site_a: Site
    site_b: Site
    super_admin: User
    admin_a: User
    admin_b: User
    inspector_a: User
    inspector_b: User
    expert_a: User
    expert_unassigned: User
    assessment_a: Assessment
    assessment_b: Assessment


def _add_user(
    db: Session,
    *,
    email: str,
    role: UserRole,
    company_id: int | None,
    password: str = "password123",
) -> User:
    u = User(
        name=email.split("@")[0],
        email=email,
        hashed_password=get_password_hash(password),
        role=role,
        company_id=company_id,
    )
    db.add(u)
    db.flush()
    return u


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture()
def tenants(db: Session) -> TenantFixture:
    co_a = Company(name="Empresa Alpha")
    co_b = Company(name="Empresa Beta")
    db.add_all([co_a, co_b])
    db.flush()

    site_a = Site(company_id=co_a.id, name="Sede Alpha", address="A")
    site_b = Site(company_id=co_b.id, name="Sede Beta", address="B")
    db.add_all([site_a, site_b])
    db.flush()

    super_admin = _add_user(db, email="super@test.co", role=UserRole.super_admin, company_id=None)
    admin_a = _add_user(db, email="admin-a@test.co", role=UserRole.company_admin, company_id=co_a.id)
    admin_b = _add_user(db, email="admin-b@test.co", role=UserRole.company_admin, company_id=co_b.id)
    inspector_a = _add_user(db, email="inspector-a@test.co", role=UserRole.user, company_id=co_a.id)
    inspector_b = _add_user(db, email="inspector-b@test.co", role=UserRole.user, company_id=co_b.id)
    expert_a = _add_user(db, email="expert-a@test.co", role=UserRole.expert, company_id=None)
    expert_unassigned = _add_user(db, email="expert-x@test.co", role=UserRole.expert, company_id=None)
    db.add(ExpertCompanyAssignment(user_id=expert_a.id, company_id=co_a.id))

    ws_a = WorkSession(user_id=inspector_a.id, site_id=site_a.id, start_time=__import__("datetime").datetime.now(__import__("datetime").timezone.utc))
    ws_b = WorkSession(user_id=inspector_b.id, site_id=site_b.id, start_time=ws_a.start_time)
    db.add_all([ws_a, ws_b])
    db.flush()

    asm_a = Assessment(
        session_id=ws_a.id,
        image_path="uploads_test/1/1/x.jpg",
        processing_status="completed",
        raw_ai_json={"overall_risk_score": 50, "primary_issue": "Alpha issue"},
        calculated_score=50.0,
        primary_issue="Alpha issue",
        review_status=PENDING,
    )
    asm_b = Assessment(
        session_id=ws_b.id,
        image_path="uploads_test/2/2/y.jpg",
        processing_status="completed",
        raw_ai_json={"overall_risk_score": 70, "primary_issue": "Beta issue"},
        calculated_score=70.0,
        primary_issue="Beta issue",
        review_status=APPROVED,
        expert_calculated_score=70.0,
        expert_primary_issue="Beta issue",
    )
    db.add_all([asm_a, asm_b])
    db.commit()
    for obj in (co_a, co_b, site_a, site_b, super_admin, admin_a, admin_b, inspector_a, inspector_b, expert_a, expert_unassigned, asm_a, asm_b):
        db.refresh(obj)
    return TenantFixture(
        company_a=co_a,
        company_b=co_b,
        site_a=site_a,
        site_b=site_b,
        super_admin=super_admin,
        admin_a=admin_a,
        admin_b=admin_b,
        inspector_a=inspector_a,
        inspector_b=inspector_b,
        expert_a=expert_a,
        expert_unassigned=expert_unassigned,
        assessment_a=asm_a,
        assessment_b=asm_b,
    )


@pytest.fixture()
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def auth_header(user: User) -> dict[str, str]:
    token = create_access_token(str(user.id), extra_claims={"role": user.role.value})
    return {"Authorization": f"Bearer {token}"}
