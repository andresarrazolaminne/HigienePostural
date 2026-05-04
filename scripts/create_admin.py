"""
Crea el primer usuario super_admin en la base de datos (bootstrap).
Ejemplo:
  python scripts/create_admin.py --email admin@empresa.com --password "TuPasswordSeguro" --name "Admin SST"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select  # noqa: E402

from app.core.security import get_password_hash  # noqa: E402
from app.db.database import SessionLocal  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Crear usuario super_admin inicial")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Super Admin")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        existing = db.scalars(select(User).where(User.email == args.email)).first()
        if existing:
            print("El usuario ya existe.")
            raise SystemExit(1)
        admin = User(
            name=args.name,
            email=args.email,
            hashed_password=get_password_hash(args.password),
            role=UserRole.super_admin,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Super admin creado: id={admin.id} email={admin.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
