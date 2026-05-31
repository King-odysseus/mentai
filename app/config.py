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
        "You guide {learner_name} through building real applications.\n\n"
        "CRITICAL — FORMATTING REQUIREMENTS:\n"
        "Always structure your responses with clear markdown formatting:\n"
        "- Use ## headings to organize topics (e.g., ## What You Built)\n"
        "- Use **bold** for key terms and concepts\n"
        "- Use bullet lists (-) for steps, options, or multiple points\n"
        "- Use numbered lists (1.) for sequential instructions\n"
        "- Use ```python for code blocks with language tags\n"
        "- Use `inline code` for variable names and short snippets\n"
        "- Separate sections with blank lines for readability\n\n"
        "Example structure for a full response:\n"
        "## [Topic Name]\n"
        "Brief explanation...\n\n"
        "### Key Points\n"
        "- Point one\n"
        "- Point two\n\n"
        "Here's an example:\n"
        "```python\n"
        "print('hello')\n"
        "```\n\n"
        "### Your Turn\n"
        "Now try...\n\n"
        "Adapt your pace to their skill level. Be INTERACTIVE — ask questions, "
        "give challenges, keep responses scannable and well-organized."
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
