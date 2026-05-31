"""User profile — learner experience levels and stack preferences.

The AI tutor uses this to generate personalized learning paths and adapt
its teaching style. Populated during onboarding.
"""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.storage.db import Base


class UserProfile(Base):
    """A learner's experience levels and learning preferences."""

    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Display name
    display_name: Mapped[str] = mapped_column(String(100), default="Learner")

    # Experience levels: beginner | intermediate | advanced
    python_level: Mapped[str] = mapped_column(String(20), default="beginner")
    javascript_level: Mapped[str] = mapped_column(String(20), default="beginner")
    html_css_level: Mapped[str] = mapped_column(String(20), default="beginner")
    database_level: Mapped[str] = mapped_column(String(20), default="beginner")
    git_level: Mapped[str] = mapped_column(String(20), default="beginner")

    # Preferred stack
    preferred_backend: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # "python+fastapi", "node+express"
    preferred_frontend: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # "react", "vanilla", "htmx"
    preferred_database: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # "postgresql", "sqlite"

    # Learning goals
    learning_goal: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )  # "fullstack_dev", "backend_dev", "frontend_dev"
    time_per_week: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # "5h", "10h", "20h"

    # Onboarding state
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
