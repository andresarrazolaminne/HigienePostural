from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.orden_aseo import orden_aseo_from_raw
from app.core.processing_status import COMPLETED
from app.core.review_status import PENDING
from app.services.assessment_effective import (
    get_effective_primary_issue,
    get_effective_score,
    get_effective_vision_raw,
    is_expert_reviewed,
)
from app.services.storage_service import get_storage_service
from app.models.assessment import Assessment
from app.models.company import Company
from app.models.site import Site
from app.models.work_session import WorkSession
from app.schemas.assessment import AssessmentListItem
from app.schemas.site_report import (
    ActionItemRead,
    ErgonomicsReportSection,
    OrdenAseoReportSection,
    ScoreBucketRead,
    ScoreStatsRead,
    SessionSummaryRead,
    SiteReportPeriod,
    SiteReportRead,
    SiteReportSiteInfo,
    TopIssueRead,
)

ERGONOMIC_BUCKETS = [
    ("Óptimo (0–25)", 0, 25),
    ("Conforme (26–40)", 26, 40),
    ("Observación (41–55)", 41, 55),
    ("Alerta (56–70)", 56, 70),
    ("Crítico (71–100)", 71, 100),
]

ORDEN_BUCKETS = [
    ("Excelente (81–100)", 81, 100),
    ("Bueno (61–80)", 61, 80),
    ("Regular (41–60)", 41, 60),
    ("Deficiente (0–40)", 0, 40),
]

ORDEN_SEVERITY_FLAGS = (
    "desorden_superficie",
    "residuos_limpieza",
    "distractores_visuales",
    "cables_obstaculos",
    "iluminacion_entorno",
)

ERGONOMIC_FACTOR_KEYS = (
    ("lumbar_inadequate", "lumbar_support", ("none", "partial")),
    ("wrist_non_neutral", "wrist_deviation", ("flexion_extension", "ulnar_radial_deviation")),
    ("monitor_off_level", "monitor_height_vs_eyes", ("below_eye_level", "above_eye_level")),
    ("neck_flexion_noted", "neck_flexion_degrees", None),
)

CRITICAL_ERGO_THRESHOLD = 56
HIGH_ERGO_THRESHOLD = 70


def _score_stats(values: list[float]) -> ScoreStatsRead:
    if not values:
        return ScoreStatsRead(count=0, avg=None, min=None, max=None)
    return ScoreStatsRead(
        count=len(values),
        avg=float(statistics.mean(values)),
        min=float(min(values)),
        max=float(max(values)),
    )


def _bucket_counts(values: list[float], buckets: list[tuple[str, float, float]]) -> list[ScoreBucketRead]:
    out: list[ScoreBucketRead] = []
    for label, lo, hi in buckets:
        cnt = sum(1 for v in values if lo <= v <= hi)
        out.append(ScoreBucketRead(label=label, min_score=lo, max_score=hi, count=cnt))
    return out


