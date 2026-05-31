"""Concept tracking API — record exposures, update mastery, get progress."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_db
from app.services import concept_tracker
from app.schemas.concept import ConceptExposureResponse, MasteryUpdate

router = APIRouter()


@router.get("/project/{project_id}")
async def get_project_concepts(project_id: int, db: AsyncSession = Depends(get_db)):
    """Get all concept mastery records for a project."""
    return await concept_tracker.get_mastery_for_project(db, project_id)


@router.post("/expose")
async def expose_concept(
    project_id: int,
    concept_title: str,
    module_title: str | None = None,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Record that a concept was encountered in a session."""
    exposure = await concept_tracker.record_concept_exposure(
        db, project_id, concept_title, module_title, notes
    )
    return {
        "id": exposure.id,
        "project_id": exposure.project_id,
        "concept_title": exposure.concept_title,
        "module_title": exposure.module_title,
        "mastery": exposure.mastery,
        "encounter_count": exposure.encounter_count,
        "last_reviewed_at": exposure.last_reviewed_at.isoformat(),
        "notes": exposure.notes,
    }


@router.patch("/{exposure_id}/mastery")
async def update_mastery(
    exposure_id: int,
    data: MasteryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Manually update the mastery level for a concept exposure."""
    from app.models.concept import ConceptExposure
    from sqlalchemy import select

    result = await db.execute(
        select(ConceptExposure).where(ConceptExposure.id == exposure_id)
    )
    exposure = result.scalars().first()
    if not exposure:
        raise HTTPException(status_code=404, detail="Exposure record not found.")

    exposure.mastery = data.mastery
    if data.notes:
        exposure.notes = data.notes
    await db.flush()

    return {
        "id": exposure.id,
        "project_id": exposure.project_id,
        "concept_title": exposure.concept_title,
        "module_title": exposure.module_title,
        "mastery": exposure.mastery,
        "encounter_count": exposure.encounter_count,
        "last_reviewed_at": exposure.last_reviewed_at.isoformat(),
        "notes": exposure.notes,
    }


@router.get("/project/{project_id}/due")
async def get_due_review(project_id: int, db: AsyncSession = Depends(get_db)):
    """Get concepts due for spaced review."""
    return await concept_tracker.get_concepts_due_for_review(db, project_id)
