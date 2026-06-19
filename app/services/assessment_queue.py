"""Cola en proceso para análisis de evidencias (visión + persistencia)."""

from __future__ import annotations

import logging
import queue
import threading
from datetime import datetime, timezone

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)

from app.core.processing_status import COMPLETED, FAILED, PROCESSING, QUEUED
from app.db.database import SessionLocal
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.assessment import Assessment
from app.services.analytical_agent_service import AnalyticalAgentService
from app.services.storage_service import StorageError, get_storage_service
from app.services.vision_agent_service import VisionAgentService

logger = logging.getLogger(__name__)

_task_queue: queue.Queue[int] = queue.Queue()
_worker_started = False
_worker_lock = threading.Lock()


def queue_depth() -> int:
    return _task_queue.qsize()


def enqueue_assessment(assessment_id: int) -> None:
    _ensure_worker()
    _task_queue.put(assessment_id)
    logger.info("Evidencia #%s encolada para análisis", assessment_id)


def _ensure_worker() -> None:
    global _worker_started
    with _worker_lock:
        if _worker_started:
            return
        t = threading.Thread(target=_worker_loop, name="assessment-queue", daemon=True)
        t.start()
        _worker_started = True
        logger.info("Worker de cola de assessments iniciado")


def _worker_loop() -> None:
    while True:
        assessment_id = _task_queue.get()
        try:
            _process_assessment(assessment_id)
        except Exception:
            logger.exception("Error inesperado procesando assessment #%s", assessment_id)
        finally:
            _task_queue.task_done()


def _process_assessment(assessment_id: int) -> None:
    db = SessionLocal()
    try:
        assessment = db.scalars(
            select(Assessment)
            .where(Assessment.id == assessment_id)
            .options(joinedload(Assessment.work_session))
        ).first()
        if assessment is None:
            logger.warning("Assessment #%s no encontrado", assessment_id)
            return
        if assessment.processing_status not in (QUEUED, PROCESSING):
            return

        assessment.processing_status = PROCESSING
        assessment.processing_error = None
        db.commit()

        ws = assessment.work_session
        if ws is None:
            _mark_failed(db, assessment, "Sesión no encontrada")
            return

        storage = get_storage_service()
        try:
            raw, content_type = storage.read_assessment_image(assessment.image_path)
        except StorageError as e:
            _mark_failed(db, assessment, str(e))
            return

        vision_svc = VisionAgentService()
        analytical = AnalyticalAgentService()
        try:
            vision = vision_svc.analyze_image(raw, content_type)
            analytical.finalize_assessment(db, assessment_id=assessment_id, vision=vision)
            logger.info("Assessment #%s completado", assessment_id)
        except AuthenticationError as e:
            _mark_failed(db, assessment, "Clave OpenAI inválida o rechazada.")
            logger.warning("OpenAI auth failed for #%s: %s", assessment_id, e)
        except RateLimitError:
            _mark_failed(db, assessment, "Límite de OpenAI. Reintenta más tarde.")
        except (APIConnectionError, APITimeoutError) as e:
            _mark_failed(db, assessment, f"Sin conexión con OpenAI: {e}")
        except BadRequestError as e:
            _mark_failed(db, assessment, f"Solicitud rechazada por OpenAI: {e}")
        except APIStatusError as e:
            _mark_failed(db, assessment, f"Error OpenAI ({getattr(e, 'status_code', '?')})")
        except (RuntimeError, ValueError) as e:
            _mark_failed(db, assessment, str(e))
        except Exception as e:
            _mark_failed(db, assessment, "Error al analizar la imagen.")
            logger.exception("Fallo procesando assessment #%s", assessment_id)
    finally:
        db.close()


def _mark_failed(db, assessment: Assessment, message: str) -> None:
    assessment.processing_status = FAILED
    assessment.processing_error = message[:2000] if message else "Error desconocido"
    assessment.processed_at = datetime.now(timezone.utc)
    db.commit()
    logger.warning("Assessment #%s falló: %s", assessment.id, message)


def recover_stuck_queued_on_startup() -> None:
    """Re-encola trabajos queued/processing tras reinicio del servidor."""
    db = SessionLocal()
    try:
        from sqlalchemy import select

        rows = db.scalars(
            select(Assessment.id).where(Assessment.processing_status.in_([QUEUED, PROCESSING]))
        ).all()
        for aid in rows:
            a = db.get(Assessment, aid)
            if a is None:
                continue
            if a.processing_status == PROCESSING:
                a.processing_status = QUEUED
            db.commit()
            enqueue_assessment(aid)
        if rows:
            logger.info("Re-encolados %d assessments pendientes", len(rows))
    finally:
        db.close()
