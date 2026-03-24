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
        # username -> password (local dev only; plaintext on purpose)
        self._users: Dict[str, str] = {self._norm_username(settings.username): settings.password}
        self._tokens: Dict[str, str] = {}  # token -> username

    def _norm_username(self, username: str) -> str:
        # Normalize for consistency across signup/login.
        return (username or "").strip().lower()

    def login(self, username: str, password: str) -> Optional[str]:
        username_n = self._norm_username(username)
        password = password or ""
        stored = self._users.get(username_n)
        if stored is None or stored != password:
            return None
        token = secrets.token_urlsafe(24)
        self._tokens[token] = username_n
        return token

    def signup(self, username: str, password: str) -> Optional[str]:
        username_n = self._norm_username(username)
        password = password or ""
        if not username_n or not password:
            return None
        if username_n in self._users:
            return None

        self._users[username_n] = password
        token = secrets.token_urlsafe(24)
        self._tokens[token] = username_n
        return token

    def verify(self, token: str) -> bool:
        return token in self._tokens

