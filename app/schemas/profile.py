"""Pydantic schemas for user profile."""

from datetime import datetime
from pydantic import BaseModel


class ProfileCreate(BaseModel):
    python_level: str = "beginner"
    javascript_level: str = "beginner"
    html_css_level: str = "beginner"
    database_level: str = "beginner"
    git_level: str = "beginner"
    preferred_backend: str | None = None
    preferred_frontend: str | None = None
    preferred_database: str | None = None
    learning_goal: str | None = None
    time_per_week: str | None = None
    onboarding_complete: bool = False


class ProfileUpdate(BaseModel):
    python_level: str | None = None
    javascript_level: str | None = None
    html_css_level: str | None = None
    database_level: str | None = None
    git_level: str | None = None
    preferred_backend: str | None = None
    preferred_frontend: str | None = None
    preferred_database: str | None = None
    learning_goal: str | None = None
    time_per_week: str | None = None
    onboarding_complete: bool | None = None


class ProfileResponse(BaseModel):
    id: int
    python_level: str
    javascript_level: str
    html_css_level: str
    database_level: str
    git_level: str
    preferred_backend: str | None = None
    preferred_frontend: str | None = None
    preferred_database: str | None = None
    learning_goal: str | None = None
    time_per_week: str | None = None
    onboarding_complete: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
