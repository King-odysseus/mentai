"""Concept — a curriculum topic from the roadmap, with mastery tracking per project.

Concepts belong to a curriculum module and are tracked per project via
ConceptExposure (many-to-many with mastery level).

Also includes:
- CurriculumProject — scaffolded starter projects tied to modules
- DesignPattern — catalog of patterns discovered in learner code
- Goal — daily/weekly learning goals
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
    projects: Mapped[list["CurriculumProject"]] = relationship(
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


# ---------------------------------------------------------------------------
# Phase 2 models
# ---------------------------------------------------------------------------


class CurriculumProject(Base):
    """A scaffolded starter project tied to a curriculum module.

    Each module can have one or more project templates that exercise the
    concepts taught in that module. scaffold_files is a JSON array of
    {path, content} objects used to create the workspace directory.
    """

    __tablename__ = "curriculum_projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("curriculum_modules.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tech_stack: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # JSON array of {path, content} objects
    scaffold_files: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    module: Mapped["CurriculumModule"] = relationship(back_populates="projects")


class DesignPattern(Base):
    """A design pattern or idiom discovered in learner code.

    Patterns are cataloged as the learner encounters them across projects.
    They link back to curriculum concepts and track how often they appear.
    """

    __tablename__ = "design_patterns"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # creational, structural, behavioral, architectural, python-idiom
    category: Mapped[str] = mapped_column(String(100), default="general")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Example code snippet showing the pattern
    example_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    # When to use this pattern
    use_cases: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Comma-separated concept IDs that relate to this pattern
    related_concept_ids: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Which project this pattern was first seen in (integer, no FK to avoid circular import)
    discovered_in_project_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Difficulty to understand/apply
    difficulty: Mapped[str] = mapped_column(String(50), default="intermediate")
    # Number of times learner has seen/used this pattern
    encounter_count: Mapped[int] = mapped_column(Integer, default=0)


class Goal(Base):
    """A daily or weekly learning goal.

    Goals track what the learner aims to accomplish within a time window.
    Progress auto-completes when progress reaches the target value.
    """

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # "daily" or "weekly"
    goal_type: Mapped[str] = mapped_column(String(20), default="daily")
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    # Target count (e.g. minutes, sessions, concepts)
    target_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Actual progress achieved
    progress: Mapped[int] = mapped_column(Integer, default=0)
    # Unit: "minutes", "sessions", "concepts"
    unit: Mapped[str] = mapped_column(String(50), default="minutes")
    # For daily: the date (YYYY-MM-DD). For weekly: the Monday of the week.
    target_date: Mapped[str] = mapped_column(String(10), nullable=False)
    # Whether the goal was met (0 = not met, 1 = met)
    completed: Mapped[int] = mapped_column(Integer, default=0)
    # When this goal was created
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

