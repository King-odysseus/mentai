"""Dashboard API — aggregate stats, progress data, and recent activity."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_db

router = APIRouter()


@router.get("/dashboard/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Return aggregate stats for the dashboard overview."""
    from app.models.project import LearningProject
    from app.models.concept import ConceptExposure
    from app.models.session import LearningSession
    from sqlalchemy import select, func

    # Count projects
    proj_result = await db.execute(select(func.count(LearningProject.id)))
    total_projects = proj_result.scalar() or 0

    # Count concepts tracked
    concept_result = await db.execute(
        select(func.count(ConceptExposure.id))
    )
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


@router.get("/dashboard/progress")
async def progress_data(db: AsyncSession = Depends(get_db)):
    """Return detailed progress data for charts (session history, mastery, totals)."""
    from app.models.session import LearningSession
    from app.models.concept import ConceptExposure, Concept
    from sqlalchemy import select, func

    # Session history (last 14 days)
    fourteen_days_ago = datetime.now(timezone.utc) - timedelta(days=14)
    sess_result = await db.execute(
        select(
            func.date(LearningSession.started_at),
            func.count(LearningSession.id),
            func.sum(LearningSession.duration_minutes),
        )
        .where(LearningSession.started_at >= fourteen_days_ago)
        .group_by(func.date(LearningSession.started_at))
        .order_by(func.date(LearningSession.started_at))
    )
    daily_sessions = [
        {"date": str(row[0]), "count": row[1], "minutes": row[2] or 0}
        for row in sess_result.all()
    ]

    # Concept mastery distribution
    mastery_result = await db.execute(
        select(ConceptExposure.mastery, func.count(ConceptExposure.id)).group_by(
            ConceptExposure.mastery
        )
    )
    mastery_dist = {row[0]: row[1] for row in mastery_result.all()}

    # Recently mastered concepts
    mastered_result = await db.execute(
        select(ConceptExposure, Concept.title)
        .join(Concept, ConceptExposure.concept_id == Concept.id)
        .where(ConceptExposure.mastery == "mastered")
        .order_by(ConceptExposure.last_reviewed_at.desc())
        .limit(5)
    )
    recently_mastered = [
        {"concept": title, "encounter_count": exp.encounter_count}
        for exp, title in mastered_result.all()
    ]

    # Total learning time
    total_time_result = await db.execute(
        select(func.sum(LearningSession.duration_minutes)).where(
            LearningSession.duration_minutes.isnot(None)
        )
    )
    total_minutes = total_time_result.scalar() or 0

    return {
        "daily_sessions": daily_sessions,
        "mastery_distribution": mastery_dist,
        "recently_mastered": recently_mastered,
        "total_learning_minutes": total_minutes,
        "total_learning_hours": round(total_minutes / 60, 1),
    }
