import secrets
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class AuthSettings:
    username: str
    password: str


class AuthService:
    """
    Simple in-memory auth.
    This is intended for local use only (not for production).
    """

    def __init__(self, settings: AuthSettings) -> None:
        self._settings = settings
        self._tokens: Dict[str, str] = {}  # token -> username

    def login(self, username: str, password: str) -> Optional[str]:
        if username != self._settings.username or password != self._settings.password:
            return None
        token = secrets.token_urlsafe(24)
        self._tokens[token] = username
        return token

    def verify(self, token: str) -> bool:
        return token in self._tokens

