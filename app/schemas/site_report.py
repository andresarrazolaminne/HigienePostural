from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.assessment import AssessmentListItem


class SiteReportSiteInfo(BaseModel):
    id: int
    name: str
    address: str | None
    company_id: int
    company_name: str


class SiteReportPeriod(BaseModel):
    first_assessment_at: datetime | None
    last_assessment_at: datetime | None


class ScoreStatsRead(BaseModel):
    count: int
    avg: float | None
    min: float | None
    max: float | None


class ScoreBucketRead(BaseModel):
    label: str
    min_score: float
    max_score: float
    count: int


class ErgonomicsReportSection(BaseModel):
    stats: ScoreStatsRead
    distribution: list[ScoreBucketRead]
    critical_percent: float = Field(description="% de fotos con score ergonómico >= 56 (alerta/crítico)")
    factor_counts: dict[str, int] = Field(
        default_factory=dict,
        description="Conteo de evaluaciones con hallazgo en cada factor ergonómico",
    )


class OrdenAseoReportSection(BaseModel):
    stats: ScoreStatsRead
    distribution: list[ScoreBucketRead]
    severity_flag_counts: dict[str, int] = Field(
        default_factory=dict,
        description="Conteo de fotos con severidad moderate o severe por flag",
    )


class TopIssueRead(BaseModel):
    text: str
    count: int
    worst_score: float
    last_at: datetime
    assessment_ids: list[int]


class ActionItemRead(BaseModel):
    priority: int
    title: str
    detail: str
    assessment_id: int | None = None


class SessionSummaryRead(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime | None
    photo_count: int
    avg_score: float | None


class SiteReportRead(BaseModel):
    site: SiteReportSiteInfo
    period: SiteReportPeriod
    ergonomics: ErgonomicsReportSection
    orden_aseo: OrdenAseoReportSection
    top_ergonomic_issues: list[TopIssueRead]
    top_orden_issues: list[TopIssueRead]
    action_items: list[ActionItemRead]
    sessions_summary: list[SessionSummaryRead]
    recent_assessments: list[AssessmentListItem]
    pending_professional_review_count: int
    session_count: int
    assessment_count: int
