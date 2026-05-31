"""Pydantic schemas for concept tracking."""

from datetime import datetime
from pydantic import BaseModel, Field


class ConceptResponse(BaseModel):
    id: int
    module_id: int
    title: str
    description: str | None = None
    difficulty: str
    prerequisites: str | None = None
    key_terms: str | None = None

    model_config = {"from_attributes": True}


class ConceptExposureResponse(BaseModel):
    id: int
    project_id: int
    concept_id: int
    mastery: str
    encounter_count: int
    last_reviewed_at: datetime
    notes: str | None = None
    # Joined fields
    concept_title: str | None = None
    concept_difficulty: str | None = None

    model_config = {"from_attributes": True}


class MasteryUpdate(BaseModel):
    mastery: str = Field(..., pattern="^(introduced|practiced|confident|mastered)$")
    notes: str | None = None


class ModuleResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    source: str
    order_index: int
    concepts: list[ConceptResponse] = []

    model_config = {"from_attributes": True}
