import base64
import logging
import os

from openai import OpenAI

from app.core.config import get_settings
from app.schemas.vision import VisionAnalysisResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un ergonomista experto. Analiza fotografías de puestos de trabajo de oficina o similares.

Debes evaluar la imagen estrictamente siguiendo los marcos metodológicos:
- **RULA (Rapid Upper Limb Assessment)**: postura de cuello, tronco, hombros, brazos, muñecas y carga repetitiva visible en la imagen.
- **ROSA (Rapid Office Strain Assessment)**: silla, respaldo y soporte lumbar, altura y distancia del monitor, teclado y ratón cuando sean visibles.

Métricas obligatorias a estimar cuando la evidencia visual lo permita:
1. Flexión del cuello en grados (aproximación razonable alineada con RULA).
2. Soporte lumbar (ninguno / parcial / adecuado).
3. Desviación de muñecas respecto a postura neutra.
4. Altura del monitor respecto a la línea de vista de los ojos.

Reglas:
- No inventes detalles no visibles. Usa `not_observable` en campos categóricos o `null` en numéricos cuando corresponda.
- `rula_grand_score` solo si puedes justificarlo con lo visible (1-7). Si no, `null`.
- `rosa_summary_score` es un resumen interno simplificado 1-10; `null` si no hay suficiente información.
- `overall_risk_score` (0-100) debe ser coherente con la severidad global observada.
- `primary_issue` debe ser una frase breve del problema más relevante.
- **Idioma**: todo texto en lenguaje natural visible para el usuario (`primary_issue` y cualquier explicación breve)
  debe estar en **español** claro y profesional (no inglés).
"""


class VisionAgentService:
    def analyze_image(self, image_bytes: bytes, mime_type: str) -> VisionAnalysisResult:
        settings = get_settings()
        api_key = (settings.openai_api_key or os.getenv("OPENAI_API_KEY", "")).strip()
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY no configurada")

        client = OpenAI(api_key=api_key)

        b64 = base64.standard_b64encode(image_bytes).decode("ascii")
        if not mime_type.startswith("image/"):
            mime_type = "image/jpeg"
        data_url = f"data:{mime_type};base64,{b64}"

        try:
            completion = client.chat.completions.parse(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Evalúa el puesto de trabajo en esta imagen con RULA y ROSA y devuelve el JSON estructurado. "
                                    "El campo primary_issue y cualquier descripción breve deben estar en español."
                                ),
                            },
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    },
                ],
                response_format=VisionAnalysisResult,
            )
        except Exception:
            logger.exception("Fallo al llamar a OpenAI")
            raise

        msg = completion.choices[0].message
        parsed = msg.parsed
        if parsed is None:
            refusal = getattr(msg, "refusal", None)
            if refusal:
                raise RuntimeError(f"El modelo rechazó la evaluación: {refusal}")
            raw = (msg.content or "").strip()
            hint = raw[:400] + ("…" if len(raw) > 400 else "")
            raise RuntimeError(
                "La API no devolvió JSON estructurado válido para el esquema. "
                f"Detalle: {hint or '(sin contenido de texto)'}"
            )
        return parsed
