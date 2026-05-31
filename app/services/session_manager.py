"""Session manager — creates, tracks, and ends learning sessions.

Handles the session lifecycle:
- Start: detect available time window, set mode (micro/deep)
- During: provide context for the AI tutor about remaining time
- End: calculate duration, summarize what was covered
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import LearningSession

logger = logging.getLogger(__name__)


async def start_session(
    db: AsyncSession,
    project_id: int,
    mode: str = "micro",
    available_minutes: int | None = None,
) -> LearningSession:
    """Create a new learning session and return it."""
    session = LearningSession(
        project_id=project_id,
        mode=mode,
        duration_minutes=available_minutes,
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()
    logger.info(
        "Session started: id=%d, project=%d, mode=%s",
        session.id, project_id, mode,
    )
    return session


async def end_session(
    db: AsyncSession,
    session_id: int,
    mood: str | None = None,
    summary: str | None = None,
    concepts_covered: str | None = None,
) -> LearningSession | None:
    """End a session: calculate actual duration, store summary and mood."""
    result = await db.execute(
        select(LearningSession).where(LearningSession.id == session_id)
    )
    session = result.scalars().first()
    if not session:
        logger.warning("Session %d not found for ending.", session_id)
        return None

    now = datetime.now(timezone.utc)
    session.ended_at = now

    # Calculate actual duration
    if session.started_at:
        delta = now - session.started_at.replace(tzinfo=timezone.utc)
        session.duration_minutes = max(1, round(delta.total_seconds() / 60))

    if mood:
        session.mood = mood
    if summary:
        session.summary = summary
    if concepts_covered:
        session.concepts_covered = concepts_covered

    await db.flush()
    logger.info(
        "Session ended: id=%d, duration=%dmin, mood=%s",
        session.id, session.duration_minutes, session.mood,
    )
    return session


async def get_recent_sessions(
    db: AsyncSession, project_id: int, limit: int = 10
) -> list[LearningSession]:
    """Get the most recent sessions for a project."""
    result = await db.execute(
        select(LearningSession)
        .where(LearningSession.project_id == project_id)
        .order_by(LearningSession.started_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_session_stats(db: AsyncSession, project_id: int) -> dict:
    """Get aggregate session statistics for a project."""
    # Total sessions
    total_result = await db.execute(
        select(func.count(LearningSession.id)).where(
            LearningSession.project_id == project_id
        )
    )
    total = total_result.scalar() or 0

    # Total time
    time_result = await db.execute(
        select(func.sum(LearningSession.duration_minutes)).where(
            LearningSession.project_id == project_id,
            LearningSession.duration_minutes.isnot(None),
        )
    )
    total_minutes = time_result.scalar() or 0

    # Sessions this week
    from datetime import timedelta
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_result = await db.execute(
        select(func.count(LearningSession.id)).where(
            LearningSession.project_id == project_id,
            LearningSession.started_at >= week_ago,
        )
    )
    this_week = week_result.scalar() or 0

    # Streak (consecutive days with at least one session)
    streak = await _calculate_streak(db, project_id)

    return {
        "total_sessions": total,
        "total_minutes": total_minutes,
        "sessions_this_week": this_week,
        "current_streak_days": streak,
    }


async def _calculate_streak(db: AsyncSession, project_id: int) -> int:
    """Calculate the current consecutive-day streak for a project."""
    from datetime import timedelta

    # Get distinct days with sessions, ordered by date descending
    result = await db.execute(
        select(func.date(LearningSession.started_at))
        .where(LearningSession.project_id == project_id)
        .distinct()
        .order_by(func.date(LearningSession.started_at).desc())
        .limit(30)
    )
    days = [row[0] for row in result.all()]
    if not days:
        return 0

    today = datetime.now(timezone.utc).date()
    streak = 0
    expected = today

    for day in days:
        if day == expected:
            streak += 1
            expected = day - timedelta(days=1)
        elif day == expected - timedelta(days=1):
            # Allow one missed day (yesterday)
            streak += 1
            expected = day - timedelta(days=1)
        else:
            break

    return streak
