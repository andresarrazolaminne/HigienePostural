from typing import Literal

from pydantic import BaseModel, Field, field_validator


class VisionAnalysisResult(BaseModel):
    """
    Salida estructurada del Vision Agent (RULA + ROSA).
    Valores no observables deben usar literales *_not_observable.
    """

    neck_flexion_degrees: float | None = Field(
        None,
        description="Flexión del cuello en grados (aprox.) según criterios RULA; null si no observable.",
    )
    lumbar_support: Literal[
        "none",
        "partial",
        "adequate",
        "not_observable",
    ] = Field(description="Soporte lumbar percibido (ROSA/silla).")
    wrist_deviation: Literal[
        "neutral",
        "flexion_extension",
        "ulnar_radial_deviation",
        "not_observable",
    ] = Field(description="Desviación de muñecas (RULA / uso teclado-ratón).")
    monitor_height_vs_eyes: Literal[
        "below_eye_level",
        "at_eye_level",
        "above_eye_level",
        "not_observable",
    ] = Field(description="Altura del monitor respecto a los ojos (ROSA pantalla).")
    # Nota: no usar ge/le en campos opcionales: el JSON Schema para structured outputs
    # de OpenAI puede fallar con null + minimum/maximum a la vez.
    rula_grand_score: int | None = Field(
        None,
        description="Puntuación final RULA (1-7) si es posible estimarla; null si no aplica/no observable.",
    )
    rosa_summary_score: int | None = Field(
        None,
        description="Resumen simplificado ROSA (1-10); null si no observable.",
    )
    overall_risk_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Riesgo ergonómico global 0-100 derivado de RULA/ROSA.",
    )
    primary_issue: str = Field(
        ...,
        max_length=512,
        description="Problema principal en lenguaje natural breve.",
    )
    observation_confidence: Literal["low", "medium", "high"] = Field(
        default="medium",
        description="Confianza en la observación dada la imagen.",
    )

    @field_validator("rula_grand_score")
    @classmethod
    def _rula_range(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 1 or v > 7:
            raise ValueError("rula_grand_score debe estar entre 1 y 7")
        return v

    @field_validator("rosa_summary_score")
    @classmethod
    def _rosa_range(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 1 or v > 10:
            raise ValueError("rosa_summary_score debe estar entre 1 y 10")
        return v
