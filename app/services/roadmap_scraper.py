"""roadmap.sh live scraper — fetches and parses roadmap data.

roadmap.sh renders client-side (React/Next.js). We use a pragmatic approach:
1. Fetch the roadmap page
2. Extract structured data from embedded __NEXT_DATA__ JSON
3. Fall back to HTML topic-node parsing
4. Normalize into our topic tree format

The endpoint is read-only — it returns parsed data for preview.
Full auto-merge into the curriculum DB is deferred until parsing is stable.
"""

import json
import logging

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

ROADMAP_URLS = {
    "backend": "https://roadmap.sh/backend",
    "python": "https://roadmap.sh/python",
    "frontend": "https://roadmap.sh/frontend",
    "full-stack": "https://roadmap.sh/full-stack",
    "devops": "https://roadmap.sh/devops",
}


async def fetch_roadmap_topics(roadmap: str = "backend") -> list[dict]:
    """Fetch and parse a roadmap.sh page.

    Returns a list of {title, description, children: [...]} topic trees.
    """
    url = ROADMAP_URLS.get(roadmap)
    if not url:
        raise ValueError(f"Unknown roadmap: {roadmap}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            url,
            headers={"User-Agent": "MentAi/0.1"},
            follow_redirects=True,
        )
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")

    # Attempt 1: Look for __NEXT_DATA__ or similar embedded JSON
    script_tag = soup.find("script", id="__NEXT_DATA__")
    if script_tag and script_tag.string:
        try:
            data = json.loads(script_tag.string)
            topics = _parse_next_data(data)
            if topics:
                logger.info(
                    "Parsed %d topics from __NEXT_DATA__ for roadmap '%s'.",
                    len(topics), roadmap,
                )
                return topics
        except (json.JSONDecodeError, KeyError) as exc:
            logger.debug("__NEXT_DATA__ parse failed: %s", exc)

    # Attempt 2: Parse visible topic nodes from the rendered structure
    topics = []
    for node in soup.select("[data-type='topic'], [data-group-id], [data-node-id]"):
        title_el = node.select_one("[data-title]") or node
        title = (
            title_el.get("data-title")
            or title_el.get("title")
            or title_el.get_text(strip=True)
        )
        if title and len(title) > 2:
            topics.append({"title": title, "description": "", "children": []})

    if topics:
        logger.info(
            "Parsed %d topics from HTML for roadmap '%s'.", len(topics), roadmap,
        )
    else:
        logger.warning("No topics found for roadmap '%s'.", roadmap)

    return topics


def _parse_next_data(data: dict) -> list[dict]:
    """Extract topics from a Next.js __NEXT_DATA__ payload.

    Best-effort parser that looks for common data shapes in roadmap.sh.
    """
    try:
        props = data.get("props", {}).get("pageProps", {})
        # Common shapes across roadmap.sh versions
        roadmap_data = props.get("roadmap", props.get("data", props))
        nodes = (
            roadmap_data.get("nodes", [])
            or roadmap_data.get("edges", [])
            or roadmap_data.get("topics", [])
        )

        topics = []
        for node in nodes:
            node_data = node.get("data", node)
            label = node_data.get("label", node_data.get("title", ""))
            if label and node.get("type") not in ("subtopic", "link"):
                topics.append({
                    "title": label,
                    "description": node_data.get("description", ""),
                    "children": [],
                })
        return topics
    except Exception as exc:
        logger.debug("_parse_next_data error: %s", exc)
        return []
