"""Pydantic schemas for design patterns."""

from pydantic import BaseModel, Field


class PatternCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = "general"
    description: str | None = None
    example_code: str | None = None
    use_cases: str | None = None
    related_concept_ids: str | None = None
    discovered_in_project_id: int | None = None
    difficulty: str = "intermediate"


class PatternResponse(BaseModel):
    id: int
    name: str
    category: str
    description: str | None = None
    example_code: str | None = None
    use_cases: str | None = None
    related_concept_ids: str | None = None
    discovered_in_project_id: int | None = None
    difficulty: str
    encounter_count: int

    model_config = {"from_attributes": True}
