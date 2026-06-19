"""Convierte fotos de móvil (JPEG/PNG/WebP/HEIC) a JPEG optimizado para IA y S3."""

from __future__ import annotations

import io

from PIL import Image, ImageOps, UnidentifiedImageError

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

_MAX_SIDE = 1920
_JPEG_QUALITY = 85


def normalize_upload_image(data: bytes, *, max_side: int = _MAX_SIDE) -> tuple[bytes, str]:
    """
    Devuelve (bytes JPEG, 'image/jpeg').
    Corrige orientación EXIF y reduce tamaño para evitar timeouts/OOM en el servidor.
    """
    if not data:
        raise ValueError("Archivo vacío")

    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)
    except UnidentifiedImageError as e:
        raise ValueError(
            "Formato de imagen no reconocido. Usa JPEG, PNG o toma la foto desde la app "
            "(en iPhone: Ajustes > Cámara > Formatos > Más compatible)."
        ) from e

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    w, h = img.size
    longest = max(w, h)
    if longest > max_side:
        scale = max_side / longest
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
    return out.getvalue(), "image/jpeg"
