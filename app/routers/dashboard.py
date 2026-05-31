"""Dashboard API — aggregate stats and recent activity for the overview page."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_db

router = APIRouter()


@router.get("/dashboard/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Return aggregate stats for the dashboard overview."""
    from app.models.project import LearningProject
    from app.models.concept import CurriculumModule, Concept, ConceptExposure
    from app.models.session import LearningSession
    from sqlalchemy import select, func

    # Count projects
    proj_result = await db.execute(select(func.count(LearningProject.id)))
    total_projects = proj_result.scalar() or 0

    # Count concepts tracked
    concept_result = await db.execute(select(func.count(Concept.id)))
    total_concepts = concept_result.scalar() or 0

    # Count sessions
    sess_result = await db.execute(select(func.count(LearningSession.id)))
    total_sessions = sess_result.scalar() or 0

    # Mastery breakdown
    mastery_result = await db.execute(
        select(
            ConceptExposure.mastery,
            func.count(ConceptExposure.id),
        ).group_by(ConceptExposure.mastery)
    )
    mastery_breakdown = {row[0]: row[1] for row in mastery_result.all()}

    # Recent projects
    recent_proj = await db.execute(
        select(LearningProject).order_by(LearningProject.updated_at.desc()).limit(5)
    )
    recent_projects = [
        {
            "id": p.id,
            "name": p.name,
            "tech_stack": p.tech_stack,
            "status": p.status,
            "updated_at": p.updated_at.isoformat(),
        }
        for p in recent_proj.scalars().all()
    ]

    return {
        "total_projects": total_projects,
        "total_concepts": total_concepts,
        "total_sessions": total_sessions,
        "mastery_breakdown": mastery_breakdown,
        "recent_projects": recent_projects,
    }
