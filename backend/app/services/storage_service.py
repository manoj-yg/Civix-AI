import os
import uuid
from pathlib import Path
from typing import Tuple, Optional
from fastapi import UploadFile
from app.core.config import settings
from app.core.exceptions import ValidationException

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 # 50 MB

class StorageService:
    def upload_file(self, file_contents: bytes, original_filename: str, content_type: str) -> Tuple[str, str, int]:
        """
        Validates and uploads file.
        Returns: (file_path_or_url, file_type, file_size)
        """
        raise NotImplementedError

    def get_download_url(self, file_path: str) -> str:
        raise NotImplementedError

    def delete_file(self, file_path: str) -> bool:
        raise NotImplementedError

class LocalStorageService(StorageService):
    def __init__(self, storage_dir: Optional[str] = None):
        self.storage_dir = Path(storage_dir or settings.STORAGE_DIR)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def validate_file(self, filename: str, content_type: str, file_size: int) -> str:
        if file_size > MAX_FILE_SIZE_BYTES:
            raise ValidationException(f"File size {file_size} bytes exceeds maximum limit of {MAX_FILE_SIZE_BYTES} bytes.")
        
        ext = Path(filename).suffix.lower()
        if ext in ALLOWED_IMAGE_EXTENSIONS:
            return "image"
        elif ext in ALLOWED_VIDEO_EXTENSIONS:
            return "video"
        else:
            raise ValidationException(f"File extension '{ext}' is not supported. Allowed: {ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS}")

    def upload_file(self, file_contents: bytes, original_filename: str, content_type: str) -> Tuple[str, str, int]:
        file_size = len(file_contents)
        file_type = self.validate_file(original_filename, content_type, file_size)

        ext = Path(original_filename).suffix.lower()
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        destination = self.storage_dir / safe_filename

        with open(destination, "wb") as f:
            f.write(file_contents)

        return str(destination), file_type, file_size

    def get_download_url(self, file_path: str) -> str:
        filename = Path(file_path).name
        return f"/api/v1/inspections/media/file/{filename}"

    def delete_file(self, file_path: str) -> bool:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            return True
        return False

def get_storage_service() -> StorageService:
    return LocalStorageService()
