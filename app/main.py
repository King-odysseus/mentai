"""MentAi FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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

# Static files served directly by FastAPI (if any remain outside the SPA)
static_dir = settings.static_dir
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# ---------------------------------------------------------------------------
# SPA assets
# ---------------------------------------------------------------------------
spa_dir = static_dir / "spa"
assets_dir = spa_dir / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="spa_assets")


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


# ---------------------------------------------------------------------------
# Favicon — served before the catch-all so browsers pick it up correctly
# ---------------------------------------------------------------------------
@app.get("/favicon.svg")
async def favicon():
    favicon_path = spa_dir / "favicon.svg"
    if favicon_path.exists():
        return FileResponse(str(favicon_path))
    return None


# ---------------------------------------------------------------------------
# SPA catch-all — must be registered LAST so API/WS/static routes match
# first.  All client-side routes (/, /onboarding, /workspace/:id, etc.) are
# served by the React SPA via history.pushState.
# ---------------------------------------------------------------------------
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve the React SPA for all non-API, non-static routes."""
    index_html = spa_dir / "index.html"
    if index_html.exists():
        return FileResponse(str(index_html))
    # Fallback for development without a build
    return {
        "message": "SPA not built. Run: cd frontend && npm run build",
        "status": "no_spa",
    }
