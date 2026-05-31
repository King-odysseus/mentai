"""Pydantic schemas for concept tracking."""

from datetime import datetime
from pydantic import BaseModel, Field


class ConceptExposureResponse(BaseModel):
    id: int
    project_id: int
    concept_title: str
    module_title: str | None = None
    mastery: str
    encounter_count: int
    last_reviewed_at: datetime
    notes: str | None = None

    model_config = {"from_attributes": True}


class MasteryUpdate(BaseModel):
    mastery: str = Field(..., pattern="^(introduced|practiced|confident|mastered)$")
    notes: str | None = None
