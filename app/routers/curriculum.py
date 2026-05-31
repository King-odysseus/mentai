"""Curriculum API — roadmap data and next-concept recommendations."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_db
from app.services import curriculum as curriculum_service

router = APIRouter()


@router.get("/modules")
async def list_modules(db: AsyncSession = Depends(get_db)):
    """List all curriculum modules with their concepts, in roadmap order."""
    return await curriculum_service.get_curriculum_modules(db)


@router.get("/next/{project_id}")
async def next_concepts(
    project_id: int,
    limit: int = Query(default=5, le=20),
    db: AsyncSession = Depends(get_db),
):
    """Return the next concepts the learner should tackle for a project."""
    return await curriculum_service.get_next_concepts(db, project_id, limit)


@router.post("/seed")
async def seed(db: AsyncSession = Depends(get_db)):
    """Seed the database with the built-in curriculum. Idempotent — safe to call multiple times."""
    created = await curriculum_service.seed_curriculum(db)
    return {"seeded": created > 0, "modules_created": created}
