"""Extracción de campos Orden y Aseo desde raw_ai_json (compatibilidad hacia atrás)."""

from __future__ import annotations

from typing import Any


def orden_aseo_from_raw(raw: dict[str, Any] | None) -> dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return {
            "orden_aseo_score": None,
            "orden_aseo_issue": None,
            "orden_aseo_observations": [],
        }
    score = raw.get("orden_aseo_score")
    if score is not None:
        try:
            score = float(score)
        except (TypeError, ValueError):
            score = None
    issue = raw.get("orden_aseo_issue")
    if issue is not None and not isinstance(issue, str):
        issue = str(issue)
    obs = raw.get("orden_aseo_observations")
    if not isinstance(obs, list):
        obs = []
    else:
        obs = [str(x) for x in obs if x is not None and str(x).strip()][:6]
    return {
        "orden_aseo_score": score,
        "orden_aseo_issue": issue,
        "orden_aseo_observations": obs,
    }
