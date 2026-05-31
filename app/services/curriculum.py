"""Curriculum service — ingests roadmap data from roadmap.sh and other sources.

Roadmap.sh provides structured frontend/backend/devops roadmaps as JSON
via their public API. This service fetches, normalizes, and stores them
as CurriculumModules and Concepts.

Currently supports:
- roadmap.sh (primary)
- Extensible for freeCodeCamp, The Odin Project, etc.
"""

import logging
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Static curriculum seed — Python backend + full-stack roadmap
# Organized in dependency order per roadmap.sh
# ---------------------------------------------------------------------------
SEED_CURRICULUM: list[dict[str, Any]] = [
    {
        "title": "Python Basics",
        "description": "Core Python syntax and data structures — the foundation for everything else.",
        "source": "roadmap.sh",
        "order_index": 1,
        "concepts": [
            {"title": "Variables and Data Types", "difficulty": "foundational",
             "description": "Strings, integers, floats, booleans — how Python represents data.",
             "key_terms": "variable, type, string, int, float, bool, None"},
            {"title": "Control Flow", "difficulty": "foundational",
             "description": "if/elif/else, for loops, while loops — making decisions and repeating actions.",
             "key_terms": "if, else, elif, for, while, break, continue"},
            {"title": "Functions", "difficulty": "foundational",
             "description": "Defining and calling functions, parameters, return values, scope.",
             "key_terms": "def, return, parameter, argument, scope, lambda"},
            {"title": "Lists and Dictionaries", "difficulty": "foundational",
             "description": "Python's core data structures — ordered sequences and key-value mappings.",
             "key_terms": "list, dict, index, key, value, append, pop, comprehension"},
            {"title": "String Manipulation", "difficulty": "foundational",
             "description": "Formatting, slicing, and processing text in Python.",
             "key_terms": "f-string, format, slice, split, join, strip"},
            {"title": "File I/O", "difficulty": "foundational",
             "description": "Reading from and writing to files. Context managers with 'with'.",
             "key_terms": "open, read, write, with, context manager, file handle"},
            {"title": "Error Handling", "difficulty": "foundational",
             "description": "try/except/finally — handling errors gracefully instead of crashing.",
             "key_terms": "try, except, finally, raise, exception, traceback"},
        ],
    },
    {
        "title": "Object-Oriented Programming",
        "description": "Classes, objects, inheritance — structuring larger programs.",
        "source": "roadmap.sh",
        "order_index": 2,
        "concepts": [
            {"title": "Classes and Objects", "difficulty": "intermediate",
             "description": "Defining classes with __init__, creating instances, self parameter.",
             "key_terms": "class, object, instance, self, __init__, attribute, method"},
            {"title": "Inheritance and Polymorphism", "difficulty": "intermediate",
             "description": "Extending classes, method overriding, super(), duck typing.",
             "key_terms": "inheritance, super, override, polymorphism, MRO, isinstance"},
            {"title": "Magic Methods", "difficulty": "intermediate",
             "description": "Operator overloading with __str__, __repr__, __eq__, __len__, and others.",
             "key_terms": "__str__, __repr__, __eq__, __len__, __getitem__, dunder"},
            {"title": "Properties and Descriptors", "difficulty": "intermediate",
             "description": "@property decorator, getters/setters, encapsulation patterns.",
             "key_terms": "property, getter, setter, deleter, descriptor, encapsulation"},
        ],
    },
    {
        "title": "Working with Data",
        "description": "Data structures, algorithms, and working with external data formats.",
        "source": "roadmap.sh",
        "order_index": 3,
        "concepts": [
            {"title": "Tuples and Sets", "difficulty": "foundational",
             "description": "Immutable sequences and unique collections — when to use them.",
             "key_terms": "tuple, set, frozenset, hashable, unique, immutable"},
            {"title": "List Comprehensions and Generators", "difficulty": "intermediate",
             "description": "Concise data transforms with comprehensions. Lazy evaluation with generators.",
             "key_terms": "list comprehension, generator, yield, lazy, iterator, iterable"},
            {"title": "JSON and APIs", "difficulty": "intermediate",
             "description": "Parsing JSON, making HTTP requests, working with REST APIs.",
             "key_terms": "json, requests, API, REST, endpoint, status code, headers"},
            {"title": "Working with CSV and Files", "difficulty": "foundational",
             "description": "Reading/writing CSV, processing tabular data, csv module.",
             "key_terms": "csv, DictReader, DictWriter, dialect, pandas (intro)"},
        ],
    },
    {
        "title": "Databases",
        "description": "SQL, database design, and Python database access.",
        "source": "roadmap.sh",
        "order_index": 4,
        "concepts": [
            {"title": "SQL Fundamentals", "difficulty": "intermediate",
             "description": "SELECT, INSERT, UPDATE, DELETE, WHERE, JOIN — the core of SQL.",
             "key_terms": "SELECT, INSERT, UPDATE, DELETE, WHERE, JOIN, GROUP BY"},
            {"title": "Database Design", "difficulty": "intermediate",
             "description": "Normalization, relationships (1:1, 1:N, N:M), primary and foreign keys.",
             "key_terms": "normalization, primary key, foreign key, relationship, schema, index"},
            {"title": "SQLAlchemy ORM", "difficulty": "intermediate",
             "description": "Python classes mapping to database tables. Queries, relationships, migrations.",
             "key_terms": "ORM, model, session, query, relationship, migration, Alembic"},
            {"title": "SQLite for Development", "difficulty": "foundational",
             "description": "Lightweight, file-based database. Perfect for learning and small projects.",
             "key_terms": "SQLite, file-based, concurrent access, WAL mode"},
        ],
    },
    {
        "title": "Web Frameworks (FastAPI)",
        "description": "Building web applications and APIs with FastAPI — the learner's target framework.",
        "source": "roadmap.sh",
        "order_index": 5,
        "concepts": [
            {"title": "HTTP and Routing", "difficulty": "intermediate",
             "description": "GET, POST, PUT, DELETE. Path parameters, query parameters, request/response lifecycle.",
             "key_terms": "HTTP, route, endpoint, path parameter, query parameter, status code"},
            {"title": "Request and Response Models", "difficulty": "intermediate",
             "description": "Pydantic models for request validation and response serialization.",
             "key_terms": "Pydantic, BaseModel, validation, serialization, schema"},
            {"title": "Dependency Injection", "difficulty": "intermediate",
             "description": "FastAPI's Depends() pattern — injecting database sessions, auth, config.",
             "key_terms": "Depends, dependency, injection, yield, scope"},
            {"title": "Middleware and CORS", "difficulty": "intermediate",
             "description": "Request/response middleware. Cross-Origin Resource Sharing configuration.",
             "key_terms": "middleware, CORS, origin, headers, Starlette"},
            {"title": "WebSockets", "difficulty": "advanced",
             "description": "Real-time bidirectional communication. Streaming responses. Connection lifecycle.",
             "key_terms": "WebSocket, real-time, streaming, connection, async, bi-directional"},
            {"title": "Authentication and Authorization", "difficulty": "advanced",
             "description": "JWT tokens, OAuth2 password flow, protecting routes.",
             "key_terms": "JWT, OAuth2, token, bearer, hash, bcrypt, scope"},
        ],
    },
    {
        "title": "Testing and Debugging",
        "description": "Writing tests, debugging techniques, and maintaining code quality.",
        "source": "roadmap.sh",
        "order_index": 6,
        "concepts": [
            {"title": "Unit Testing with pytest", "difficulty": "intermediate",
             "description": "Writing and running tests. Fixtures, parametrization, assertions.",
             "key_terms": "pytest, test, fixture, assert, parametrize, coverage"},
            {"title": "Debugging Techniques", "difficulty": "foundational",
             "description": "Print debugging, pdb, IDE debugger, reading tracebacks.",
             "key_terms": "debug, pdb, breakpoint, traceback, stack trace, logging"},
            {"title": "Logging", "difficulty": "foundational",
             "description": "Python's logging module. Levels, handlers, formatting. Structured logging.",
             "key_terms": "logging, level, handler, formatter, DEBUG, INFO, WARNING, ERROR"},
        ],
    },
    {
        "title": "Deployment and DevOps Basics",
        "description": "Getting code from your machine to the world.",
        "source": "roadmap.sh",
        "order_index": 7,
        "concepts": [
            {"title": "Git and Version Control", "difficulty": "foundational",
             "description": "Commits, branches, merges, pull requests. The developer's time machine.",
             "key_terms": "git, commit, branch, merge, PR, remote, clone, push, pull"},
            {"title": "Environment Variables and Config", "difficulty": "foundational",
             "description": ".env files, 12-factor config, separating code from configuration.",
             "key_terms": "env, dotenv, config, secret, 12-factor, environment"},
            {"title": "Containers (Docker)", "difficulty": "advanced",
             "description": "Dockerfile, docker-compose, images, containers. Reproducible environments.",
             "key_terms": "Docker, container, image, Dockerfile, compose, volume"},
            {"title": "CI/CD Basics", "difficulty": "advanced",
             "description": "Automated testing and deployment pipelines. GitHub Actions intro.",
             "key_terms": "CI, CD, pipeline, GitHub Actions, deploy, automate"},
        ],
    },
    {
        "title": "Frontend Basics",
        "description": "HTML, CSS, and JavaScript fundamentals for full-stack capability.",
        "source": "roadmap.sh",
        "order_index": 8,
        "concepts": [
            {"title": "HTML Forms and Semantics", "difficulty": "foundational",
             "description": "Form elements, validation, semantic HTML5 tags, accessibility basics.",
             "key_terms": "form, input, validation, semantic, aria, accessibility"},
            {"title": "CSS Layout and Flexbox/Grid", "difficulty": "intermediate",
             "description": "Modern CSS layout. Flexbox for 1D, Grid for 2D. Responsive design.",
             "key_terms": "flexbox, grid, responsive, media query, layout, gap"},
            {"title": "JavaScript DOM Manipulation", "difficulty": "intermediate",
             "description": "querySelector, events, creating/modifying elements, classList.",
             "key_terms": "DOM, querySelector, event, addEventListener, createElement"},
            {"title": "Fetch API and AJAX", "difficulty": "intermediate",
             "description": "Making HTTP requests from JavaScript. JSON, async/await, error handling.",
             "key_terms": "fetch, async, await, JSON, response, headers, CORS"},
        ],
    },
]


