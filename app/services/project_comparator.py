"""Project comparator — compares two learning projects side by side.

Compares:
- File structures (which files exist where)
- Concept coverage (mastery levels side by side)
- Design patterns (which patterns discovered in each)
"""

import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import LearningProject
from app.models.concept import ConceptExposure, DesignPattern
from app.config import settings

logger = logging.getLogger(__name__)


async def compare_projects(
    db: AsyncSession, project_a_id: int, project_b_id: int
) -> dict:
    """Full comparison of two projects.

    Returns a structured dict with file_diff, concept_comparison,
    and pattern_comparison sections.
    """
    # Load both projects
    a_result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_a_id)
    )
    b_result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_b_id)
    )
    project_a = a_result.scalars().first()
    project_b = b_result.scalars().first()

    if not project_a or not project_b:
        raise ValueError("One or both projects not found.")

    a_info = {
        "id": project_a.id,
        "name": project_a.name,
        "tech_stack": project_a.tech_stack,
        "directory": project_a.directory,
    }
    b_info = {
        "id": project_b.id,
        "name": project_b.name,
        "tech_stack": project_b.tech_stack,
        "directory": project_b.directory,
    }

    return {
        "project_a": a_info,
        "project_b": b_info,
        "file_diff": _compare_file_structures(project_a.directory, project_b.directory),
        "concept_comparison": await _compare_concepts(db, project_a_id, project_b_id),
        "pattern_comparison": await _compare_patterns(db, project_a_id, project_b_id),
    }


def _compare_file_structures(dir_a: str, dir_b: str) -> dict:
    """Compare file listings between two project directories."""
    workspace = settings.workspace_dir

    a_files = _list_relative_files(workspace / dir_a)
    b_files = _list_relative_files(workspace / dir_b)

    a_set = set(a_files)
    b_set = set(b_files)

    return {
        "only_in_a": sorted(a_set - b_set),
        "only_in_b": sorted(b_set - a_set),
        "in_both": sorted(a_set & b_set),
        "total_a": len(a_files),
        "total_b": len(b_files),
    }


def _list_relative_files(directory: Path) -> list[str]:
    """List relative file paths in a directory, skipping .gitkeep."""
    if not directory.exists():
        return []
    files = []
    for f in directory.rglob("*"):
        if f.is_file() and f.name != ".gitkeep":
            files.append(str(f.relative_to(directory)))
    return files


async def _compare_concepts(
    db: AsyncSession, a_id: int, b_id: int
) -> list[dict]:
    """Side-by-side concept mastery comparison using string-based concept titles."""
    # Get all concept exposures for both projects (no join needed — string-based)
    a_result = await db.execute(
        select(ConceptExposure)
        .where(ConceptExposure.project_id == a_id)
    )
    b_result = await db.execute(
        select(ConceptExposure)
        .where(ConceptExposure.project_id == b_id)
    )

    # Build dicts: concept_title -> mastery
    a_mastery = {e.concept_title: e.mastery for e in a_result.scalars().all()}
    b_mastery = {e.concept_title: e.mastery for e in b_result.scalars().all()}

    # Merge all concept titles
    all_concepts = sorted(set(a_mastery.keys()) | set(b_mastery.keys()))

    return [
        {
            "concept": title,
            "project_a_mastery": a_mastery.get(title, "not_seen"),
            "project_b_mastery": b_mastery.get(title, "not_seen"),
        }
        for title in all_concepts
    ]


async def _compare_patterns(
    db: AsyncSession, a_id: int, b_id: int
) -> dict:
    """Compare design patterns discovered in each project."""
    a_result = await db.execute(
        select(DesignPattern).where(
            DesignPattern.discovered_in_project_id == a_id
        )
    )
    b_result = await db.execute(
        select(DesignPattern).where(
            DesignPattern.discovered_in_project_id == b_id
        )
    )

    a_patterns = {p.name for p in a_result.scalars().all()}
    b_patterns = {p.name for p in b_result.scalars().all()}

    return {
        "only_in_a": sorted(a_patterns - b_patterns),
        "only_in_b": sorted(b_patterns - a_patterns),
        "in_both": sorted(a_patterns & b_patterns),
    }
