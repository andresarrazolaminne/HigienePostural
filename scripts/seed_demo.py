"""
Datos de demostración con los 3 perfiles de usuario.

Ejecutar desde la raíz:
  .\\.venv\\Scripts\\python scripts\\seed_demo.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import select  # noqa: E402

from app.core.security import get_password_hash  # noqa: E402
from app.db.database import SessionLocal  # noqa: E402
from app.models.company import Company  # noqa: E402
from app.models.site import Site  # noqa: E402
from app.models.expert_assignment import ExpertCompanyAssignment  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


def _upsert_user(
    db,
    *,
    email: str,
    name: str,
    password: str,
    role: UserRole,
    company_id: int | None,
    access_pin: str | None = None,
) -> None:
    user = db.scalars(select(User).where(User.email == email)).first()
    hashed = get_password_hash(password)
    if user:
        user.name = name
        user.hashed_password = hashed
        user.role = role
        user.company_id = company_id
        if access_pin:
            user.access_pin = access_pin
        print(f"  Actualizado: {email} ({role.value})")
    else:
        db.add(
            User(
                name=name,
                email=email,
                hashed_password=hashed,
                role=role,
                company_id=company_id,
                access_pin=access_pin,
            )
        )
        print(f"  Creado: {email} ({role.value})")


def main() -> None:
    db = SessionLocal()
    try:
        company = db.scalars(select(Company).where(Company.name == "Demo HSEQ")).first()
        if company is None:
            company = Company(name="Demo HSEQ")
            db.add(company)
            db.commit()
            db.refresh(company)
            print(f"Empresa creada: {company.name} (id={company.id})")

        site = db.scalars(select(Site).where(Site.company_id == company.id, Site.name == "Sede central")).first()
        if site is None:
            site = Site(company_id=company.id, name="Sede central", address="Planta baja, oficinas")
            db.add(site)
            db.commit()
            print(f"Sede creada: {site.name}")

        print("Usuarios demo:")
        _upsert_user(
            db,
            email="admin@admin.co",
            name="Super Admin",
            password="admin123",
            role=UserRole.super_admin,
            company_id=None,
            access_pin="999999",
        )
        _upsert_user(
            db,
            email="empresa@demo.co",
            name="Admin Empresa",
            password="empresa123",
            role=UserRole.company_admin,
            company_id=company.id,
            access_pin="222222",
        )
        _upsert_user(
            db,
            email="inspector@demo.co",
            name="Inspector Demo",
            password="inspector123",
            role=UserRole.user,
            company_id=company.id,
            access_pin="111111",
        )
        _upsert_user(
            db,
            email="experto@demo.co",
            name="Experto Ergonómico",
            password="experto123",
            role=UserRole.expert,
            company_id=None,
            access_pin="333333",
        )
        db.commit()
        expert = db.scalars(select(User).where(User.email == "experto@demo.co")).first()
        if expert:
            existing = db.scalars(
                select(ExpertCompanyAssignment).where(
                    ExpertCompanyAssignment.user_id == expert.id,
                    ExpertCompanyAssignment.company_id == company.id,
                )
            ).first()
            if not existing:
                db.add(ExpertCompanyAssignment(user_id=expert.id, company_id=company.id))
                db.commit()
        print("\nListo. Cuentas de prueba (correo/contraseña · clave de ingreso):")
        print("  Super admin:     admin@admin.co / admin123 · PIN 999999")
        print("  Admin empresa:   empresa@demo.co / empresa123 · PIN 222222")
        print("  Inspector:       inspector@demo.co / inspector123 · PIN 111111")
        print("  Experto:         experto@demo.co / experto123 · PIN 333333")
    finally:
        db.close()


if __name__ == "__main__":
    main()
