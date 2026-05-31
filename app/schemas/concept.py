"""Pydantic schemas for concept tracking and curriculum management."""

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


# ---------------------------------------------------------------------------
# Curriculum CRUD schemas (Phase 3 — custom roadmaps)
# ---------------------------------------------------------------------------
class ModuleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    order_index: int = 0


class ModuleUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    order_index: int | None = None


class ModuleReorder(BaseModel):
    order: list[dict]  # [{"id": 1, "order_index": 0}, ...]


class ConceptCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    difficulty: str = "foundational"
    prerequisites: str | None = None
    key_terms: str | None = None


class ConceptUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    difficulty: str | None = None
    prerequisites: str | None = None
    key_terms: str | None = None
