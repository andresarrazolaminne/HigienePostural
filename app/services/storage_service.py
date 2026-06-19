"""Almacenamiento de imágenes: disco local o S3."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)


class StorageError(RuntimeError):
    """Fallo al guardar o borrar en el backend de almacenamiento."""


class StorageService(ABC):
    @abstractmethod
    def save_assessment_image(
        self,
        *,
        user_id: int,
        session_id: int,
        raw: bytes,
        ext: str,
        content_type: str,
    ) -> str:
        """Devuelve identificador persistido (ruta local o clave S3)."""

    @abstractmethod
    def delete_image(self, image_path: str) -> None:
        pass

    @abstractmethod
    def public_url(self, image_path: str) -> str | None:
        """URL publica directa, o None si se sirve por la API."""

    @abstractmethod
    def is_remote_public(self, image_path: str) -> bool:
        pass

    @abstractmethod
    def read_assessment_image(self, image_path: str) -> tuple[bytes, str]:
        """Lee bytes de la imagen y devuelve (contenido, content_type)."""

    @abstractmethod
    def save_branding_logo(self, *, raw: bytes, ext: str, content_type: str) -> str:
        """Guarda el logo de la app y devuelve identificador persistido."""

    @abstractmethod
    def read_branding_logo(self, logo_path: str) -> tuple[bytes, str]:
        """Lee el logo de marca almacenado."""


class LocalStorageService(StorageService):
    def __init__(self, upload_dir: str) -> None:
        self._root = Path(upload_dir).resolve()

    def save_assessment_image(
        self,
        *,
        user_id: int,
        session_id: int,
        raw: bytes,
        ext: str,
        content_type: str,
    ) -> str:
        del content_type
        dest_dir = self._root / str(user_id) / str(session_id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        import uuid

        fname = f"{uuid.uuid4().hex}{ext}"
        dest_path = dest_dir / fname
        dest_path.write_bytes(raw)
        return str(dest_path.as_posix())

    def delete_image(self, image_path: str) -> None:
        raw = Path(image_path)
        candidate = raw.resolve() if raw.is_absolute() else (Path.cwd() / raw).resolve()
        try:
            candidate.relative_to(self._root)
        except ValueError:
            return
        if candidate.is_file():
            candidate.unlink(missing_ok=True)

    def public_url(self, image_path: str) -> str | None:
        return None

    def is_remote_public(self, image_path: str) -> bool:
        return False

    def read_assessment_image(self, image_path: str) -> tuple[bytes, str]:
        raw = Path(image_path)
        candidate = raw.resolve() if raw.is_absolute() else (Path.cwd() / raw).resolve()
        try:
            candidate.relative_to(self._root)
        except ValueError as e:
            raise StorageError("Ruta de imagen no válida") from e
        if not candidate.is_file():
            raise StorageError("Archivo de imagen no encontrado")
        suffix = candidate.suffix.lower()
        content_type = "image/png" if suffix == ".png" else "image/jpeg"
        return candidate.read_bytes(), content_type

    def save_branding_logo(self, *, raw: bytes, ext: str, content_type: str) -> str:
        del content_type
        dest_dir = self._root / "branding"
        dest_dir.mkdir(parents=True, exist_ok=True)
        for old in dest_dir.glob("logo.*"):
            old.unlink(missing_ok=True)
        dest_path = dest_dir / f"logo{ext}"
        dest_path.write_bytes(raw)
        return str(dest_path.as_posix())

    def read_branding_logo(self, logo_path: str) -> tuple[bytes, str]:
        raw = Path(logo_path)
        candidate = raw.resolve() if raw.is_absolute() else (Path.cwd() / raw).resolve()
        try:
            candidate.relative_to(self._root)
        except ValueError as e:
            raise StorageError("Ruta de logo no válida") from e
        if not candidate.is_file():
            raise StorageError("Logo no encontrado")
        suffix = candidate.suffix.lower()
        content_type = "image/png" if suffix == ".png" else "image/jpeg"
        return candidate.read_bytes(), content_type


class S3StorageService(StorageService):
    def __init__(self, settings: Settings) -> None:
        import boto3

        self._bucket = settings.s3_bucket
        self._prefix = settings.s3_prefix.strip("/")
        self._public_base = settings.s3_public_base_url.rstrip("/")
        self._url_expiry = max(60, int(getattr(settings, "s3_url_expiry_seconds", 3600)))
        self._client = boto3.client("s3", region_name=settings.aws_region)

    def _object_key(self, user_id: int, session_id: int, ext: str) -> str:
        import uuid

        return f"{self._prefix}/{user_id}/{session_id}/{uuid.uuid4().hex}{ext}"

    def save_assessment_image(
        self,
        *,
        user_id: int,
        session_id: int,
        raw: bytes,
        ext: str,
        content_type: str,
    ) -> str:
        from botocore.exceptions import BotoCoreError, ClientError

        key = self._object_key(user_id, session_id, ext)
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=raw,
                ContentType=content_type,
            )
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            logger.exception("S3 put_object fallo bucket=%s key=%s code=%s", self._bucket, key, code)
            if code in ("AccessDenied", "403"):
                raise StorageError(
                    "Sin permiso para subir a S3. Revisa IAM (s3:PutObject y s3:GetObject en OYA-APP/*) "
                    "y credenciales en Lightsail."
                ) from e
            if code in ("NoSuchBucket", "404"):
                raise StorageError(f"Bucket S3 no encontrado: {self._bucket}") from e
            raise StorageError(f"No se pudo guardar la imagen en S3 ({code or 'error'}).") from e
        except BotoCoreError as e:
            logger.exception("S3 error de red/credenciales bucket=%s", self._bucket)
            raise StorageError(
                "No se pudo conectar a S3. Revisa AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y AWS_REGION en el servidor."
            ) from e
        logger.info("Imagen guardada en s3://%s/%s (%d bytes)", self._bucket, key, len(raw))
        return key

    def verify_access(self) -> None:
        """Comprueba credenciales y permisos de escritura (arranque)."""
        from botocore.exceptions import BotoCoreError, ClientError

        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            raise StorageError(f"S3 head_bucket fallo ({code}): {self._bucket}") from e
        except BotoCoreError as e:
            raise StorageError("S3 no accesible (credenciales o red).") from e

    def delete_image(self, image_path: str) -> None:
        key = self._normalize_key(image_path)
        if not key:
            return
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
        except Exception:
            logger.exception("No se pudo borrar objeto S3: %s", key)

    def public_url(self, image_path: str) -> str | None:
        key = self._normalize_key(image_path)
        if not key:
            return None
        # URL prefirmada: permite leer el objeto privado sin exponer el bucket.
        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=self._url_expiry,
            )
        except Exception:
            logger.exception("No se pudo generar URL prefirmada S3 key=%s", key)
            if self._public_base:
                return f"{self._public_base}/{key}"
            return None

    def is_remote_public(self, image_path: str) -> bool:
        return bool(self._normalize_key(image_path))

    def read_assessment_image(self, image_path: str) -> tuple[bytes, str]:
        from botocore.exceptions import BotoCoreError, ClientError

        key = self._normalize_key(image_path)
        if not key:
            raise StorageError("Clave S3 no válida")
        try:
            resp = self._client.get_object(Bucket=self._bucket, Key=key)
            body = resp["Body"].read()
            content_type = resp.get("ContentType") or "image/jpeg"
            return body, content_type
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            raise StorageError(f"No se pudo leer imagen de S3 ({code})") from e
        except BotoCoreError as e:
            raise StorageError("Error de red al leer S3") from e

    def save_branding_logo(self, *, raw: bytes, ext: str, content_type: str) -> str:
        from botocore.exceptions import BotoCoreError, ClientError

        key = f"{self._prefix}/branding/logo{ext}"
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=raw,
                ContentType=content_type,
                CacheControl="public, max-age=300",
            )
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            raise StorageError(f"No se pudo guardar el logo en S3 ({code or 'error'}).") from e
        except BotoCoreError as e:
            raise StorageError("No se pudo conectar a S3 para guardar el logo.") from e
        return key

    def read_branding_logo(self, logo_path: str) -> tuple[bytes, str]:
        key = self._normalize_key(logo_path)
        if not key:
            raise StorageError("Clave de logo no válida")
        return self.read_assessment_image(key)

    def _normalize_key(self, image_path: str) -> str | None:
        if not image_path:
            return None
        if image_path.startswith("http://") or image_path.startswith("https://"):
            prefix = f"{self._public_base}/"
            if image_path.startswith(prefix):
                return image_path[len(prefix) :]
            return None
        key = image_path.lstrip("/")
        if self._prefix and not key.startswith(f"{self._prefix}/"):
            if "/" in key:
                return key
            return f"{self._prefix}/{key}"
        return key


@lru_cache
def get_storage_service() -> StorageService:
    from app.core.config import get_settings

    settings = get_settings()
    if settings.storage_backend == "s3":
        if not settings.s3_bucket or not settings.s3_public_base_url:
            raise RuntimeError(
                "STORAGE_BACKEND=s3 requiere S3_BUCKET y S3_PUBLIC_BASE_URL en el entorno."
            )
        return S3StorageService(settings)
    return LocalStorageService(settings.upload_dir)