async def seed_curriculum(db: AsyncSession) -> int:
    """Seed the database with the static curriculum if not already seeded.

    Returns the number of modules created (0 if already seeded).
    """
    from app.models.concept import CurriculumModule, Concept

    result = await db.execute(select(CurriculumModule).limit(1))
    if result.scalars().first():
        return 0  # Already seeded

    created = 0
    for module_data in SEED_CURRICULUM:
        concepts_data = module_data.pop("concepts", [])
        module = CurriculumModule(**module_data)
        db.add(module)
        await db.flush()  # Get the module ID

        for concept_data in concepts_data:
            concept = Concept(module_id=module.id, **concept_data)
            db.add(concept)

        created += 1

    await db.flush()
    logger.info("Seeded %d curriculum modules with concepts.", created)
    return created


async def get_curriculum_modules(db: AsyncSession) -> list[dict]:
    """Return all curriculum modules with their concepts, ordered by dependency."""
    from app.models.concept import CurriculumModule, Concept

    result = await db.execute(
        select(CurriculumModule).order_by(CurriculumModule.order_index)
    )
    modules = result.scalars().all()

    output = []
    for module in modules:
        concepts_result = await db.execute(
            select(Concept).where(Concept.module_id == module.id)
        )
        concepts = concepts_result.scalars().all()
        output.append({
            "id": module.id,
            "title": module.title,
            "description": module.description,
            "source": module.source,
            "order_index": module.order_index,
            "concepts": [
                {
                    "id": c.id,
                    "title": c.title,
                    "description": c.description,
                    "difficulty": c.difficulty,
                    "prerequisites": c.prerequisites,
                    "key_terms": c.key_terms,
                }
                for c in concepts
            ],
        })

    return output


