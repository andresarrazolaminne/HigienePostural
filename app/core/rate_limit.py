"""Limitador de intentos en memoria (sliding window) por clave (ej. IP).

Pensado para mitigar fuerza bruta del login por clave de ingreso (PIN).
Suficiente para un despliegue de un solo proceso/contenedor; si se escala a
varias instancias habría que usar un almacén compartido (Redis).
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque


class SlidingWindowRateLimiter:
    def __init__(self, max_attempts: int, window_seconds: float) -> None:
        self._max = max_attempts
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Registra un intento y devuelve False si se excede el límite."""
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            cutoff = now - self._window
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= self._max:
                return False
            q.append(now)
            return True


# Login por clave de ingreso: máx. 8 intentos por minuto y por IP.
login_code_limiter = SlidingWindowRateLimiter(max_attempts=8, window_seconds=60.0)
