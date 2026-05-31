"""Project CRUD API — create, list, update, delete learning projects.

Each project maps to a real directory under workspace/ for learner code files.
Also includes file management (list, read, write) and code execution.
"""

import re
import shutil
import subprocess
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.storage.db import get_db
from app.models.project import LearningProject
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)

router = APIRouter()


def _slugify(name: str) -> str:
    """Convert a project name to a filesystem-safe directory name."""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return slug.strip("-") or "project"


def _project_dir(name: str) -> Path:
    return settings.workspace_dir / _slugify(name)


# ------------------------------------------------------------------
# CRUD endpoints
# ------------------------------------------------------------------
@router.get("", response_model=ProjectListResponse)
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all learning projects, newest first."""
    result = await db.execute(
        select(LearningProject).order_by(LearningProject.updated_at.desc())
    )
    projects = result.scalars().all()
    return ProjectListResponse(
        projects=[ProjectResponse.model_validate(p) for p in projects],
        total=len(projects),
    )


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """Create a new learning project and its workspace directory."""
    directory = _slugify(data.name)
    project_dir = settings.workspace_dir / directory

    # Check for duplicate name
    existing = await db.execute(
        select(LearningProject).where(LearningProject.directory == directory)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="A project with this name already exists.")

    # Create workspace directory
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "README.md").write_text(
        f"# {data.name}\n\n{data.description or 'A MentAi learning project.'}\n"
    )
    # Create a basic .gitignore for learner projects
    (project_dir / ".gitignore").write_text(
        "__pycache__/\n*.pyc\n.env\nvenv/\n.venv/\n"
    )

    project = LearningProject(
        name=data.name,
        description=data.description,
        tech_stack=data.tech_stack,
        directory=directory,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single project by ID."""
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int, data: ProjectUpdate, db: AsyncSession = Depends(get_db)
):
    """Update project metadata. Does not rename the directory."""
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    await db.flush()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a project and its workspace directory."""
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Remove workspace directory
    project_dir = settings.workspace_dir / project.directory
    if project_dir.exists():
        shutil.rmtree(project_dir)

    await db.delete(project)
    await db.flush()


# ------------------------------------------------------------------
# File management (real filesystem operations)
# ------------------------------------------------------------------
class FileContent(BaseModel):
    path: str
    content: str = ""


class FileCreate(BaseModel):
    path: str = Field(..., min_length=1)


class FileRun(BaseModel):
    path: str


def _get_project_dir(project_id: int) -> Path:
    """Resolve the workspace directory for a project. Must be used within a DB session."""
    return settings.workspace_dir


@router.get("/{project_id}/files")
async def list_files(project_id: int, db: AsyncSession = Depends(get_db)):
    """List all files in a project's workspace directory."""
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project_dir = settings.workspace_dir / project.directory
    if not project_dir.exists():
        return []

    files = []
    for p in sorted(project_dir.rglob("*")):
        if p.is_file() and ".git" not in p.parts:
            rel = p.relative_to(project_dir)
            files.append({
                "path": str(rel),
                "name": p.name,
                "type": "file",
                "size": p.stat().st_size,
            })

    return files


@router.get("/{project_id}/files/content")
async def read_file(
    project_id: int,
    path: str = Query(..., description="Relative path to the file"),
    db: AsyncSession = Depends(get_db),
):
    """Read the content of a file in the project workspace."""
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project_dir = settings.workspace_dir / project.directory
    file_path = (project_dir / path).resolve()

    # Security: ensure the file is within the project directory
    if not str(file_path).startswith(str(project_dir.resolve())):
        raise HTTPException(status_code=403, detail="Path traversal denied.")

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    content = file_path.read_text(encoding="utf-8")
    return {"path": path, "content": content}


@router.put("/{project_id}/files/content")
async def write_file(
    project_id: int,
    data: FileContent,
    db: AsyncSession = Depends(get_db),
):
    """Write content to a file in the project workspace."""
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project_dir = settings.workspace_dir / project.directory
    file_path = (project_dir / data.path).resolve()

    # Security check
    if not str(file_path).startswith(str(project_dir.resolve())):
        raise HTTPException(status_code=403, detail="Path traversal denied.")

    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(data.content, encoding="utf-8")
    return {"path": data.path, "saved": True}


