"""Live curriculum importers — fetch and merge structured data from external sources.

Sources:
- freeCodeCamp: Clean JSON hierarchy from GitHub raw (SuperBlock→Chapter→Module→Block)
- roadmap.sh: Graph JSON from GitHub raw (nodes+edges) — hierarchy by edge-walking
- The Odin Project: Basic directory-level import from GitHub raw

All importers use GitHub raw URLs — no browser scraping needed.
Merge is idempotent: existing modules/concepts are updated, new ones created.
"""

import json
import logging
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.concept import CurriculumModule, Concept

logger = logging.getLogger(__name__)

# Shared HTTP client with timeout and user agent
_CLIENT_CONFIG = {
    "timeout": httpx.Timeout(30.0),
    "headers": {"User-Agent": "MentAi/0.2", "Accept": "application/vnd.github.v3.raw"},
}


# ---------------------------------------------------------------------------
# Merge helpers — idempotent upsert
# ---------------------------------------------------------------------------
async def _upsert_module(
    db: AsyncSession, title: str, description: str | None,
    source: str, order_index: int,
) -> tuple[CurriculumModule, bool]:
    """Find existing module by title+source or create new. Returns (module, created)."""
    result = await db.execute(
        select(CurriculumModule).where(
            CurriculumModule.title == title,
            CurriculumModule.source == source,
        )
    )
    existing = result.scalars().first()
    if existing:
        if description and existing.description != description:
            existing.description = description
        return existing, False

    module = CurriculumModule(
        title=title,
        description=description,
        source=source,
        order_index=order_index,
    )
    db.add(module)
    return module, True


async def _upsert_concept(
    db: AsyncSession, module_id: int, title: str,
    description: str | None, difficulty: str = "foundational",
) -> tuple[Concept, bool]:
    """Find existing concept by title+module or create new. Returns (concept, created)."""
    result = await db.execute(
        select(Concept).where(
            Concept.title == title,
            Concept.module_id == module_id,
        )
    )
    existing = result.scalars().first()
    if existing:
        if description and existing.description != description:
            existing.description = description
        return existing, False

    concept = Concept(
        module_id=module_id,
        title=title,
        description=description,
        difficulty=difficulty,
    )
    db.add(concept)
    return concept, True


# ---------------------------------------------------------------------------
# freeCodeCamp Importer
# ---------------------------------------------------------------------------
class FreeCodeCampImporter:
    """Imports freeCodeCamp curriculum from GitHub raw JSON.

    Hierarchy: SuperBlock → Chapter → Module → Block → Challenges
    We map: Module = Chapter, Concept = Module+Block combo.
    """

    BASE = "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main"

    async def _fetch_json(self, path: str) -> dict | list | None:
        """Fetch JSON from the freeCodeCamp repo."""
        url = f"{self.BASE}/{path}"
        try:
            async with httpx.AsyncClient(**_CLIENT_CONFIG) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:
            logger.debug("freeCodeCamp fetch failed for %s: %s", path, exc)
            return None

    async def _resolve_superblock_files(self) -> dict[str, str]:
        """Map superblock names to JSON filenames by listing the directory.

        Filenames have version suffixes (e.g. responsive-web-design-v9.json)
        that don't match the index names (responsive-web-design).
        """
        url = "https://api.github.com/repos/freeCodeCamp/freeCodeCamp/contents/curriculum/structure/superblocks"
        try:
            async with httpx.AsyncClient(**_CLIENT_CONFIG) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                files = resp.json()
                return {f["name"].removesuffix(".json"): f["name"] for f in files}
        except Exception as exc:
            logger.warning("Failed to list superblock files: %s", exc)
            return {}

    async def import_all(self, db: AsyncSession) -> dict:
        """Import all freeCodeCamp curriculum. Returns stats."""
        stats = {"source": "freeCodeCamp", "modules_created": 0, "concepts_created": 0}

        # Step 1: Get superblock list from index
        index = await self._fetch_json("curriculum/structure/curriculum.json")
        if not index:
            return {**stats, "error": "Failed to fetch curriculum index"}

        superblock_names = index.get("superblocks", index.get("certifications", []))

        # Step 2: Resolve filenames
        file_map = await self._resolve_superblock_files()

        order = 0
        for sb_name in superblock_names:
            if not isinstance(sb_name, str):
                continue

            # Resolve filename — try exact, then -v9, -22, any match
            sb_file = None
            for candidate in [sb_name, f"{sb_name}-v9", f"{sb_name}-22"]:
                if candidate in file_map:
                    sb_file = file_map[candidate]
                    break
            if not sb_file:
                # Try partial match
                for key in file_map:
                    if key.startswith(sb_name) and not key.startswith(sb_name + "-intro"):
                        sb_file = file_map[key]
                        break
            if not sb_file:
                continue

            sb_data = await self._fetch_json(
                f"curriculum/structure/superblocks/{sb_file}"
            )
            if not sb_data:
                continue

            chapters = sb_data.get("chapters", [])
            for chapter in chapters:
                ch_name = chapter.get("dashedName", "unknown-chapter")
                ch_title = ch_name.replace("-", " ").title()

                module, mod_created = await _upsert_module(
                    db, f"fCC: {ch_title}",
                    f"freeCodeCamp chapter from {sb_name}",
                    "freeCodeCamp", order,
                )
                if mod_created:
                    stats["modules_created"] += 1
                order += 1
                await db.flush()

                for mod in chapter.get("modules", []):
                    if mod.get("comingSoon") or mod.get("moduleType") == "exam":
                        continue
                    mod_name = mod.get("dashedName", "unknown-module")
                    mod_title = mod_name.replace("-", " ").title()

                    concept, c_created = await _upsert_concept(
                        db, module.id, mod_title,
                        f"freeCodeCamp module from {sb_name}",
                        "foundational",
                    )
                    if c_created:
                        stats["concepts_created"] += 1

            await db.flush()

        logger.info(
            "freeCodeCamp import: %d modules, %d concepts.",
            stats["modules_created"], stats["concepts_created"],
        )
        return stats


# ---------------------------------------------------------------------------
# roadmap.sh Importer
# ---------------------------------------------------------------------------
class RoadmapShImporter:
    """Imports roadmap.sh data from GitHub API (content endpoint).

    Data is graph-based: nodes (topics) connected by edges (dependencies).
    We walk edges from root nodes to build a topic tree.
    Module = roadmap, Concept = topic node.
    """

    # GitHub API content endpoint with raw accept header
    BASE = "https://api.github.com/repos/kamranahmedse/developer-roadmap/contents"

    # Core roadmaps — small set to stay within rate limits
    ROADMAPS = ["frontend", "backend", "python", "javascript", "react"]

    async def _fetch_json(self, path: str) -> dict | None:
        """Fetch JSON from the developer-roadmap repo via GitHub API.

        Uses the raw media type to get file content directly (no base64).
        """
        url = f"{self.BASE}/{path}"
        headers = {
            **_CLIENT_CONFIG.get("headers", {}),
            "Accept": "application/vnd.github.v3.raw",
        }
        try:
            async with httpx.AsyncClient(timeout=_CLIENT_CONFIG["timeout"]) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 403:
                    logger.debug("Rate limited for roadmap.sh: %s", path)
                    return None
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:
            logger.debug("roadmap.sh fetch failed for %s: %s", path, exc)
            return None

    def _build_topic_tree(
        self, nodes: list[dict], edges: list[dict]
    ) -> list[dict]:
        """Build a topic tree from graph nodes and edges.

        Root nodes are those with no incoming edges that are actual topics.
        Children are found by following outgoing edges.
        """
        if not nodes:
            return []

        # Index nodes by ID
        node_map: dict[str, dict] = {n["id"]: n for n in nodes}

        # Track which nodes have incoming edges
        has_incoming: set[str] = set()
        children_map: dict[str, list[str]] = {}
        for edge in edges:
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            if src and tgt:
                has_incoming.add(tgt)
                children_map.setdefault(src, []).append(tgt)

        # Filter to content nodes only (skip decorative/connector nodes)
        content_types = {"topic", "subtopic", "section", "title"}

        def _extract_topics(root_ids: list[str]) -> list[dict]:
            topics = []
            for nid in root_ids:
                node = node_map.get(nid)
                if not node:
                    continue
                ntype = node.get("type", "")
                if ntype not in content_types and ntype != "paragraph":
                    continue
                label = (node.get("data", {}) or {}).get("label", "")
                if not label or len(label) < 2:
                    continue

                children = children_map.get(nid, [])
                topic = {
                    "title": label,
                    "type": ntype,
                    "children": _extract_topics(children) if children else [],
                }
                topics.append(topic)
            return topics

        # Root nodes: no incoming edges and are content types
        roots = [
            n["id"] for n in nodes
            if n["id"] not in has_incoming and n.get("type") in content_types
        ]
        # If no clear roots found, use all top-level content nodes
        if not roots:
            roots = [
                n["id"] for n in nodes
                if n.get("type") in content_types
            ]

        return _extract_topics(roots)

    async def import_all(self, db: AsyncSession) -> dict:
        """Import all configured roadmaps. Returns stats."""
        import asyncio

        stats = {"source": "roadmap.sh", "modules_created": 0, "concepts_created": 0}

        order = 100  # Start after seeded/fCC modules
        for roadmap_name in self.ROADMAPS:
            # Small delay between fetches to avoid rate limiting
            await asyncio.sleep(0.5)

            data = await self._fetch_json(
                f"src/data/roadmaps/{roadmap_name}/{roadmap_name}.json"
            )
            if not data:
                continue

            nodes = data.get("nodes", data.get("data", {}).get("nodes", []))
            edges = data.get("edges", data.get("data", {}).get("edges", []))

            if not nodes:
                continue

            roadmap_title = roadmap_name.replace("-", " ").title()
            module, mod_created = await _upsert_module(
                db, f"RS: {roadmap_title}",
                f"roadmap.sh {roadmap_name} developer roadmap",
                "roadmap.sh", order,
            )
            if mod_created:
                stats["modules_created"] += 1
            order += 1
            await db.flush()

            # Build topic tree and flatten for concepts
            topics = self._build_topic_tree(nodes, edges)

            def _flatten_topics(topics_list: list[dict], depth: int = 0) -> list[dict]:
                flat = []
                for t in topics_list:
                    flat.append(t)
                    if t.get("children"):
                        flat.extend(_flatten_topics(t["children"], depth + 1))
                return flat

            flat_topics = _flatten_topics(topics)
            # Limit to top 30 concepts per roadmap to avoid bloat
            for topic in flat_topics[:30]:
                difficulty = "foundational"
                if topic.get("type") == "subtopic":
                    difficulty = "intermediate"
                concept, c_created = await _upsert_concept(
                    db, module.id, topic["title"],
                    f"roadmap.sh topic from {roadmap_name} roadmap",
                    difficulty,
                )
                if c_created:
                    stats["concepts_created"] += 1

            await db.flush()

        logger.info(
            "roadmap.sh import: %d modules, %d concepts.",
            stats["modules_created"], stats["concepts_created"],
        )
        return stats


