"""Concept tracking — lightweight, AI-driven concept exposure per project.

Concepts are now string-based (not FK'd to a static table). The AI tutor
creates concepts on-the-fly as it teaches, no static curriculum needed.
"""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.db import Base


class ConceptExposure(Base):
    """Tracks a learner's exposure to a concept within a specific project.

    Mastery progresses: introduced -> practiced -> confident -> mastered
    Concepts are string-based — created by the AI tutor on-the-fly.
    """

    __tablename__ = "concept_exposures"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    # AI-generated concept title (e.g. "Functions and Scope")
    concept_title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Optional module grouping (e.g. "Python Basics")
    module_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Mastery level
    mastery: Mapped[str] = mapped_column(String(50), default="introduced")
    # How many times the learner has encountered this concept
    encounter_count: Mapped[int] = mapped_column(Integer, default=1)
    # Last time this concept was practiced or discussed
    last_reviewed_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    # Tutor notes about the learner's understanding
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["LearningProject"] = relationship(back_populates="concept_exposures")


class DesignPattern(Base):
    """A design pattern or idiom discovered in learner code."""

    __tablename__ = "design_patterns"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="general")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    use_cases: Mapped[str | None] = mapped_column(Text, nullable=True)
    discovered_in_project_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(50), default="intermediate")
    encounter_count: Mapped[int] = mapped_column(Integer, default=0)


class Goal(Base):
    """A daily or weekly learning goal."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    goal_type: Mapped[str] = mapped_column(String(20), default="daily")
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    target_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str] = mapped_column(String(50), default="minutes")
    target_date: Mapped[str] = mapped_column(String(10), nullable=False)
    completed: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
