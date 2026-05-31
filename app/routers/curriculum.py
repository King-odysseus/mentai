"""Curriculum API — roadmap data, next-concept recommendations, and project scaffolding."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_db
from app.services import curriculum as curriculum_service
from app.schemas.concept import (
    ModuleCreate, ModuleUpdate, ModuleReorder,
    ConceptCreate as ConceptCreateSchema, ConceptUpdate as ConceptUpdateSchema,
    ModuleResponse, ConceptResponse,
)

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


# ---------------------------------------------------------------------------
# Custom roadmap CRUD (Phase 3)
# ---------------------------------------------------------------------------
@router.post("/modules", status_code=201)
async def create_module(
    data: ModuleCreate, db: AsyncSession = Depends(get_db),
):
    """Create a custom curriculum module."""
    from app.models.concept import CurriculumModule

    module = CurriculumModule(
        title=data.title,
        description=data.description,
        source="custom",
        order_index=data.order_index,
    )
    db.add(module)
    await db.flush()
    await db.refresh(module)
    # Return without the concepts relationship (empty for new modules)
    return {
        "id": module.id,
        "title": module.title,
        "description": module.description,
        "source": module.source,
        "order_index": module.order_index,
        "concepts": [],
    }


@router.put("/modules/{module_id}")
async def update_module(
    module_id: int,
    data: ModuleUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a custom curriculum module. Seeded modules are read-only."""
    from sqlalchemy import select
    from app.models.concept import CurriculumModule

    result = await db.execute(
        select(CurriculumModule).where(CurriculumModule.id == module_id)
    )
    module = result.scalars().first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
    if module.source != "custom":
        raise HTTPException(
            status_code=403, detail="Seeded modules cannot be edited. Create a custom module instead."
        )
    if data.title is not None:
        module.title = data.title
    if data.description is not None:
        module.description = data.description
    if data.order_index is not None:
        module.order_index = data.order_index
    await db.flush()
    await db.refresh(module)
    # Return without concepts to avoid lazy-load issue
    return {
        "id": module.id,
        "title": module.title,
        "description": module.description,
        "source": module.source,
        "order_index": module.order_index,
        "concepts": [],
    }


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(
    module_id: int, db: AsyncSession = Depends(get_db),
):
    """Delete a custom module. Seeded modules cannot be deleted."""
    from sqlalchemy import select
    from app.models.concept import CurriculumModule, ConceptExposure, Concept

    result = await db.execute(
        select(CurriculumModule).where(CurriculumModule.id == module_id)
    )
    module = result.scalars().first()
    if not module:
        raise HTTPException(status_code=404)
    if module.source != "custom":
        raise HTTPException(
            status_code=403, detail="Seeded modules cannot be deleted."
        )
    # Check if any concept in this module has exposures
    exp_result = await db.execute(
        select(ConceptExposure).join(Concept).where(
            Concept.module_id == module_id
        ).limit(1)
    )
    if exp_result.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: concepts in this module have learning history.",
        )
    await db.delete(module)
    await db.flush()


@router.patch("/modules/reorder")
async def reorder_modules(
    data: ModuleReorder, db: AsyncSession = Depends(get_db),
):
    """Batch update order_index for all modules."""
    from sqlalchemy import select
    from app.models.concept import CurriculumModule

    for item in data.order:
        mod_id = item.get("id")
        new_order = item.get("order_index")
        if mod_id is None or new_order is None:
            continue
        result = await db.execute(
            select(CurriculumModule).where(CurriculumModule.id == mod_id)
        )
        module = result.scalars().first()
        if module:
            module.order_index = new_order
    await db.flush()
    return {"reordered": len(data.order)}


@router.post("/modules/{module_id}/concepts", status_code=201)
async def create_concept(
    module_id: int,
    data: ConceptCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Add a concept to a curriculum module."""
    from sqlalchemy import select
    from app.models.concept import CurriculumModule, Concept

    mod_result = await db.execute(
        select(CurriculumModule).where(CurriculumModule.id == module_id)
    )
    if not mod_result.scalars().first():
        raise HTTPException(status_code=404, detail="Module not found.")

    concept = Concept(
        module_id=module_id,
        title=data.title,
        description=data.description,
        difficulty=data.difficulty,
        prerequisites=data.prerequisites,
        key_terms=data.key_terms,
    )
    db.add(concept)
    await db.flush()
    await db.refresh(concept)
    return ConceptResponse.model_validate(concept)


@router.put("/concepts/{concept_id}")
async def update_concept(
    concept_id: int,
    data: ConceptUpdateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Update a concept's metadata."""
    from sqlalchemy import select
    from app.models.concept import Concept

    result = await db.execute(select(Concept).where(Concept.id == concept_id))
    concept = result.scalars().first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found.")
    if data.title is not None:
        concept.title = data.title
    if data.description is not None:
        concept.description = data.description
    if data.difficulty is not None:
        concept.difficulty = data.difficulty
    if data.prerequisites is not None:
        concept.prerequisites = data.prerequisites
    if data.key_terms is not None:
        concept.key_terms = data.key_terms
    await db.flush()
    await db.refresh(concept)
    return ConceptResponse.model_validate(concept)


@router.delete("/concepts/{concept_id}", status_code=204)
async def delete_concept(
    concept_id: int, db: AsyncSession = Depends(get_db),
):
    """Delete a concept. Only allowed if it has no exposure history."""
    from sqlalchemy import select
    from app.models.concept import Concept, ConceptExposure

    result = await db.execute(select(Concept).where(Concept.id == concept_id))
    concept = result.scalars().first()
    if not concept:
        raise HTTPException(status_code=404)

    exp_result = await db.execute(
        select(ConceptExposure).where(ConceptExposure.concept_id == concept_id).limit(1)
    )
    if exp_result.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: this concept has learning history.",
        )
    await db.delete(concept)
    await db.flush()
