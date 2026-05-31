"""MentAi FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import settings


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    data_dir = settings.project_root / "data"
    data_dir.mkdir(exist_ok=True)
    settings.workspace_dir.mkdir(exist_ok=True)
    (settings.workspace_dir / ".gitkeep").touch(exist_ok=True)

    from app.storage.db import create_tables
    await create_tables()

    yield


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

static_dir = settings.static_dir
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

templates = Jinja2Templates(directory=str(settings.templates_dir))


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Dashboard — or redirect to onboarding if no profile exists."""
    from app.storage.db import async_session
    from app.models.user_profile import UserProfile
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(select(UserProfile).limit(1))
        profile = result.scalars().first()

    if not profile or not profile.onboarding_complete:
        return RedirectResponse(url="/onboarding")

    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "learner_name": profile.display_name},
    )


@app.get("/onboarding", response_class=HTMLResponse)
async def onboarding(request: Request):
    """Account creation — name, experience, stack preferences."""
    return templates.TemplateResponse(
        "onboarding.html",
        {"request": request},
    )


@app.get("/workspace/{project_id}", response_class=HTMLResponse)
async def workspace(request: Request, project_id: int):
    """Three-panel learning workspace."""
    return templates.TemplateResponse(
        "workspace.html",
        {"request": request, "project_id": project_id},
    )


# ---------------------------------------------------------------------------
# API routers
# ---------------------------------------------------------------------------
from app.routers import projects, concepts, dashboard as dash_api, patterns, goals, profile

app.include_router(dash_api.router, prefix="/api", tags=["dashboard"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(concepts.router, prefix="/api/concepts", tags=["concepts"])
app.include_router(patterns.router, prefix="/api/patterns", tags=["patterns"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])

# WebSocket
from app.routers.chat import router as chat_router

app.include_router(chat_router, prefix="/ws", tags=["chat"])


# Health check
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }
