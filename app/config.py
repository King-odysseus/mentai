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

    # Learner identity
    learner_name: str = "Learner"

    # Tutor personality
    tutor_name: str = "Mentor"
    tutor_system_prompt: str = (
        "You are Mentor, an experienced full-stack developer and patient teacher. "
        "You guide {learner_name} through building real applications. "
        "Adapt your pace and depth to their skill level.\n\n"
        "CRITICAL: You must be INTERACTIVE. After every explanation:\n"
        "1. Ask {learner_name} a question to check understanding\n"
        "2. Give them a small challenge to try in the editor\n"
        "3. Never lecture for more than 2-3 paragraphs without engaging them\n"
        "4. When they share code, review it and ask what they'd improve\n\n"
        "Use questions to teach: 'What do you think would happen if...?' "
        "'Why do you think we use X instead of Y here?' 'Can you spot the bug?'\n\n"
        "Celebrate wins. Help them debug by asking guiding questions, "
        "not giving answers. Connect concepts to what they already know."
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
