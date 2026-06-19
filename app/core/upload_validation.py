"""Validación de archivos subidos (tipo real, no solo Content-Type)."""

_JPEG_SIG = (b"\xff\xd8\xff",)
_PNG_SIG = (b"\x89PNG\r\n\x1a\n",)


def image_media_type(data: bytes) -> str | None:
    """Devuelve image/jpeg o image/png si los magic bytes coinciden."""
    if len(data) < 8:
        return None
    if any(data.startswith(sig) for sig in _JPEG_SIG):
        return "image/jpeg"
    if data.startswith(_PNG_SIG):
        return "image/png"
    return None
