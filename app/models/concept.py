"""Concept — a curriculum topic from the roadmap, with mastery tracking per project.

Concepts belong to a curriculum module and are tracked per project via
ConceptExposure (many-to-many with mastery level).
"""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.db import Base


class CurriculumModule(Base):
    """A top-level topic area (e.g. 'Python Basics', 'Databases', 'APIs')."""

    __tablename__ = "curriculum_modules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(100), default="roadmap.sh")
    # Position in the roadmap dependency order
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    concepts: Mapped[list["Concept"]] = relationship(
        back_populates="module", cascade="all, delete-orphan"
    )


class Concept(Base):
    """A single teachable concept within a module."""

    __tablename__ = "concepts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("curriculum_modules.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Difficulty: foundational, intermediate, advanced
    difficulty: Mapped[str] = mapped_column(String(50), default="foundational")
    # Prerequisites — comma-separated concept IDs for dependency ordering
    prerequisites: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Key terms / vocabulary for this concept
    key_terms: Mapped[str | None] = mapped_column(Text, nullable=True)

    module: Mapped["CurriculumModule"] = relationship(back_populates="concepts")
    exposures: Mapped[list["ConceptExposure"]] = relationship(
        back_populates="concept", cascade="all, delete-orphan"
    )


class ConceptExposure(Base):
    """Tracks a learner's exposure to a concept within a specific project.

    Mastery progresses: introduced → practiced → confident → mastered
    """

    __tablename__ = "concept_exposures"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    concept_id: Mapped[int] = mapped_column(ForeignKey("concepts.id"))
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
    concept: Mapped["Concept"] = relationship(back_populates="exposures")
