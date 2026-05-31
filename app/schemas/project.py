"""Pydantic schemas for LearningProject CRUD."""

from datetime import datetime
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    tech_stack: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    tech_stack: str | None = None
    status: str | None = None  # active, completed, archived


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    tech_stack: str | None = None
    directory: str
    status: str
    learning_path: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
