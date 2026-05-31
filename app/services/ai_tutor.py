"""AI Tutor service — interfaces with DeepSeek API for tutoring responses.

Constructs rich prompts that include:
- Current project context (tech stack, file structure, recent work)
- Roadmap/curriculum position (what concept is next)
- Learner's concept mastery state (what they know, what they struggle with)
- Session time mode (micro vs deep — affects response depth)
- Conversation history

Responses are streamed word-by-word via async generators for WebSocket delivery.
"""

import json
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)


class AITutor:
    """Manages DeepSeek API calls for AI tutoring.

    Can be instantiated with a specific persona (e.g. Python specialist)
    or used as the default general Mentor.
    """

    def __init__(
        self,
        persona_name: str | None = None,
        persona_prompt: str | None = None,
    ):
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
        self.model = settings.deepseek_model
        self.persona_name = persona_name
        self.persona_prompt = persona_prompt

    @property
    def base_system_prompt(self) -> str:
        """The base system prompt — uses persona prompt if set, otherwise default."""
        base = self.persona_prompt or settings.tutor_system_prompt
        return base.replace("{learner_name}", settings.learner_name)

    # ------------------------------------------------------------------
    # Prompt construction
    # ------------------------------------------------------------------
    def build_system_prompt(
        self,
        project_context: dict | None = None,
        curriculum_context: list[dict] | None = None,
        mastery_context: list[dict] | None = None,
        session_mode: str = "micro",
        user_message: str | None = None,
    ) -> str:
        """Build the system prompt with all available context layers."""

        parts = [self.base_system_prompt]

        # Session time awareness — tune response depth
        name = settings.learner_name
        if session_mode == "micro":
            parts.append(
                f"{name} has only 5-15 minutes right now. Keep responses concise, "
                "focused on one concept at a time. Avoid long code examples — use short snippets. "
                "End each response with a specific next step or small challenge."
            )
        else:
            parts.append(
                f"{name} has 30+ minutes for a deep session. Take time to explain concepts "
                "thoroughly. Use realistic code examples. Encourage building and experimentation. "
                "Ask probing questions to deepen understanding."
            )

        # Code review mode — add structured review instructions
        if user_message and "Please review the following code" in user_message:
            parts.append(
                "\n## Code Review Mode\n"
                "You are reviewing the learner's code. Structure your review as:\n"
                "1. **What's Good** — highlight what they did well (be specific)\n"
                "2. **Suggestions** — actionable improvements tied to roadmap concepts\n"
                "3. **Patterns Spotted** — name any design patterns or idioms you see\n"
                "4. **Next Step** — a small challenge or refactor to try\n\n"
                "Be encouraging. This is a teaching moment, not a grading exercise. "
                "Connect your feedback to the curriculum concepts they are learning."
            )

        # Current project context
        if project_context:
            parts.append(
                f"\n## Current Project\n"
                f"Name: {project_context.get('name', 'Unknown')}\n"
                f"Tech stack: {project_context.get('tech_stack', 'Not specified')}\n"
                f"Description: {project_context.get('description', 'No description')}\n"
            )

        # Curriculum position — what concept is next in the roadmap
        if curriculum_context:
            concepts_text = "\n".join(
                f"- {c['title']} ({c.get('difficulty', 'unknown')}): {c.get('description', '')}"
                for c in curriculum_context[:5]
            )
            parts.append(
                f"\n## Current Curriculum Position\n"
                f"The next concepts in the roadmap are:\n{concepts_text}\n"
                f"Weave these into the project work naturally when the learner is ready."
            )

        # Concept mastery state
        if mastery_context:
            mastery_lines = []
            for m in mastery_context:
                emoji = {"introduced": "🌱", "practiced": "🌿", "confident": "🪴", "mastered": "🌳"}
                icon = emoji.get(m.get("mastery", "introduced"), "🌱")
                mastery_lines.append(
                    f"- {icon} **{m.get('concept_title', 'Unknown')}**: {m.get('mastery', 'introduced')} "
                    f"(encountered {m.get('encounter_count', 0)}x)"
                )
            if mastery_lines:
                parts.append(
                    f"\n## Learner's Concept Mastery\n" + "\n".join(mastery_lines) + "\n"
                    "Build on what they know. Review concepts they've only seen once or twice. "
                    "Challenge them on concepts they are confident in."
                )

        return "\n".join(parts)

    # ------------------------------------------------------------------
    # Streaming chat — the core tutor interaction
    # ------------------------------------------------------------------
    async def stream_response(
        self,
        user_message: str,
        conversation_history: list[dict] | None = None,
        project_context: dict | None = None,
        curriculum_context: list[dict] | None = None,
        mastery_context: list[dict] | None = None,
        session_mode: str = "micro",
    ) -> AsyncGenerator[str, None]:
        """Stream tutor response as text deltas.

        Yields each chunk of the response as it arrives from DeepSeek.
        The caller (WebSocket handler) sends these to the frontend.
        """
        system_prompt = self.build_system_prompt(
            project_context=project_context,
            curriculum_context=curriculum_context,
            mastery_context=mastery_context,
            session_mode=session_mode,
            user_message=user_message,
        )

        messages = [{"role": "system", "content": system_prompt}]

        # Include conversation history (last 20 messages to stay within context)
        if conversation_history:
            messages.extend(conversation_history[-20:])

        # Add the new user message
        messages.append({"role": "user", "content": user_message})

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=1024 if session_mode == "micro" else 2048,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content

        except Exception as exc:
            logger.error("DeepSeek API error: %s", exc)
            yield json.dumps({"error": str(exc)})

    # ------------------------------------------------------------------
    # Concept extraction — identify which concepts were covered
    # ------------------------------------------------------------------
    async def extract_concepts(
        self, tutor_response: str, available_concepts: list[dict]
    ) -> list[dict]:
        """After a tutor response, identify which roadmap concepts were covered.

        Uses a lightweight DeepSeek call to classify the response against
        known curriculum concepts. Returns matched concepts with confidence.
        """
        if not available_concepts:
            return []

        concepts_list = "\n".join(
            f"- {c['title']}: {c.get('description', '')}" for c in available_concepts
        )

        prompt = (
            "Given the following tutor response and list of curriculum concepts, "
            "identify which concepts were covered in the response. Return a JSON array "
            "with objects: {title, confidence (0.0-1.0)}. Only include concepts that "
            "were actually discussed.\n\n"
            f"## Tutor Response\n{tutor_response[:2000]}\n\n"
            f"## Available Concepts\n{concepts_list}"
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500,
            )
            content = response.choices[0].message.content
            return json.loads(content) if content else []
        except Exception:
            return []


# Default singleton — the general Mentor (used when no orchestrator)
ai_tutor = AITutor()
