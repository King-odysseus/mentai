"""LearningProject — a project the learner builds while studying.

Each project is a real directory on disk under workspace/.
"""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.db import Base

# Late imports for relationship resolution — must be available
# before SQLAlchemy mapper configuration.
from app.models.session import LearningSession
from app.models.concept import ConceptExposure


class LearningProject(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tech_stack: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Directory name under workspace/ — defaults to slugified name
    directory: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, completed, archived

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    sessions: Mapped[list["LearningSession"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    concept_exposures: Mapped[list["ConceptExposure"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
