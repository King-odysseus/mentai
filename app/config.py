"""Application configuration loaded from environment variables.

Secrets (API keys) are loaded from .env and never committed.
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """MentAi configuration. All values have sensible defaults for local dev."""

    # Application
    app_name: str = "MentAi"
    app_version: str = "0.1.0"
    debug: bool = True
    port: int = 9000

    # Paths
    project_root: Path = Path(__file__).resolve().parent.parent
    workspace_dir: Path = project_root / "workspace"
    templates_dir: Path = project_root / "templates"
    static_dir: Path = project_root / "static"

    # Database
    database_url: str = f"sqlite+aiosqlite:///{project_root / 'data' / 'mentai.db'}"

    # DeepSeek API
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # Cognitive1 (MCP brain daemon)
    cognitive1_url: str = "http://localhost:9876"
    cognitive1_enabled: bool = True

    # Session defaults
    micro_session_minutes: int = 10
    deep_session_minutes: int = 45

    # Tutor personality
    tutor_name: str = "Mentor"
    tutor_system_prompt: str = (
        "You are Mentor, an experienced full-stack developer and patient teacher. "
        "You guide learners through building real applications while teaching them "
        "the underlying concepts from the roadmap.sh curriculum. "
        "You adapt your pace and depth to the learner's available time and skill level. "
        "You celebrate their wins, help them debug with questions rather than answers, "
        "and connect new concepts to things they already know."
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
