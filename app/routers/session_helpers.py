from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.work_session import WorkSession
from app.schemas.session import WorkSessionRead


def session_stats(db: Session, session_id: int) -> tuple[int, float | None, float | None]:
    row = db.execute(
        select(
            func.count(Assessment.id),
            func.min(Assessment.calculated_score),
            func.max(Assessment.calculated_score),
        ).where(Assessment.session_id == session_id)
    ).one()
    cnt, mn, mx = int(row[0]), row[1], row[2]
    return (
        cnt,
        float(mn) if mn is not None else None,
        float(mx) if mx is not None else None,
    )


def work_session_to_read(db: Session, ws: WorkSession) -> WorkSessionRead:
    cnt, mn, mx = session_stats(db, ws.id)
    return WorkSessionRead(
        id=ws.id,
        user_id=ws.user_id,
        site_id=ws.site_id,
        start_time=ws.start_time,
        end_time=ws.end_time,
        average_score=ws.average_score,
        differential_score=ws.differential_score,
        assessment_count=cnt,
        min_score=mn,
        max_score=mx,
    )
