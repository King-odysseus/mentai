"""Curriculum API — roadmap data, next-concept recommendations, and project scaffolding."""

from fastapi import APIRouter, Depends, HTTPException, Query
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


# ---------------------------------------------------------------------------
# roadmap.sh live scraper
# ---------------------------------------------------------------------------
@router.post("/refresh/{roadmap}")
async def refresh_curriculum(roadmap: str):
    """Fetch fresh roadmap data from roadmap.sh and return parsed topics.

    Read-only preview — does not auto-merge into the database.
    Full merge deferred until parsing is stable.
    """
    from app.services.roadmap_scraper import fetch_roadmap_topics

    try:
        topics = await fetch_roadmap_topics(roadmap)
        return {"roadmap": roadmap, "topics_found": len(topics), "topics": topics}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch roadmap: {exc}")


# ---------------------------------------------------------------------------
# Curriculum project scaffolding
# ---------------------------------------------------------------------------
@router.get("/module/{module_id}/projects")
async def module_projects(module_id: int, db: AsyncSession = Depends(get_db)):
    """Get suggested scaffolded projects for a curriculum module."""
    from app.services.project_generator import get_module_projects

    return await get_module_projects(db, module_id)


@router.post("/projects/{cp_id}/scaffold")
async def scaffold_project(cp_id: int, db: AsyncSession = Depends(get_db)):
    """Create a real project from a curriculum project template."""
    from app.services.project_generator import scaffold_project

    result = await scaffold_project(db, cp_id, "")
    await db.commit()
    return result
