"""WebSocket chat router — AI tutor streaming, onboarding, and teach cycles."""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helper: load project context for a given project_id
# ---------------------------------------------------------------------------
async def _load_project_context(project_id: int) -> tuple:
    """Load project, curriculum, and mastery context from DB. Returns 3-tuple."""
    from app.storage.db import async_session
    from app.services import concept_tracker as ct
    from app.models.project import LearningProject
    from sqlalchemy import select

    async with async_session() as db:
        proj_result = await db.execute(
            select(LearningProject).where(LearningProject.id == project_id)
        )
        project = proj_result.scalars().first()
        project_context = None
        learning_path = None
        if project:
            project_context = {
                "name": project.name,
                "tech_stack": project.tech_stack,
                "description": project.description,
            }
            learning_path = project.learning_path

        mastery_context = await ct.get_mastery_for_project(db, project_id)

    return project_context, mastery_context, learning_path


# ---------------------------------------------------------------------------
# Main chat WebSocket
# ---------------------------------------------------------------------------
@router.websocket("/chat/{project_id}")
async def tutor_chat(websocket: WebSocket, project_id: int):
    await websocket.accept()
    logger.info("Chat WebSocket connected for project %d", project_id)

    history: list[dict] = []
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

            # Session events
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

            # Normal chat message
            if msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    await websocket.send_json({"type": "error", "content": "Empty message."})
                    continue

                session_mode = data.get("session_mode", session_mode)
                project_context, mastery_context, learning_path = await _load_project_context(project_id)

                from app.services.tutor_orchestrator import orchestrator

                specialization = orchestrator.route(content, None)
                await websocket.send_json({
                    "type": "specialist",
                    "name": orchestrator.get_specialist_name(specialization),
                    "specialization": specialization,
                })

                history.append({"role": "user", "content": content})
                full_response = ""

                async for delta in orchestrator.stream_response(
                    specialization=specialization,
                    user_message=content,
                    conversation_history=history,
                    project_context=project_context,
                    curriculum_context=None,
                    mastery_context=mastery_context,
                    session_mode=session_mode,
                ):
                    full_response += delta
                    await websocket.send_json({"type": "delta", "content": delta})

                history.append({"role": "assistant", "content": full_response})
                await websocket.send_json({"type": "done"})

                # Fire-and-forget: log cost
                try:
                    from app.services.cognitive1 import cognitive1
                    await cognitive1.log_cost(
                        model=settings.deepseek_model,
                        input_tokens=len(content) // 4,
                        output_tokens=len(full_response) // 4,
                        operation=f"tutor_chat_{specialization}",
                    )
                except Exception:
                    pass

            # Teach cycle — AI teaches a concept then gives a challenge
            elif msg_type == "teach_concept":
                concept = data.get("concept", "")
                module_title = data.get("module_title", "")
                if not concept:
                    await websocket.send_json({"type": "error", "content": "No concept specified."})
                    continue

                session_mode = data.get("session_mode", session_mode)
                project_context, mastery_context, learning_path = await _load_project_context(project_id)

                from app.services.tutor_orchestrator import orchestrator
                from app.services.ai_tutor import AITutor

                # Phase 1: Teach
                await websocket.send_json({"type": "cycle_phase", "phase": "teach"})
                teach_prompt = (
                    f"Teach the concept '{concept}' to {settings.learner_name}. "
                    f"Keep it focused — 2-3 paragraphs with a short code example. "
                    f"After explaining, say 'NOW_YOUR_TURN' and give a specific coding challenge "
                    f"that lets the learner practice this concept. "
                    f"The challenge should ask them to write code in the editor, not in chat."
                )

                specialization = orchestrator.route(concept, None)
                history.append({"role": "user", "content": teach_prompt})
                full_response = ""

                async for delta in orchestrator.stream_response(
                    specialization=specialization,
                    user_message=teach_prompt,
                    conversation_history=history[-10:],
                    project_context=project_context,
                    session_mode=session_mode,
                ):
                    full_response += delta
                    await websocket.send_json({"type": "delta", "content": delta})

                history.append({"role": "assistant", "content": full_response})
                await websocket.send_json({"type": "done"})

                # Phase 2: Challenge (embedded in the teach response after NOW_YOUR_TURN)
                challenge = ""
                if "NOW_YOUR_TURN" in full_response:
                    parts = full_response.split("NOW_YOUR_TURN", 1)
                    challenge = parts[1].strip() if len(parts) > 1 else ""
                await websocket.send_json({
                    "type": "cycle_phase",
                    "phase": "challenge",
                    "concept": concept,
                    "module_title": module_title,
                    "prompt": challenge or "Write code to practice this concept in the editor, then submit for review.",
                })

            # Code review — AI reviews the learner's code
            elif msg_type == "code_review" or msg_type == "submit_code":
                code = data.get("code", "")
                file_path = data.get("file_path", "unknown")
                concept = data.get("concept", "")

                if not code:
                    await websocket.send_json({"type": "error", "content": "No code provided."})
                    continue

                session_mode = data.get("session_mode", session_mode)
                project_context, mastery_context, learning_path = await _load_project_context(project_id)

                from app.services.tutor_orchestrator import orchestrator

                if concept:
                    review_prompt = (
                        f"Review this code for the concept '{concept}'. "
                        f"The learner was challenged to practice this concept.\n\n"
                        f"```\n{code}\n```\n\n"
                        f"Give constructive feedback: what's good, what to improve, "
                        f"and connect to the concept. Be encouraging."
                    )
                else:
                    review_prompt = (
                        f"Please review the following code from `{file_path}`.\n\n"
                        f"```\n{code}\n```\n\n"
                        f"Give structured feedback: what's good, suggestions, patterns spotted, next steps."
                    )

                specialization = orchestrator.route(review_prompt, None)
                await websocket.send_json({
                    "type": "specialist",
                    "name": orchestrator.get_specialist_name(specialization),
                    "specialization": specialization,
                })

                if concept:
                    await websocket.send_json({"type": "cycle_phase", "phase": "review"})

                history.append({"role": "user", "content": review_prompt})
                full_response = ""

                async for delta in orchestrator.stream_response(
                    specialization=specialization,
                    user_message=review_prompt,
                    conversation_history=history[-10:],
                    project_context=project_context,
                    session_mode=session_mode,
                ):
                    full_response += delta
                    await websocket.send_json({"type": "delta", "content": delta})

                history.append({"role": "assistant", "content": full_response})
                await websocket.send_json({"type": "done"})

                # Record concept exposure if this was a teach cycle review
                if concept:
                    from app.storage.db import async_session
                    from app.services import concept_tracker as ct

                    async with async_session() as db:
                        exposure = await ct.record_concept_exposure(
                            db, project_id, concept,
                            module_title=data.get("module_title"),
                        )
                        await db.commit()
                        await websocket.send_json({
                            "type": "cycle_complete",
                            "concept": concept,
                            "mastery": exposure.mastery,
                        })

                # Fire-and-forget cost log
                try:
                    from app.services.cognitive1 import cognitive1
                    await cognitive1.log_cost(
                        model=settings.deepseek_model,
                        input_tokens=len(review_prompt) // 4,
                        output_tokens=len(full_response) // 4,
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


# ---------------------------------------------------------------------------
# Onboarding WebSocket — interview-style profile setup
# ---------------------------------------------------------------------------
@router.websocket("/onboarding")
async def onboarding_chat(websocket: WebSocket):
    await websocket.accept()
    logger.info("Onboarding WebSocket connected")

    # Collect answers to build profile
    profile_data: dict = {}
    questions = [
        {
            "key": "python_level",
            "ask": "Let's start with Python. How would you rate your experience? (beginner / intermediate / advanced)",
            "hint": "Beginner: little to no Python. Intermediate: comfortable with functions and classes. Advanced: built real projects, understand async/await.",
        },
        {
            "key": "javascript_level",
            "ask": "How about JavaScript? (beginner / intermediate / advanced)",
            "hint": "Beginner: know basic syntax. Intermediate: comfortable with DOM, events, fetch. Advanced: built SPAs, understand closures and promises.",
        },
        {
            "key": "html_css_level",
            "ask": "HTML and CSS? (beginner / intermediate / advanced)",
            "hint": "Beginner: basic tags and selectors. Intermediate: semantic HTML, flexbox/grid. Advanced: accessibility, responsive design, animations.",
        },
        {
            "key": "database_level",
            "ask": "Database experience? (beginner / intermediate / advanced)",
            "hint": "Beginner: know what SQL is. Intermediate: can write queries and joins. Advanced: designed schemas, understand indexing and normalization.",
        },
        {
            "key": "preferred_backend",
            "ask": "What backend stack interests you most? (e.g., Python+FastAPI, Node+Express, or something else)",
            "hint": "This determines what you'll build real projects with.",
        },
        {
            "key": "preferred_frontend",
            "ask": "What frontend approach do you want to learn? (e.g., React, vanilla JS, HTMX, Vue)",
            "hint": "We'll match projects to your preferred frontend style.",
        },
        {
            "key": "learning_goal",
            "ask": "What's your main learning goal? (e.g., full-stack developer, backend specialist, frontend specialist, or just explore)",
            "hint": "This shapes your entire learning path.",
        },
        {
            "key": "time_per_week",
            "ask": "How much time can you spend per week? (e.g., 5h, 10h, 20h)",
            "hint": "We'll adapt the pace and project size to fit your schedule.",
        },
    ]

    current_q = 0

    try:
        # Send greeting
        greeting = (
            f"Welcome to MentAi, {settings.learner_name}! I'm Mentor, your AI guide. "
            "Let's figure out the best learning path for you. I'll ask a few quick questions."
        )
        await websocket.send_json({"type": "delta", "content": greeting})
        await websocket.send_json({"type": "done"})

        # Ask first question
        await websocket.send_json({
            "type": "onboarding_question",
            "question": questions[current_q]["ask"],
            "hint": questions[current_q]["hint"],
            "step": current_q + 1,
            "total": len(questions),
        })

        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if data.get("type") != "onboarding_answer":
                continue

            answer = data.get("content", "").strip().lower()
            if not answer:
                continue

            # Store answer
            profile_data[questions[current_q]["key"]] = answer

            # Ack the answer
            await websocket.send_json({
                "type": "delta",
                "content": f"Got it: {answer}. ",
            })
            await websocket.send_json({"type": "done"})

            current_q += 1
            if current_q >= len(questions):
                break

            # Ask next question
            await websocket.send_json({
                "type": "onboarding_question",
                "question": questions[current_q]["ask"],
                "hint": questions[current_q]["hint"],
                "step": current_q + 1,
                "total": len(questions),
            })

        # Summarize and save
        summary = (
            f"Here's your profile:\n"
            f"- Python: {profile_data.get('python_level', 'beginner')}\n"
            f"- JavaScript: {profile_data.get('javascript_level', 'beginner')}\n"
            f"- HTML/CSS: {profile_data.get('html_css_level', 'beginner')}\n"
            f"- Database: {profile_data.get('database_level', 'beginner')}\n"
            f"- Backend: {profile_data.get('preferred_backend', 'not set')}\n"
            f"- Frontend: {profile_data.get('preferred_frontend', 'not set')}\n"
            f"- Goal: {profile_data.get('learning_goal', 'not set')}\n"
            f"- Time: {profile_data.get('time_per_week', 'not set')}\n\n"
            f"I'll create projects tailored to this profile. Ready to start?"
        )
        await websocket.send_json({"type": "delta", "content": summary})
        await websocket.send_json({"type": "done"})
        await websocket.send_json({
            "type": "onboarding_complete",
            "profile": profile_data,
        })

    except WebSocketDisconnect:
        logger.info("Onboarding WebSocket disconnected")
    except Exception as exc:
        logger.error("Onboarding error: %s", exc)
