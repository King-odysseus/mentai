"""WebSocket chat router — the AI tutor streaming endpoint.

Learner connects to ws://host:9000/ws/chat/{project_id} and sends JSON messages.
The tutor streams responses back word-by-word as JSON events.

Message types (client → server):
  {"type": "message", "content": "What's a decorator?", "session_mode": "micro"}
  {"type": "session_start", "mode": "deep", "available_minutes": 45}
  {"type": "session_end", "mood": "focused"}

Message types (server → client):
  {"type": "delta", "content": "A "}
  {"type": "delta", "content": "decorator "}
  {"type": "done"}
  {"type": "error", "content": "..."}
  {"type": "concept_exposed", "concept": "Functions", "mastery": "practiced"}
"""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/chat/{project_id}")
async def tutor_chat(websocket: WebSocket, project_id: int):
    """WebSocket endpoint for AI tutor chat with streaming responses."""
    await websocket.accept()
    logger.info("Chat WebSocket connected for project %d", project_id)

    # Conversation history for this session
    history: list[dict] = []
    # Session state
    session_mode = "micro"
    session_id: int | None = None

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "content": "Invalid JSON."})
                continue

            msg_type = data.get("type", "message")

            # ------------------------------------------------------------------
            # Session lifecycle events
            # ------------------------------------------------------------------
            if msg_type == "session_start":
                from app.storage.db import async_session
                from app.services.session_manager import start_session

                session_mode = data.get("mode", "micro")
                available = data.get("available_minutes", 10)
                async with async_session() as db:
                    session = await start_session(
                        db, project_id, mode=session_mode, available_minutes=available
                    )
                    session_id = session.id
                    await db.commit()
                await websocket.send_json({
                    "type": "session_started",
                    "session_id": session_id,
                    "mode": session_mode,
                })
                continue

            if msg_type == "session_end":
                if session_id:
                    from app.storage.db import async_session
                    from app.services.session_manager import end_session

                    mood = data.get("mood")
                    async with async_session() as db:
                        await end_session(db, session_id, mood=mood)
                        await db.commit()
                await websocket.send_json({"type": "session_ended"})
                continue

            # ------------------------------------------------------------------
            # Chat message — the main interaction
            # ------------------------------------------------------------------
            if msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    await websocket.send_json({"type": "error", "content": "Empty message."})
                    continue

                session_mode = data.get("session_mode", session_mode)

                # Build context from the database
                from app.storage.db import async_session
                from app.services import concept_tracker as ct
                from app.services import curriculum as cur
                from app.services.ai_tutor import ai_tutor
                from app.models.project import LearningProject
                from sqlalchemy import select

                project_context = None
                curriculum_context = None
                mastery_context = None

                async with async_session() as db:
                    # Project context
                    proj_result = await db.execute(
                        select(LearningProject).where(LearningProject.id == project_id)
                    )
                    project = proj_result.scalars().first()
                    if project:
                        project_context = {
                            "name": project.name,
                            "tech_stack": project.tech_stack,
                            "description": project.description,
                        }

                    # Curriculum context
                    curriculum_context = await cur.get_next_concepts(db, project_id, limit=5)

                    # Mastery context
                    mastery_context = await ct.get_mastery_for_project(db, project_id)

                # Stream the tutor response
                history.append({"role": "user", "content": content})
                full_response = ""

                async for delta in ai_tutor.stream_response(
                    user_message=content,
                    conversation_history=history,
                    project_context=project_context,
                    curriculum_context=curriculum_context,
                    mastery_context=mastery_context,
                    session_mode=session_mode,
                ):
                    full_response += delta
                    await websocket.send_json({"type": "delta", "content": delta})

                # Store the full response in history
                history.append({"role": "assistant", "content": full_response})

                # Signal completion
                await websocket.send_json({"type": "done"})

                # Fire-and-forget: log estimated cost to Cognitive1
                try:
                    from app.services.cognitive1 import cognitive1

                    estimated_input = len(content) // 4
                    estimated_output = len(full_response) // 4
                    await cognitive1.log_cost(
                        model=settings.deepseek_model,
                        input_tokens=estimated_input,
                        output_tokens=estimated_output,
                        operation="tutor_chat",
                    )
                except Exception:
                    pass

                # Try to detect which concepts were covered and record them
                if mastery_context and curriculum_context:
                    try:
                        exposed = await ai_tutor.extract_concepts(
                            full_response, curriculum_context
                        )
                        async with async_session() as db:
                            for exp in exposed:
                                # Find concept ID by title match
                                for cc in curriculum_context:
                                    if cc["title"].lower() == exp.get("title", "").lower():
                                        await ct.record_concept_exposure(
                                            db, project_id, cc["id"]
                                        )
                                        await websocket.send_json({
                                            "type": "concept_exposed",
                                            "concept": cc["title"],
                                            "mastery": "updated",
                                        })
                                        break
                            await db.commit()
                    except Exception:
                        pass  # Concept extraction is best-effort

            # ------------------------------------------------------------------
            # Code review — tutor reviews the learner's code
            # ------------------------------------------------------------------
            elif msg_type == "code_review":
                code = data.get("code", "")
                file_path = data.get("file_path", "unknown")
                focus = data.get("focus", "general")

                if not code:
                    await websocket.send_json({"type": "error", "content": "No code provided for review."})
                    continue

                session_mode = data.get("session_mode", session_mode)

                from app.storage.db import async_session
                from app.services.ai_tutor import ai_tutor
                from app.models.project import LearningProject
                from sqlalchemy import select

                project_context = None
                curriculum_context = None
                mastery_context = None

                async with async_session() as db:
                    proj_result = await db.execute(
                        select(LearningProject).where(LearningProject.id == project_id)
                    )
                    project = proj_result.scalars().first()
                    if project:
                        project_context = {
                            "name": project.name,
                            "tech_stack": project.tech_stack,
                            "description": project.description,
                        }

                    from app.services import curriculum as cur
                    from app.services import concept_tracker as ct
                    curriculum_context = await cur.get_next_concepts(db, project_id, limit=5)
                    mastery_context = await ct.get_mastery_for_project(db, project_id)

                review_prompt = (
                    f"Please review the following code from `{file_path}`. "
                    f"Focus on: {focus}.\n\n"
                    f"Consider the learner's current curriculum position and concept mastery. "
                    f"Point out what they did well, what could be improved, and connect "
                    f"their code to the roadmap concepts they are learning.\n\n"
                    f"```\n{code}\n```"
                )

                history.append({"role": "user", "content": review_prompt})
                full_response = ""

                async for delta in ai_tutor.stream_response(
                    user_message=review_prompt,
                    conversation_history=history,
                    project_context=project_context,
                    curriculum_context=curriculum_context,
                    mastery_context=mastery_context,
                    session_mode=session_mode,
                ):
                    full_response += delta
                    await websocket.send_json({"type": "delta", "content": delta})

                history.append({"role": "assistant", "content": full_response})
                await websocket.send_json({"type": "done"})

                # Fire-and-forget: log estimated cost
                try:
                    from app.services.cognitive1 import cognitive1
                    estimated_input = len(review_prompt) // 4
                    estimated_output = len(full_response) // 4
                    await cognitive1.log_cost(
                        model=settings.deepseek_model,
                        input_tokens=estimated_input,
                        output_tokens=estimated_output,
                        operation="code_review",
                    )
                except Exception:
                    pass

    except WebSocketDisconnect:
        logger.info("Chat WebSocket disconnected for project %d", project_id)
    except Exception as exc:
        logger.error("Chat WebSocket error: %s", exc)
        try:
            await websocket.send_json({"type": "error", "content": str(exc)})
        except Exception:
            pass