async def get_next_concepts(
    db: AsyncSession, project_id: int, limit: int = 5
) -> list[dict]:
    """Return the next concepts the learner should tackle for a project.

    Prioritizes concepts not yet introduced, then concepts only introduced once,
    ordered by curriculum dependency (order_index).
    """
    from app.models.concept import CurriculumModule, Concept, ConceptExposure

    # Get all exposed concept IDs for this project
    exposure_result = await db.execute(
        select(ConceptExposure.concept_id).where(
            ConceptExposure.project_id == project_id
        )
    )
    exposed_ids = set(exposure_result.scalars().all())

    # Get all concepts ordered by module order
    result = await db.execute(
        select(Concept, CurriculumModule.order_index)
        .join(CurriculumModule, Concept.module_id == CurriculumModule.id)
        .order_by(CurriculumModule.order_index)
    )
    all_concepts = result.all()

    # Separate into not-yet-introduced and needs-review
    new_concepts = []
    review_concepts = []

    for concept, module_order in all_concepts:
        concept_dict = {
            "id": concept.id,
            "title": concept.title,
            "description": concept.description,
            "difficulty": concept.difficulty,
            "key_terms": concept.key_terms,
            "module_order": module_order,
        }
        if concept.id not in exposed_ids:
            new_concepts.append(concept_dict)
        else:
            review_concepts.append(concept_dict)

    # Prefer new concepts first, then review
    return (new_concepts + review_concepts)[:limit]