@router.post("/{project_id}/files")
async def create_file(
    project_id: int,
    data: FileCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new empty file in the project workspace."""
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project_dir = settings.workspace_dir / project.directory
    file_path = (project_dir / data.path).resolve()

    # Security check
    if not str(file_path).startswith(str(project_dir.resolve())):
        raise HTTPException(status_code=403, detail="Path traversal denied.")

    if file_path.exists():
        raise HTTPException(status_code=409, detail="File already exists.")

    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.touch()
    return {"path": data.path, "created": True}


@router.delete("/{project_id}/files")
async def delete_file(
    project_id: int,
    path: str = Query(..., description="Relative path to the file"),
    db: AsyncSession = Depends(get_db),
):
    """Delete a file from the project workspace."""
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project_dir = settings.workspace_dir / project.directory
    file_path = (project_dir / path).resolve()

    # Security check
    if not str(file_path).startswith(str(project_dir.resolve())):
        raise HTTPException(status_code=403, detail="Path traversal denied.")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    file_path.unlink()
    return {"path": path, "deleted": True}


# ------------------------------------------------------------------
# Code execution
# ------------------------------------------------------------------
@router.post("/{project_id}/run")
async def run_file(
    project_id: int,
    data: FileRun,
    db: AsyncSession = Depends(get_db),
):
    """Execute a Python file in the project workspace and return its output.

    Runs with a 15-second timeout. Only .py files are executed.
    Standard output and standard error are both captured.
    """
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project_dir = settings.workspace_dir / project.directory
    file_path = (project_dir / data.path).resolve()

    # Security checks
    if not str(file_path).startswith(str(project_dir.resolve())):
        raise HTTPException(status_code=403, detail="Path traversal denied.")
    if not file_path.suffix == ".py":
        raise HTTPException(status_code=400, detail="Only Python files can be executed.")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        proc = subprocess.run(
            ["python3", str(file_path)],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(project_dir),
        )
        return {
            "output": proc.stdout,
            "error": proc.stderr,
            "exit_code": proc.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"output": "", "error": "Execution timed out (15 second limit).", "exit_code": -1}
    except FileNotFoundError:
        return {"output": "", "error": "Python3 not found. Is Python installed?", "exit_code": -1}


# ---------------------------------------------------------------------------
# Static file serving (Phase 4 — live preview)
# ---------------------------------------------------------------------------
from fastapi.responses import FileResponse, HTMLResponse
from urllib.parse import unquote


@router.get("/{project_id}/serve/{file_path:path}")
async def serve_project_file(
    project_id: int,
    file_path: str,
    db: AsyncSession = Depends(get_db),
):
    """Serve a project file as static content for in-browser preview.

    HTML/CSS/JS files in the project workspace are served directly,
    enabling iframe-based live preview with relative links between files.
    """
    result = await db.execute(
        select(LearningProject).where(LearningProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project_dir = (settings.workspace_dir / project.directory).resolve()
    requested = (project_dir / unquote(file_path)).resolve()

    # Security: prevent path traversal
    if not str(requested).startswith(str(project_dir)):
        raise HTTPException(status_code=403, detail="Path traversal denied.")
    if not requested.exists() or not requested.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    # Determine media type for proper rendering
    ext = requested.suffix.lower()
    media_types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".woff2": "font/woff2",
    }

    return FileResponse(
        str(requested),
        media_type=media_types.get(ext, "text/plain"),
    )


# ---------------------------------------------------------------------------
# Comparison endpoints (Phase 3)
# ---------------------------------------------------------------------------
@router.get("/compare/{id_a}/{id_b}")
async def compare_projects(
    id_a: int, id_b: int, db: AsyncSession = Depends(get_db)
):
    """Compare two projects side by side — file structure, concepts, patterns."""
    from app.services.project_comparator import compare_projects as cp

    try:
        return await cp(db, id_a, id_b)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
