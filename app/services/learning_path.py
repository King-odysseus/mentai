"""Learning path generator — uses AI to create personalized project curricula.

Replaces the static SEED_CURRICULUM system. The AI analyzes the learner's
profile, the project description, and tech stack to generate a tailored
sequence of modules and concepts.
"""

import json
import logging

from app.config import settings
from app.services.ai_tutor import AITutor

logger = logging.getLogger(__name__)

# Lightweight AI client for path generation (not streaming, structured output)
_path_tutor = AITutor()


async def generate_learning_path(
    project_name: str,
    project_description: str | None,
    tech_stack: str | None,
    user_profile: dict | None = None,
) -> list[dict]:
    """Generate a personalized learning path for a project.

    Returns a list of modules, each with a list of concepts.
    Format: [{"title": "...", "description": "...", "concepts": [...]}]
    """
    profile_text = _format_profile(user_profile) if user_profile else ""

    prompt = f"""You are creating a personalized learning path for a coding student.

Project: "{project_name}"
Description: {project_description or "Not specified"}
Tech stack: {tech_stack or "Not specified"}
{profile_text}

Generate 4-6 learning modules, each with 3-5 specific concepts.
Modules should build on each other in a logical progression.
Each concept should be something the student can learn by writing actual code.

Return ONLY valid JSON — no explanation, no markdown. Use this exact format:
[
  {{
    "title": "Module Name",
    "description": "What this module covers",
    "concepts": [
      {{"title": "Concept Name", "description": "What to learn and practice"}}
    ]
  }}
]"""

    try:
        response = await _path_tutor.client.chat.completions.create(
            model=settings.deepseek_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000,
        )
        content = response.choices[0].message.content or "[]"
        # Strip markdown code fences if present
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        path = json.loads(content)
        logger.info("Generated learning path for '%s': %d modules.", project_name, len(path))
        return path
    except Exception as exc:
        logger.error("Failed to generate learning path: %s", exc)
        # Fallback: return a minimal default path
        return [
            {
                "title": "Getting Started",
                "description": f"Set up the {project_name} project",
                "concepts": [
                    {"title": "Project setup", "description": "Initialize the project structure"},
                    {"title": "Core functionality", "description": "Build the main feature"},
                ],
            }
        ]


def _format_profile(profile: dict) -> str:
    """Format a user profile dict into prompt text."""
    levels = []
    for skill in ["python_level", "javascript_level", "html_css_level", "database_level", "git_level"]:
        val = profile.get(skill, "beginner")
        if val and val != "beginner":
            label = skill.replace("_level", "").replace("_", " ").title()
            levels.append(f"  {label}: {val}")

    prefs = []
    for pref in ["preferred_backend", "preferred_frontend", "preferred_database"]:
        val = profile.get(pref)
        if val:
            label = pref.replace("preferred_", "").replace("_", " ").title()
            prefs.append(f"  {label}: {val}")

    parts = []
    if levels:
        parts.append("Student experience:\n" + "\n".join(levels))
    if prefs:
        parts.append("Preferred stack:\n" + "\n".join(prefs))
    if profile.get("learning_goal"):
        parts.append(f"Learning goal: {profile['learning_goal']}")
    if profile.get("time_per_week"):
        parts.append(f"Time per week: {profile['time_per_week']}")

    return "\n".join(parts)
