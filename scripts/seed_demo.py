"""
Crea datos de demostración:
- Empresa "Administración general"
- Usuario admin@admin.co / admin123 (super_admin)

Ejecutar desde la raíz del proyecto:
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
from app.models.user import User, UserRole  # noqa: E402


def main() -> None:
    db = SessionLocal()
    try:
        company = db.scalars(select(Company).where(Company.name == "Administración general")).first()
        if company is None:
            company = Company(name="Administración general")
            db.add(company)
            db.commit()
            db.refresh(company)
            print(f"Empresa creada: id={company.id}")

        email = "admin@admin.co"
        user = db.scalars(select(User).where(User.email == email)).first()
        if user:
            user.hashed_password = get_password_hash("admin123")
            user.role = UserRole.super_admin
            user.company_id = None
            db.commit()
            print(f"Usuario actualizado: {email}")
        else:
            user = User(
                name="Administrador",
                email=email,
                hashed_password=get_password_hash("admin123"),
                role=UserRole.super_admin,
                company_id=None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Usuario creado: {email} (super_admin)")

        print("Listo. Inicia sesión en la app con admin@admin.co / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
