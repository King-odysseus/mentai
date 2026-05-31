"""Pattern library API — CRUD for design patterns discovered in learner code."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_db
from app.models.concept import DesignPattern
from app.schemas.pattern import PatternCreate, PatternResponse

router = APIRouter()


@router.get("", response_model=list[PatternResponse])
async def list_patterns(
    category: str | None = Query(None),
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List design patterns, optionally filtered by category or project."""
    query = select(DesignPattern)
    if category:
        query = query.where(DesignPattern.category == category)
    if project_id is not None:
        query = query.where(DesignPattern.discovered_in_project_id == project_id)
    query = query.order_by(DesignPattern.name)
    result = await db.execute(query)
    return [PatternResponse.model_validate(p) for p in result.scalars().all()]


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Get distinct pattern categories with counts."""
    result = await db.execute(
        select(DesignPattern.category, func.count(DesignPattern.id)).group_by(
            DesignPattern.category
        )
    )
    return [{"category": row[0], "count": row[1]} for row in result.all()]


@router.post("", response_model=PatternResponse, status_code=201)
async def create_pattern(data: PatternCreate, db: AsyncSession = Depends(get_db)):
    """Record a new design pattern."""
    pattern = DesignPattern(**data.model_dump())
    db.add(pattern)
    await db.flush()
    await db.refresh(pattern)
    return PatternResponse.model_validate(pattern)


@router.patch("/{pattern_id}/encounter")
async def increment_encounter(pattern_id: int, db: AsyncSession = Depends(get_db)):
    """Mark that the learner encountered this pattern again."""
    result = await db.execute(
        select(DesignPattern).where(DesignPattern.id == pattern_id)
    )
    pattern = result.scalars().first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found.")
    pattern.encounter_count += 1
    await db.flush()
    return {"id": pattern.id, "encounter_count": pattern.encounter_count}


@router.get("/project/{project_id}", response_model=list[PatternResponse])
async def list_patterns_by_project(
    project_id: int, db: AsyncSession = Depends(get_db)
):
    """List all design patterns discovered in a specific project."""
    result = await db.execute(
        select(DesignPattern)
        .where(DesignPattern.discovered_in_project_id == project_id)
        .order_by(DesignPattern.name)
    )
    return [PatternResponse.model_validate(p) for p in result.scalars().all()]
