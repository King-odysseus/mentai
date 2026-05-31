"""Concept mastery tracker — records and retrieves learner progress.

Concepts are now string-based (concept_title) — the AI creates them on-the-fly.
For each (project, concept_title) pair, tracks mastery progression.
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.concept import ConceptExposure

logger = logging.getLogger(__name__)

MASTERY_LEVELS = ["introduced", "practiced", "confident", "mastered"]


def next_mastery(current: str) -> str:
    """Return the next mastery level, or the current level if already mastered."""
    try:
        idx = MASTERY_LEVELS.index(current)
        if idx < len(MASTERY_LEVELS) - 1:
            return MASTERY_LEVELS[idx + 1]
        return current
    except ValueError:
        return "introduced"


async def record_concept_exposure(
    db: AsyncSession,
    project_id: int,
    concept_title: str,
    module_title: str | None = None,
    notes: str | None = None,
) -> ConceptExposure:
    """Record that the learner encountered a concept in a project.

    Concepts are matched by title string — no FK to static table needed.
    Auto-bumps mastery based on encounter count.
    """
    result = await db.execute(
        select(ConceptExposure).where(
            ConceptExposure.project_id == project_id,
            ConceptExposure.concept_title == concept_title,
        )
    )
    exposure = result.scalars().first()

    if exposure:
        exposure.encounter_count += 1
        exposure.last_reviewed_at = datetime.now(timezone.utc)

        # Auto-bump mastery
        if exposure.encounter_count >= 7 and exposure.mastery == "confident":
            exposure.mastery = "mastered"
        elif exposure.encounter_count >= 4 and exposure.mastery == "practiced":
            exposure.mastery = "confident"
        elif exposure.encounter_count >= 2 and exposure.mastery == "introduced":
            exposure.mastery = "practiced"

        if notes:
            existing = exposure.notes or ""
            exposure.notes = (
                f"{existing}\n[{datetime.now(timezone.utc):%Y-%m-%d}] {notes}".strip()
            )

        logger.debug(
            "Updated concept: %s, count=%d, mastery=%s",
            concept_title, exposure.encounter_count, exposure.mastery,
        )
    else:
        exposure = ConceptExposure(
            project_id=project_id,
            concept_title=concept_title,
            module_title=module_title,
            mastery="introduced",
            encounter_count=1,
            notes=notes,
        )
        db.add(exposure)
        logger.debug("New concept: %s", concept_title)

    await db.flush()

    # Fire-and-forget: notify Cognitive1 brain
    try:
        from app.services.cognitive1 import cognitive1
        from app.models.project import LearningProject

        proj_result = await db.execute(
            select(LearningProject.name).where(LearningProject.id == project_id)
        )
        proj_name = proj_result.scalar() or "unknown"
        await cognitive1.learn_concept_exposed(
            concept_title=concept_title,
            mastery=exposure.mastery,
            project_name=proj_name,
        )
    except Exception:
        pass  # Cognitive1 is optional

    return exposure


async def get_mastery_for_project(
    db: AsyncSession, project_id: int
) -> list[dict]:
    """Get all concept mastery records for a project."""
    result = await db.execute(
        select(ConceptExposure)
        .where(ConceptExposure.project_id == project_id)
        .order_by(ConceptExposure.last_reviewed_at.desc())
    )
    exposures = result.scalars().all()

    return [
        {
            "id": e.id,
            "project_id": e.project_id,
            "concept_title": e.concept_title,
            "module_title": e.module_title,
            "mastery": e.mastery,
            "encounter_count": e.encounter_count,
            "last_reviewed_at": e.last_reviewed_at.isoformat(),
            "notes": e.notes,
        }
        for e in exposures
    ]


async def get_concepts_due_for_review(
    db: AsyncSession, project_id: int, limit: int = 5
) -> list[dict]:
    """Return concepts that are due for spaced-review."""
    from datetime import timedelta

    result = await db.execute(
        select(ConceptExposure)
        .where(
            ConceptExposure.project_id == project_id,
            ConceptExposure.mastery.in_(["introduced", "practiced"]),
        )
        .order_by(
            ConceptExposure.encounter_count.asc(),
            ConceptExposure.last_reviewed_at.asc(),
        )
        .limit(limit)
    )
    exposures = result.scalars().all()

    return [
        {
            "id": e.id,
            "concept_title": e.concept_title,
            "module_title": e.module_title,
            "mastery": e.mastery,
            "encounter_count": e.encounter_count,
            "days_since_review": (
                datetime.now(timezone.utc) - e.last_reviewed_at
            ).days,
        }
        for e in exposures
    ]
