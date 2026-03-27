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
        # Local-only in-memory user store. Seed with default credentials.
        self._users: Dict[str, str] = {settings.username: settings.password}

    def login(self, username: str, password: str) -> Optional[str]:
        stored = self._users.get(username)
        if stored is None or stored != password:
            return None
        token = secrets.token_urlsafe(24)
        self._tokens[token] = username
        return token

    def signup(self, username: str, password: str) -> bool:
        u = (username or "").strip()
        p = (password or "").strip()
        if not u or not p:
            return False
        if u in self._users:
            return False
        self._users[u] = p
        return True

    def verify(self, token: str) -> bool:
        return token in self._tokens

