"""Pydantic schemas for daily/weekly learning goals."""

from datetime import datetime
from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    goal_type: str = Field(..., pattern="^(daily|weekly)$")
    description: str = Field(..., min_length=1, max_length=500)
    target_value: int | None = None
    unit: str = "minutes"
    target_date: str  # YYYY-MM-DD


class GoalUpdate(BaseModel):
    progress: int | None = None
    completed: int | None = None


class GoalResponse(BaseModel):
    id: int
    goal_type: str
    description: str
    target_value: int | None = None
    progress: int
    unit: str
    target_date: str
    completed: int
    created_at: datetime

    model_config = {"from_attributes": True}
