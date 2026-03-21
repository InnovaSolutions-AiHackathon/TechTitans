import time
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class UploadRecord:
    upload_id: str
    pdf_text: str
    created_at: float


class UploadStore:
    """
    In-memory upload store keyed by token -> upload_id -> UploadRecord.
    This is enough for a local prototype.
    """

    def __init__(self, ttl_seconds: int = 60 * 60) -> None:
        self._ttl_seconds = ttl_seconds
        self._data: Dict[str, Dict[str, UploadRecord]] = {}

    def set(self, token: str, upload: UploadRecord) -> None:
        self._data.setdefault(token, {})[upload.upload_id] = upload

    def get(self, token: str, upload_id: str) -> Optional[UploadRecord]:
        bucket = self._data.get(token) or {}
        rec = bucket.get(upload_id)
        if not rec:
            return None
        if time.time() - rec.created_at > self._ttl_seconds:
            # Expire lazily
            del bucket[upload_id]
            return None
        return rec

