"""Concept mastery tracker — records and retrieves a learner's progress.

For each (project, concept) pair, tracks:
- Exposure count (how many times they've encountered it)
- Mastery level (introduced → practiced → confident → mastered)
- Last review date (for spaced repetition logic)
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.concept import Concept, ConceptExposure

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
    concept_id: int,
    notes: str | None = None,
) -> ConceptExposure:
    """Record that the learner encountered a concept in a project.

    If they've seen it before, increment the encounter count and bump mastery
    if they've encountered it enough times. If it's new, create at 'introduced'.
    """
    result = await db.execute(
        select(ConceptExposure).where(
            ConceptExposure.project_id == project_id,
            ConceptExposure.concept_id == concept_id,
        )
    )
    exposure = result.scalars().first()

    if exposure:
        exposure.encounter_count += 1
        exposure.last_reviewed_at = datetime.now(timezone.utc)

        # Auto-bump mastery based on encounter count
        if exposure.encounter_count >= 7 and exposure.mastery == "confident":
            exposure.mastery = "mastered"
        elif exposure.encounter_count >= 4 and exposure.mastery == "practiced":
            exposure.mastery = "confident"
        elif exposure.encounter_count >= 2 and exposure.mastery == "introduced":
            exposure.mastery = "practiced"

        if notes:
            # Append to existing notes
            existing = exposure.notes or ""
            exposure.notes = f"{existing}\n[{datetime.now(timezone.utc):%Y-%m-%d}] {notes}".strip()

        logger.debug(
            "Updated concept exposure: concept=%d, count=%d, mastery=%s",
            concept_id, exposure.encounter_count, exposure.mastery,
        )
    else:
        exposure = ConceptExposure(
            project_id=project_id,
            concept_id=concept_id,
            mastery="introduced",
            encounter_count=1,
            notes=notes,
        )
        db.add(exposure)
        logger.debug("New concept exposure: concept=%d", concept_id)

    await db.flush()
    return exposure


async def get_mastery_for_project(
    db: AsyncSession, project_id: int
) -> list[dict]:
    """Get all concept mastery records for a project, with concept details joined."""
    result = await db.execute(
        select(ConceptExposure, Concept.title, Concept.difficulty)
        .join(Concept, ConceptExposure.concept_id == Concept.id)
        .where(ConceptExposure.project_id == project_id)
        .order_by(ConceptExposure.last_reviewed_at.desc())
    )
    rows = result.all()

    return [
        {
            "id": exposure.id,
            "project_id": exposure.project_id,
            "concept_id": exposure.concept_id,
            "mastery": exposure.mastery,
            "encounter_count": exposure.encounter_count,
            "last_reviewed_at": exposure.last_reviewed_at.isoformat(),
            "notes": exposure.notes,
            "concept_title": concept_title,
            "concept_difficulty": concept_difficulty,
        }
        for exposure, concept_title, concept_difficulty in rows
    ]


async def get_concepts_due_for_review(
    db: AsyncSession, project_id: int, limit: int = 5
) -> list[dict]:
    """Return concepts that are due for spaced-review.

    Prioritizes:
    1. Concepts seen only once (need reinforcement)
    2. Concepts last reviewed more than 7 days ago
    3. Concepts at 'introduced' or 'practiced' level (not yet mastered)
    """
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        select(ConceptExposure, Concept.title)
        .join(Concept, ConceptExposure.concept_id == Concept.id)
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
    rows = result.all()

    return [
        {
            "id": exposure.id,
            "concept_id": exposure.concept_id,
            "concept_title": title,
            "mastery": exposure.mastery,
            "encounter_count": exposure.encounter_count,
            "days_since_review": (datetime.now(timezone.utc) - exposure.last_reviewed_at).days,
        }
        for exposure, title in rows
    ]
