"""Goal tracking API — daily and weekly learning goals."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_db
from app.models.concept import Goal
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse

router = APIRouter()


@router.get("", response_model=list[GoalResponse])
async def list_goals(
    goal_type: str | None = None,
    target_date: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List goals, optionally filtered by type and date."""
    query = select(Goal).order_by(Goal.target_date.desc(), Goal.created_at.desc())
    if goal_type:
        query = query.where(Goal.goal_type == goal_type)
    if target_date:
        query = query.where(Goal.target_date == target_date)
    result = await db.execute(query)
    return [GoalResponse.model_validate(g) for g in result.scalars().all()]


@router.post("", response_model=GoalResponse, status_code=201)
async def create_goal(data: GoalCreate, db: AsyncSession = Depends(get_db)):
    """Set a new daily or weekly goal."""
    goal = Goal(**data.model_dump())
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    return GoalResponse.model_validate(goal)


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int, data: GoalUpdate, db: AsyncSession = Depends(get_db)
):
    """Update goal progress or mark complete."""
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")
    if data.progress is not None:
        goal.progress = data.progress
        # Auto-mark complete if progress reaches target
        if goal.target_value and goal.progress >= goal.target_value:
            goal.completed = 1
    if data.completed is not None:
        goal.completed = data.completed
    await db.flush()
    await db.refresh(goal)
    return GoalResponse.model_validate(goal)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a goal."""
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404)
    await db.delete(goal)
    await db.flush()


@router.get("/today")
async def todays_goals(db: AsyncSession = Depends(get_db)):
    """Get today's goals with auto-generated suggestions."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result = await db.execute(
        select(Goal).where(Goal.target_date == today, Goal.goal_type == "daily")
    )
    existing = [GoalResponse.model_validate(g) for g in result.scalars().all()]

    # Auto-suggest goals if none exist for today
    suggestions = []
    if not existing:
        suggestions = [
            {
                "description": "Complete one micro session",
                "target_value": 15,
                "unit": "minutes",
            },
            {
                "description": "Review 2 concepts",
                "target_value": 2,
                "unit": "concepts",
            },
            {
                "description": "Write 50 lines of code",
                "target_value": 50,
                "unit": "lines",
            },
        ]
    return {"goals": existing, "suggestions": suggestions}