def _ergonomic_factor_counts(raw_list: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for raw in raw_list:
        for key, field, bad_values in ERGONOMIC_FACTOR_KEYS:
            if bad_values is None:
                deg = raw.get("neck_flexion_degrees")
                if deg is not None:
                    try:
                        if float(deg) > 20:
                            counts[key] += 1
                    except (TypeError, ValueError):
                        pass
                continue
            val = raw.get(field)
            if isinstance(val, str) and val in bad_values:
                counts[key] += 1
    return dict(counts)


def _orden_severity_counts(raw_list: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for raw in raw_list:
        for flag in ORDEN_SEVERITY_FLAGS:
            sev = raw.get(flag)
            if sev in ("moderate", "severe"):
                counts[flag] += 1
    return dict(counts)


def _top_issues(
    items: list[tuple[str, float, datetime, int]],
    *,
    worst_higher_is_worse: bool,
    limit: int = 8,
) -> list[TopIssueRead]:
    grouped: dict[str, list[tuple[float, datetime, int]]] = defaultdict(list)
    for text, score, created_at, aid in items:
        key = text.strip() or "Sin descripción"
        grouped[key].append((score, created_at, aid))

    rows: list[TopIssueRead] = []
    for text, entries in grouped.items():
        if worst_higher_is_worse:
            worst = max(e[0] for e in entries)
        else:
            worst = min(e[0] for e in entries)
        last_at = max(e[1] for e in entries)
        ids = [e[2] for e in entries]
        rows.append(
            TopIssueRead(
                text=text,
                count=len(entries),
                worst_score=worst,
                last_at=last_at,
                assessment_ids=ids[:20],
            )
        )
    rows.sort(key=lambda r: (-r.count, -r.worst_score if worst_higher_is_worse else r.worst_score))
    return rows[:limit]


def _build_action_items(
    assessments: list[Assessment],
    raw_by_id: dict[int, dict[str, Any]],
) -> list[ActionItemRead]:
    items: list[ActionItemRead] = []
    priority = 1

    for a in sorted(assessments, key=lambda x: -(get_effective_score(x) or 0)):
        score = get_effective_score(a)
        issue = get_effective_primary_issue(a) or ""
        if score is not None and score >= HIGH_ERGO_THRESHOLD:
            items.append(
                ActionItemRead(
                    priority=priority,
                    title="Riesgo ergonómico crítico",
                    detail=f"Score {round(score)}/100 — {issue}",
                    assessment_id=a.id,
                )
            )
            priority += 1
            if priority > 12:
                break

    for a in assessments:
        score = get_effective_score(a)
        issue = get_effective_primary_issue(a) or ""
        if (
            score is not None
            and CRITICAL_ERGO_THRESHOLD <= score < HIGH_ERGO_THRESHOLD
            and priority <= 15
        ):
            if not any(x.assessment_id == a.id for x in items):
                items.append(
                    ActionItemRead(
                        priority=priority,
                        title="Riesgo ergonómico elevado",
                        detail=f"Score {round(score)}/100 — {issue}",
                        assessment_id=a.id,
                    )
                )
                priority += 1

    for a in assessments:
        raw = raw_by_id.get(a.id, {})
        for flag in ORDEN_SEVERITY_FLAGS:
            if raw.get(flag) == "severe" and priority <= 18:
                items.append(
                    ActionItemRead(
                        priority=priority,
                        title=f"Orden/aseo severo: {flag.replace('_', ' ')}",
                        detail=issue if (issue := get_effective_primary_issue(a)) else "—",
                        assessment_id=a.id,
                    )
                )
                priority += 1
                break

    for a in assessments:
        score = get_effective_score(a)
        if score is not None and score >= CRITICAL_ERGO_THRESHOLD and a.review_status == PENDING:
            if not any(x.assessment_id == a.id and "revisión" in x.title.lower() for x in items):
                issue = get_effective_primary_issue(a) or ""
                items.append(
                    ActionItemRead(
                        priority=priority,
                        title="Pendiente validación experta",
                        detail=f"Informe #{a.id} — {issue[:120]}",
                        assessment_id=a.id,
                    )
                )
                priority += 1
                if priority > 22:
                    break

    items.sort(key=lambda x: x.priority)
    return items[:20]


def _assessment_list_item(a: Assessment) -> AssessmentListItem:
    orden = orden_aseo_from_raw(get_effective_vision_raw(a))

    return AssessmentListItem(
        id=a.id,
        session_id=a.session_id,
        site_id=a.work_session.site_id if a.work_session else None,
        calculated_score=get_effective_score(a),
        primary_issue=get_effective_primary_issue(a),
        processing_status=a.processing_status,
        processing_error=a.processing_error,
        created_at=a.created_at,
        has_professional_notes=bool(a.professional_notes and a.professional_notes.strip()),
        image_url=get_storage_service().public_url(a.image_path),
        orden_aseo_score=orden["orden_aseo_score"],
        orden_aseo_issue=orden["orden_aseo_issue"],
        review_status=a.review_status,
        expert_reviewed=is_expert_reviewed(a),
    )


class SiteReportService:
    def build_report(self, db: Session, site_id: int) -> SiteReportRead:
        site = db.get(Site, site_id)
        if site is None:
            raise ValueError("Sede no encontrada")

        company = db.get(Company, site.company_id)
        company_name = company.name if company else "—"

        assessments = list(
            db.scalars(
                select(Assessment)
                .join(WorkSession, Assessment.session_id == WorkSession.id)
                .where(
                    WorkSession.site_id == site_id,
                    Assessment.processing_status == COMPLETED,
                )
                .options(joinedload(Assessment.work_session))
                .order_by(Assessment.created_at.desc())
            ).all()
        )

        sessions = list(
            db.scalars(
                select(WorkSession)
                .where(WorkSession.site_id == site_id)
                .order_by(WorkSession.start_time.desc())
            ).all()
        )

        raw_by_id: dict[int, dict[str, Any]] = {a.id: get_effective_vision_raw(a) for a in assessments}
        ergo_scores = [float(s) for a in assessments if (s := get_effective_score(a)) is not None]
        orden_scores: list[float] = []
        for a in assessments:
            o = orden_aseo_from_raw(get_effective_vision_raw(a))
            if o["orden_aseo_score"] is not None:
                orden_scores.append(float(o["orden_aseo_score"]))

        critical_pct = 0.0
        if ergo_scores:
            critical_pct = round(
                100.0 * sum(1 for s in ergo_scores if s >= CRITICAL_ERGO_THRESHOLD) / len(ergo_scores),
                1,
            )

        ergo_issues: list[tuple[str, float, datetime, int]] = []
        orden_issues: list[tuple[str, float, datetime, int]] = []
        for a in assessments:
            score = get_effective_score(a)
            issue = get_effective_primary_issue(a)
            if score is not None and issue:
                ergo_issues.append((issue, float(score), a.created_at, a.id))
            o = orden_aseo_from_raw(get_effective_vision_raw(a))
            issue = o.get("orden_aseo_issue") or ""
            score = o.get("orden_aseo_score")
            if issue and score is not None:
                orden_issues.append((str(issue), float(score), a.created_at, a.id))

        session_summaries: list[SessionSummaryRead] = []
        for ws in sessions:
            sess_asm = [a for a in assessments if a.session_id == ws.id]
            scores = [float(s) for a in sess_asm if (s := get_effective_score(a)) is not None]
            session_summaries.append(
                SessionSummaryRead(
                    id=ws.id,
                    start_time=ws.start_time,
                    end_time=ws.end_time,
                    photo_count=len(sess_asm),
                    avg_score=float(statistics.mean(scores)) if scores else ws.average_score,
                )
            )

        pending = sum(1 for a in assessments if a.review_status == PENDING)

        dates = [a.created_at for a in assessments]
        period = SiteReportPeriod(
            first_assessment_at=min(dates) if dates else None,
            last_assessment_at=max(dates) if dates else None,
        )

        recent = [_assessment_list_item(a) for a in assessments[:12]]

        return SiteReportRead(
            site=SiteReportSiteInfo(
                id=site.id,
                name=site.name,
                address=site.address,
                company_id=site.company_id,
                company_name=company_name,
            ),
            period=period,
            ergonomics=ErgonomicsReportSection(
                stats=_score_stats(ergo_scores),
                distribution=_bucket_counts(ergo_scores, ERGONOMIC_BUCKETS),
                critical_percent=critical_pct,
                factor_counts=_ergonomic_factor_counts(list(raw_by_id.values())),
            ),
            orden_aseo=OrdenAseoReportSection(
                stats=_score_stats(orden_scores),
                distribution=_bucket_counts(orden_scores, ORDEN_BUCKETS),
                severity_flag_counts=_orden_severity_counts(list(raw_by_id.values())),
            ),
            top_ergonomic_issues=_top_issues(ergo_issues, worst_higher_is_worse=True),
            top_orden_issues=_top_issues(orden_issues, worst_higher_is_worse=False),
            action_items=_build_action_items(assessments, raw_by_id),
            sessions_summary=session_summaries,
            recent_assessments=recent,
            pending_professional_review_count=pending,
            session_count=len(sessions),
            assessment_count=len(assessments),
        )