# ---------------------------------------------------------------------------
# The Odin Project Importer
# ---------------------------------------------------------------------------
class OdinProjectImporter:
    """Basic import from The Odin Project GitHub repo.

    Limited — TOP has no structured metadata, only Markdown files in directories.
    We create a Module per course and Concepts per subdirectory/lesson.
    """

    BASE = "https://api.github.com/repos/TheOdinProject/curriculum/contents"

    COURSES = [
        "foundations", "javascript", "ruby", "ruby_on_rails",
        "nodeJS", "react", "advanced_html_css", "databases",
        "git", "getting_hired",
    ]

    async def _fetch_dirs(self, path: str) -> list[dict]:
        """Fetch directory listing from GitHub API."""
        url = f"{self.BASE}/{path}"
        try:
            async with httpx.AsyncClient(**_CLIENT_CONFIG) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                return [item for item in resp.json() if item.get("type") == "dir"]
        except Exception as exc:
            logger.warning("TOP fetch failed for %s: %s", path, exc)
            return []

    async def import_all(self, db: AsyncSession) -> dict:
        """Import TOP course structure. Returns stats."""
        stats = {"source": "The Odin Project", "modules_created": 0, "concepts_created": 0}

        order = 200  # After seeded and fCC modules
        for course_name in self.COURSES:
            course_title = course_name.replace("_", " ").replace("-", " ").title()
            if course_title == "Nodejs":
                course_title = "Node.js"
            elif course_title == "Advanced Html Css":
                course_title = "Advanced HTML & CSS"

            module, mod_created = await _upsert_module(
                db, f"TOP: {course_title}",
                f"The Odin Project course: {course_name}",
                "The Odin Project", order,
            )
            if mod_created:
                stats["modules_created"] += 1
            order += 1
            await db.flush()

            # Fetch subdirectories as concepts
            sections = await self._fetch_dirs(course_name)
            for section in sections[:15]:  # Limit per course
                sec_title = section["name"].replace("_", " ").replace("-", " ").title()
                concept, c_created = await _upsert_concept(
                    db, module.id, sec_title,
                    f"The Odin Project section: {section['name']}",
                    "foundational",
                )
                if c_created:
                    stats["concepts_created"] += 1

            await db.flush()

        logger.info(
            "The Odin Project import: %d modules, %d concepts.",
            stats["modules_created"], stats["concepts_created"],
        )
        return stats


# ---------------------------------------------------------------------------
# Bulk import — run all sources
# ---------------------------------------------------------------------------
async def import_all_sources(db: AsyncSession) -> list[dict]:
    """Run all importers. Returns list of per-source stats."""
    results = []

    for importer_cls, name in [
        (FreeCodeCampImporter, "freeCodeCamp"),
        (RoadmapShImporter, "roadmap.sh"),
        (OdinProjectImporter, "The Odin Project"),
    ]:
        try:
            importer = importer_cls()
            stats = await importer.import_all(db)
            results.append(stats)
        except Exception as exc:
            logger.error("%s import failed: %s", name, exc)
            results.append({"source": name, "error": str(exc)})

    return results
