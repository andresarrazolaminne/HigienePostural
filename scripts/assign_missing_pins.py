"""Asigna una clave de ingreso (PIN) a los usuarios que aún no tienen una.

Útil tras aplicar la migración `a1c7e5d2f9b0` en una base existente.
Ejecutar desde la raíz:
  .\\.venv\\Scripts\\python scripts\\assign_missing_pins.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import select  # noqa: E402

from app.core.security import generate_pin  # noqa: E402
from app.db.database import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


def _unique_pin(db) -> str:
    for _ in range(100):
        pin = generate_pin(6)
        if not db.scalars(select(User).where(User.access_pin == pin)).first():
            return pin
    raise RuntimeError("No se pudo generar una clave única")


def main() -> None:
    db = SessionLocal()
    try:
        users = db.scalars(select(User).where(User.access_pin.is_(None))).all()
        if not users:
            print("Todos los usuarios ya tienen clave de ingreso.")
            return
        print(f"Asignando clave a {len(users)} usuario(s):")
        for u in users:
            u.access_pin = _unique_pin(db)
            db.flush()
            print(f"  {u.email}: {u.access_pin}")
        db.commit()
        print("Listo.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
