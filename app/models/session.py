"""LearningSession — a time-boxed study session.

Tracks when the learner studied, for how long, in what mode (micro/deep),
and what was covered. Used by the tutor to adapt pacing and by the dashboard
to show consistency.
"""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.db import Base


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    # Session mode: "micro" (5-15 min, quick concept review) or "deep" (30+ min, building)
    mode: Mapped[str] = mapped_column(String(20), default="micro")
    # Duration in minutes — set when session ends, estimated when starting
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # What the learner worked on or studied
    focus: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Concepts covered (comma-separated IDs for quick lookup)
    concepts_covered: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Tutor summary written at session end
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Mood/energy self-report (optional, set by learner)
    mood: Mapped[str | None] = mapped_column(String(50), nullable=True)

    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    project: Mapped["LearningProject"] = relationship(back_populates="sessions")
