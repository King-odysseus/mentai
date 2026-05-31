"""Cognitive1 integration — bridges MentAi to the Cognitive1 brain daemon.

Cognitive1 is the memory layer. It persists:
- Learning history (concepts exposed, mastery changes)
- Session logs (when the learner studied, for how long, what was covered)
- Bugs/discoveries (student misunderstandings, teaching patterns)
- Pattern recognition (design patterns the learner encounters)

Communication is via HTTP to the Cognitive1 daemon at localhost:9876.
If the daemon is unavailable, MentAi degrades gracefully — the brain is
a supplement, not a hard dependency.
"""

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class Cognitive1Client:
    """HTTP client for Cognitive1 MCP brain daemon."""

    def __init__(self):
        self.base_url = settings.cognitive1_url
        self.enabled = settings.cognitive1_enabled
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(10.0),
            )
        return self._client

    async def _post(self, tool: str, params: dict) -> dict | None:
        """Call a Cognitive1 MCP tool via HTTP. Returns None on failure."""
        if not self.enabled:
            return None
        try:
            client = await self._get_client()
            # Cognitive1 MCP HTTP transport uses JSON-RPC
            payload = {
                "jsonrpc": "2.0",
                "method": "tools/call",
                "params": {"name": tool, "arguments": params},
                "id": 1,
            }
            resp = await client.post("/mcp", json=payload)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.debug("Cognitive1 call '%s' failed: %s", tool, exc)
            return None

    # ------------------------------------------------------------------
    # Brain operations MentAi cares about
    # ------------------------------------------------------------------
    async def learn_concept_exposed(
        self, concept_title: str, mastery: str, project_name: str
    ) -> None:
        """Record that a concept was introduced during tutoring."""
        await self._post("brain_learn", {
            "type": "patterns",
            "project": "MentAi",
            "title": f"Learner encountered: {concept_title} ({mastery})",
            "how": f"Concept '{concept_title}' was covered during a session in project '{project_name}'. Mastery: {mastery}.",
            "tags": f"concept:{concept_title},project:{project_name},mastery:{mastery}",
            "force": True,
        })

    async def learn_bug_discovered(
        self, bug_description: str, fix_description: str, concept: str
    ) -> None:
        """Record a student misunderstanding or bug discovered."""
        await self._post("brain_learn", {
            "type": "bugs",
            "project": "MentAi",
            "title": f"Student confusion: {bug_description[:80]}",
            "bug": bug_description,
            "fix": fix_description,
            "cause": f"Related concept: {concept}",
            "tags": f"teaching,student-bug,{concept}",
            "force": True,
        })

    async def log_session(
        self, project_name: str, mode: str, duration_minutes: int, concepts_covered: int
    ) -> None:
        """Log a completed learning session to Cognitive1."""
        await self._post("brain_learn", {
            "type": "patterns",
            "project": "MentAi",
            "title": f"Session: {mode} session in {project_name} ({duration_minutes}min)",
            "how": (
                f"Learning session completed. Mode: {mode}, Duration: {duration_minutes}min, "
                f"Concepts covered: {concepts_covered}. Project: {project_name}."
            ),
            "tags": f"session,{mode},project:{project_name}",
            "force": True,
        })

    async def log_cost(
        self, model: str, input_tokens: int, output_tokens: int, operation: str
    ) -> None:
        """Track API token usage for cost visibility."""
        await self._post("cost_log", {
            "project": "MentAi",
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "operation": operation,
        })

    # ------------------------------------------------------------------
    # Agent coordination methods (Phase 3 — multi-agent tutoring)
    # ------------------------------------------------------------------
    async def search_memory(
        self, query: str, max_results: int = 5
    ) -> list[dict]:
        """Search Cognitive1 brain for teaching-related memories."""
        result = await self._post("brain_recall", {
            "query": query,
            "project": "MentAi",
            "max_results": max_results,
            "mode": "semantic",
            "format": "json",
        })
        return self._extract_content(result) or []

    async def get_suggestions(self) -> list[dict]:
        """Ask Cognitive1 for suggestions on what to teach next."""
        result = await self._post("suggest", {"project": "MentAi"})
        return self._extract_content(result) or []

    async def save_checkpoint(self, what: str, files: str = "") -> None:
        """Save a mid-tutoring checkpoint in case of interruption."""
        await self._post("checkpoint", {
            "project": "MentAi",
            "what": what,
            "files": files,
        })

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _extract_content(result: dict | None) -> list[dict] | None:
        """Extract content array from a JSON-RPC response.

        Cognitive1 MCP returns: {"result": {"content": [{"type": "text", "text": "..."}]}}
        The text may itself be JSON.
        """
        import json as _json

        if not result:
            return None
        try:
            content = result.get("result", {}).get("content", [])
            if not content:
                return None
            text = content[0].get("text", "[]")
            return _json.loads(text)
        except Exception:
            return None


# Singleton
cognitive1 = Cognitive1Client()
