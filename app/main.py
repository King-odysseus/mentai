"""MentAi FastAPI application entry point.

Sets up the FastAPI app with lifespan management, static file serving,
Jinja2 templates, and all route/WebSocket registrations.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import settings


# ---------------------------------------------------------------------------
# Lifespan — runs on startup and shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables, ensure workspace exists, seed curriculum and projects."""
    # Ensure data and workspace directories exist
    data_dir = settings.project_root / "data"
    data_dir.mkdir(exist_ok=True)
    settings.workspace_dir.mkdir(exist_ok=True)
    (settings.workspace_dir / ".gitkeep").touch(exist_ok=True)

    # Import here to avoid circular imports
    from app.storage.db import create_tables, async_session
    await create_tables()

    # Seed curriculum and scaffolded projects (idempotent)
    from app.services import curriculum as curriculum_service
    from app.services.project_generator import seed_curriculum_projects

    async with async_session() as db:
        await curriculum_service.seed_curriculum(db)
        await seed_curriculum_projects(db)
        await db.commit()

    yield


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

# Static files (CSS, JS, images)
static_dir = settings.static_dir
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Jinja2 templates
templates = Jinja2Templates(directory=str(settings.templates_dir))


# ---------------------------------------------------------------------------
# Page routes — server-rendered HTML
# ---------------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main dashboard: project overview, progress, goals."""
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "learner_name": settings.learner_name},
    )


@app.get("/workspace/{project_id}", response_class=HTMLResponse)
async def workspace(request: Request, project_id: int):
    """Three-panel learning workspace for a specific project."""
    return templates.TemplateResponse(
        "workspace.html",
        {"request": request, "project_id": project_id},
    )


# ---------------------------------------------------------------------------
# API routers — registered after page routes
# ---------------------------------------------------------------------------
from app.routers import projects, concepts, curriculum, dashboard as dash_api, patterns, goals

app.include_router(dash_api.router, prefix="/api", tags=["dashboard"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(concepts.router, prefix="/api/concepts", tags=["concepts"])
app.include_router(curriculum.router, prefix="/api/curriculum", tags=["curriculum"])
app.include_router(patterns.router, prefix="/api/patterns", tags=["patterns"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])


# ---------------------------------------------------------------------------
# WebSocket — chat endpoint registered directly
# ---------------------------------------------------------------------------
from app.routers.chat import router as chat_router

app.include_router(chat_router, prefix="/ws", tags=["chat"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}
