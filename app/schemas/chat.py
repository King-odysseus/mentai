"""Pydantic schemas for chat messages and WebSocket events."""

from datetime import datetime
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Incoming chat message from the learner."""
    content: str = Field(..., min_length=1)
    project_id: int
    session_mode: str = "micro"  # micro or deep


class TutorEvent(BaseModel):
    """WebSocket event sent from the tutor to the frontend."""
    type: str  # "delta", "done", "error", "concept_exposed"
    content: str | None = None
    # When type is "concept_exposed", includes concept info
    concept: str | None = None
    mastery: str | None = None
    timestamp: str | None = None


class SessionStart(BaseModel):
    """Frontend signals the start of a session."""
    project_id: int
    mode: str = "micro"  # micro or deep
    available_minutes: int = 10


class SessionEnd(BaseModel):
    """Frontend signals the end of a session."""
    project_id: int
    duration_minutes: int
    mood: str | None = None
