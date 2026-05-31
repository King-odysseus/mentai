"""Tutor Orchestrator — routes learner messages to specialist AI tutors.

Maintains multiple AITutor instances, each with a distinct specialization
(Python, Database, Frontend, General). Routes incoming messages to the
best-matching specialist based on keyword scoring.

The orchestrator replaces direct ai_tutor usage in chat.py for
multi-agent Phase 3.
"""

import logging

from app.config import settings
from app.services.ai_tutor import AITutor

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Specialist persona definitions
# ---------------------------------------------------------------------------
TUTOR_SPECIALIZATIONS: dict[str, dict] = {
    "python": {
        "name": "PyMentor",
        "prompt": (
            "You are PyMentor, a Python specialist and patient teacher. "
            "You excel at Python syntax, FastAPI, pytest, SQLAlchemy, async "
            "programming, type hints, Pydantic, and Pythonic idioms. "
            f"You guide {settings.learner_name} through Python concepts with "
            "clear explanations and practical code examples. "
            "When discussing Python topics, go deep — explain the why, not just the how. "
            "Reference PEPs and Python design philosophy when relevant."
        ),
        "keywords": [
            "python", "fastapi", "flask", "django", "pytest", "sqlalchemy",
            "async", "await", "decorator", "pydantic", "uvicorn", "pip",
            "type hint", "generator", "context manager", "list comprehension",
            "virtualenv", "venv", "poetry", "wheel", "setuptools",
        ],
    },
    "database": {
        "name": "DataMentor",
        "prompt": (
            "You are DataMentor, a database specialist and patient teacher. "
            "You excel at SQL, PostgreSQL, SQLite, database design, migrations, "
            "ORMs, indexing strategies, and query optimization. "
            f"You guide {settings.learner_name} through data concepts with "
            "clear explanations and practical examples. "
            "Explain normalization, joins, and indexing as if telling a story. "
            "Connect database concepts back to the application layer."
        ),
        "keywords": [
            "sql", "database", "postgres", "postgresql", "sqlite", "orm",
            "migration", "query", "index", "schema", "table", "join",
            "transaction", "acid", "normalization", "foreign key",
            "primary key", "alembic", "select", "insert", "update",
        ],
    },
    "frontend": {
        "name": "UIMentor",
        "prompt": (
            "You are UIMentor, a frontend specialist and patient teacher. "
            "You excel at HTML, CSS, JavaScript, React, DOM manipulation, "
            "responsive design, accessibility, and UI patterns. "
            f"You guide {settings.learner_name} through frontend concepts with "
            "clear explanations and visual mental models. "
            "Focus on practical, vanilla approaches before introducing frameworks. "
            "Emphasize semantic HTML, CSS custom properties, and progressive enhancement."
        ),
        "keywords": [
            "html", "css", "javascript", "js", "react", "dom", "component",
            "style", "layout", "responsive", "browser", "event", "ui",
            "frontend", "flexbox", "grid", "ajax", "fetch", "api call",
            "markup", "selector", "animation", "transition",
        ],
    },
    "general": {
        "name": "Mentor",
        "prompt": settings.tutor_system_prompt.replace(
            "{learner_name}", settings.learner_name
        ),
        "keywords": [],
    },
}


class TutorOrchestrator:
    """Routes messages to specialist AITutor instances.

    Each specialist has its own system prompt and keyword set.
    Messages are scored against all specialists; the highest-scoring
    specialist handles the response. Falls back to 'general' Mentor.
    """

    def __init__(self):
        self.tutors: dict[str, AITutor] = {}
        for key, spec in TUTOR_SPECIALIZATIONS.items():
            self.tutors[key] = AITutor(
                persona_name=spec["name"],
                persona_prompt=spec["prompt"],
            )

    def route(
        self,
        message: str,
        curriculum_context: list[dict] | None = None,
    ) -> str:
        """Score each specialist against the message and return the best match.

        Scoring: each keyword match adds 1 point. The specialist with the
        highest score wins. If tied or all zero, returns 'general'.
        """
        msg_lower = message.lower()

        # Also pull keywords from curriculum concepts currently in view
        curriculum_keywords = set()
        if curriculum_context:
            for cc in curriculum_context:
                if cc.get("title"):
                    curriculum_keywords.update(
                        cc["title"].lower().split()
                    )

        scores: dict[str, int] = {}
        for key, spec in TUTOR_SPECIALIZATIONS.items():
            score = 0
            for kw in spec.get("keywords", []):
                if kw in msg_lower:
                    score += 1
            # Bonus: curriculum context terms match specialist keywords
            for ck in curriculum_keywords:
                if ck in spec.get("keywords", []):
                    score += 0.5
            scores[key] = score

        # Pick the winner
        best = max(scores, key=lambda k: scores[k])
        if scores[best] == 0:
            return "general"

        logger.debug(
            "Routed to '%s' (scores: %s)", best, scores,
        )
        return best

    def get_tutor(self, specialization: str) -> AITutor:
        """Get the AITutor instance for a specialization. Falls back to general."""
        return self.tutors.get(specialization, self.tutors["general"])

    def get_specialist_name(self, specialization: str) -> str:
        """Get the display name for a specialist."""
        spec = TUTOR_SPECIALIZATIONS.get(specialization, TUTOR_SPECIALIZATIONS["general"])
        return spec["name"]

    async def stream_response(
        self,
        specialization: str,
        user_message: str,
        conversation_history: list[dict] | None = None,
        project_context: dict | None = None,
        curriculum_context: list[dict] | None = None,
        mastery_context: list[dict] | None = None,
        session_mode: str = "micro",
    ):
        """Stream a response from the selected specialist tutor."""
        tutor = self.get_tutor(specialization)
        async for delta in tutor.stream_response(
            user_message=user_message,
            conversation_history=conversation_history,
            project_context=project_context,
            curriculum_context=curriculum_context,
            mastery_context=mastery_context,
            session_mode=session_mode,
        ):
            yield delta

    async def extract_concepts(
        self,
        specialization: str,
        tutor_response: str,
        available_concepts: list[dict],
    ) -> list[dict]:
        """Extract concepts using the selected specialist."""
        tutor = self.get_tutor(specialization)
        return await tutor.extract_concepts(tutor_response, available_concepts)


# Singleton
orchestrator = TutorOrchestrator()
