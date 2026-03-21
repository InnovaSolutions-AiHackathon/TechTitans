"""
FinAI-Copilot domain models.
These mirror the requested schema and can be used with SQLModel/Alembic.
"""

from __future__ import annotations

from typing import Optional

try:
    from sqlmodel import Field, SQLModel
except Exception:  # pragma: no cover
    # Lightweight fallback so imports don't break if sqlmodel isn't installed yet.
    class SQLModel:  # type: ignore
        pass

    def Field(default=None, **kwargs):  # type: ignore
        return default


class Company(SQLModel, table=True):  # type: ignore[call-arg]
    id: Optional[int] = Field(default=None, primary_key=True)
    ticker: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    exchange: Optional[str] = None


class Filing(SQLModel, table=True):  # type: ignore[call-arg]
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int
    period: Optional[str] = None
    type: str  # 10K | 10Q | 8K | PR | Transcript | Deck | ESG
    filed_at: Optional[str] = None
    path: Optional[str] = None


class Chunk(SQLModel, table=True):  # type: ignore[call-arg]
    id: Optional[int] = Field(default=None, primary_key=True)
    filing_id: int
    page: Optional[int] = None
    section: Optional[str] = None
    text: str
    tokens: int = 0
    embeddings: Optional[str] = None
