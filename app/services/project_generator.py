"""Project generator — creates scaffolded learning projects from curriculum modules.

Each module has one or more pre-built project templates that exercise the
concepts taught in that module. The projects are created as real workspace
directories with starter files.
"""

import json
import logging
import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.concept import CurriculumProject, CurriculumModule

logger = logging.getLogger(__name__)

# Pre-built scaffold templates for each module.
# Keyed by module order_index (1-indexed, matching SEED_CURRICULUM).
SCAFFOLD_TEMPLATES: dict[int, dict] = {
    1: {
        "title": "Python Foundations Playground",
        "tech_stack": "Python",
        "description": "A single-file playground to practice Python variables, control flow, functions, and data structures.",
        "files": [
            {
                "path": "playground.py",
                "content": (
                    '"""Python Foundations Playground\n\n'
                    "Practice variables, control flow, functions, lists, and string manipulation.\n"
                    "Run with: python playground.py\n"
                    '"""\n\n'
                    "# TODO: Experiment with each concept below\n\n"
                    "# 1. Variables and data types\n"
                    'name = "Learner"\n'
                    "score = 42\n"
                    'print(f"Hello {name}, your score is {score}")\n\n'
                    "# 2. Lists and loops\n"
                    "concepts = [\"variables\", \"loops\", \"functions\", \"lists\"]\n"
                    "for c in concepts:\n"
                    "    print(f\"Learning: {c}\")\n\n"
                    "# 3. Functions\n"
                    "def greet(person):\n"
                    '    return f"Welcome, {person}!"\n\n'
                    'print(greet("Mentor"))\n'
                ),
            },
            {
                "path": "README.md",
                "content": (
                    "# Python Foundations Playground\n\n"
                    "Practice the core Python concepts from Module 1 (Python Basics).\n\n"
                    "## Concepts Covered\n"
                    "- Variables and data types\n"
                    "- Control flow (if/else, loops)\n"
                    "- Functions\n"
                    "- Lists and basic data structures\n"
                    "- String manipulation\n"
                    "- Input/output\n\n"
                    "## How to Use\n"
                    "Edit `playground.py` and run it with the Run button or `python playground.py`.\n"
                ),
            },
        ],
    },
    2: {
        "title": "OOP Zoo Manager",
        "tech_stack": "Python",
        "description": "Build a class hierarchy for a zoo — practice inheritance, encapsulation, and polymorphism.",
        "files": [
            {
                "path": "animals.py",
                "content": (
                    '"""Zoo Manager — OOP practice.\n\n'
                    "Build a class hierarchy for different animals.\n"
                    "Practice inheritance, encapsulation, and polymorphism.\n"
                    '"""\n\n'
                    "\n"
                    "class Animal:\n"
                    '    """Base class for all animals."""\n\n'
                    "    def __init__(self, name: str, age: int):\n"
                    "        self.name = name\n"
                    "        self.age = age\n\n"
                    "    def make_sound(self) -> str:\n"
                    '        return "Some generic animal sound"\n\n'
                    "    def __str__(self) -> str:\n"
                    '        return f"{self.name} ({self.age} years old)"\n\n'
                    "\n"
                    "class Mammal(Animal):\n"
                    '    """A mammal — warm-blooded, has fur."""\n\n'
                    "    def __init__(self, name: str, age: int, fur_color: str):\n"
                    "        super().__init__(name, age)\n"
                    "        self.fur_color = fur_color\n\n"
                    "    def make_sound(self) -> str:\n"
                    '        return "Growl!"\n\n'
                    "\n"
                    "class Bird(Animal):\n"
                    '    """A bird — can fly."""\n\n'
                    "    def __init__(self, name: str, age: int, wingspan: float):\n"
                    "        super().__init__(name, age)\n"
                    "        self.wingspan = wingspan\n\n"
                    "    def make_sound(self) -> str:\n"
                    '        return "Chirp!"\n\n'
                    "\n"
                    'if __name__ == "__main__":\n'
                    '    lion = Mammal("Leo", 5, "golden")\n'
                    '    eagle = Bird("Eddie", 3, 2.1)\n'
                    "    animals = [lion, eagle]\n"
                    "    for animal in animals:\n"
                    "        print(f\"{animal}: {animal.make_sound()}\")\n"
                ),
            },
            {"path": "README.md", "content": "# OOP Zoo Manager\n\nPractice object-oriented programming by building a class hierarchy.\n"},
        ],
    },
    3: {
        "title": "Data Explorer CLI",
        "tech_stack": "Python",
        "description": "A CLI tool that reads, processes, and outputs data — practice file I/O, JSON, and data structures.",
        "files": [
            {
                "path": "explorer.py",
                "content": (
                    '"""Data Explorer CLI.\n\n'
                    "Practice file I/O, JSON, CSV handling, and data transformations.\n"
                    '"""\n\n'
                    "import json\n"
                    "import csv\n"
                    "from pathlib import Path\n\n"
                    "\n"
                    "def read_json(filepath: str) -> list[dict]:\n"
                    '    """Read a JSON file and return the data."""\n'
                    "    with open(filepath, 'r') as f:\n"
                    "        return json.load(f)\n\n"
                    "\n"
                    "def write_csv(data: list[dict], filepath: str) -> None:\n"
                    '    """Write data to a CSV file."""\n'
                    "    if not data:\n"
                    "        return\n"
                    "    with open(filepath, 'w', newline='') as f:\n"
                    "        writer = csv.DictWriter(f, fieldnames=data[0].keys())\n"
                    "        writer.writeheader()\n"
                    "        writer.writerows(data)\n\n"
                    "\n"
                    "def filter_by_key(data: list[dict], key: str, value) -> list[dict]:\n"
                    '    """Filter a list of dicts by key-value match."""\n'
                    "    return [item for item in data if item.get(key) == value]\n\n"
                    "\n"
                    'if __name__ == "__main__":\n'
                    '    # Create sample data\n'
                    "    sample = [\n"
                    '        {"name": "Alice", "role": "developer", "level": 3},\n'
                    '        {"name": "Bob", "role": "designer", "level": 2},\n'
                    '        {"name": "Eve", "role": "developer", "level": 4},\n'
                    "    ]\n"
                    '    print("All data:", sample)\n'
                    '    devs = filter_by_key(sample, "role", "developer")\n'
                    '    print("Developers:", devs)\n'
                ),
            },
            {"path": "README.md", "content": "# Data Explorer CLI\n\nPractice working with data formats and file I/O.\n"},
        ],
    },
    4: {
        "title": "Mini Database Shell",
        "tech_stack": "Python + SQLite",
        "description": "A simple SQL runner — create tables, insert rows, and query data with sqlite3.",
        "files": [
            {
                "path": "db_shell.py",
                "content": (
                    '"""Mini Database Shell.\n\n'
                    "Practice SQL basics with sqlite3 — create, read, update, delete.\n"
                    '"""\n\n'
                    "import sqlite3\n"
                    "import os\n\n"
                    "\n"
                    "DB_PATH = \"mini.db\"\n\n"
                    "\n"
                    "def get_connection():\n"
                    '    """Get a database connection."""\n'
                    "    return sqlite3.connect(DB_PATH)\n\n"
                    "\n"
                    "def setup_tables():\n"
                    '    """Create sample tables."""\n'
                    "    conn = get_connection()\n"
                    "    conn.execute('''\n"
                    "        CREATE TABLE IF NOT EXISTS tasks (\n"
                    "            id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
                    "            title TEXT NOT NULL,\n"
                    "            done INTEGER DEFAULT 0\n"
                    "        )\n"
                    "    ''')\n"
                    "    conn.commit()\n"
                    "    conn.close()\n\n"
                    "\n"
                    "def add_task(title: str):\n"
                    '    """Insert a new task."""\n'
                    "    conn = get_connection()\n"
                    "    conn.execute(\"INSERT INTO tasks (title) VALUES (?)\", (title,))\n"
                    "    conn.commit()\n"
                    "    conn.close()\n"
                    '    print(f"Added: {title}")\n\n'
                    "\n"
                    "def list_tasks():\n"
                    '    """List all tasks."""\n'
                    "    conn = get_connection()\n"
                    "    rows = conn.execute(\"SELECT id, title, done FROM tasks\").fetchall()\n"
                    "    conn.close()\n"
                    "    for row in rows:\n"
                    '        status = "[x]" if row[2] else "[ ]"\n'
                    "        print(f\"{row[0]}. {status} {row[1]}\")\n\n"
                    "\n"
                    'if __name__ == "__main__":\n'
                    "    setup_tables()\n"
                    '    add_task("Learn SQL basics")\n'
                    '    add_task("Practice queries")\n'
                    "    list_tasks()\n"
                    "    # Clean up\n"
                    "    if os.path.exists(DB_PATH):\n"
                    "        os.remove(DB_PATH)\n"
                ),
            },
            {"path": "README.md", "content": "# Mini Database Shell\n\nPractice SQL fundamentals using Python's sqlite3 module.\n"},
        ],
    },
    5: {
        "title": "Todo API",
        "tech_stack": "Python + FastAPI",
        "description": "Build a REST API for managing tasks — practice routes, request models, and HTTP methods.",
        "files": [
            {
                "path": "main.py",
                "content": (
                    '"""Todo API — a simple FastAPI REST API.\n\n'
                    "Practice routes, path parameters, request bodies, and HTTP methods.\n"
                    "Run with: uvicorn main:app --reload\n"
                    '"""\n\n'
                    "from fastapi import FastAPI, HTTPException\n"
                    "from pydantic import BaseModel\n"
                    "from typing import Optional\n\n"
                    "\n"
                    "app = FastAPI(title=\"Todo API\")\n\n"
                    "# In-memory storage (for practice — would use a DB in production)\n"
                    "todos: list[dict] = []\n"
                    "next_id = 1\n\n"
                    "\n"
                    "class TodoCreate(BaseModel):\n"
                    "    title: str\n"
                    "    done: bool = False\n\n"
                    "\n"
                    "class TodoUpdate(BaseModel):\n"
                    "    title: Optional[str] = None\n"
                    "    done: Optional[bool] = None\n\n"
                    "\n"
                    "@app.get(\"/todos\")\n"
                    "def list_todos():\n"
                    '    """List all todos."""\n'
                    "    return todos\n\n"
                    "\n"
                    "@app.post(\"/todos\")\n"
                    "def create_todo(todo: TodoCreate):\n"
                    '    """Create a new todo."""\n'
                    "    global next_id\n"
                    '    new_todo = {"id": next_id, "title": todo.title, "done": todo.done}\n'
                    "    todos.append(new_todo)\n"
                    "    next_id += 1\n"
                    "    return new_todo\n\n"
                    "\n"
                    "@app.get(\"/todos/{todo_id}\")\n"
                    "def get_todo(todo_id: int):\n"
                    '    """Get a single todo by ID."""\n'
                    "    for todo in todos:\n"
                    '        if todo["id"] == todo_id:\n'
                    "            return todo\n"
                    '    raise HTTPException(status_code=404, detail="Todo not found")\n\n'
                    "\n"
                    "@app.patch(\"/todos/{todo_id}\")\n"
                    "def update_todo(todo_id: int, update: TodoUpdate):\n"
                    '    """Update a todo."""\n'
                    "    for todo in todos:\n"
                    '        if todo["id"] == todo_id:\n'
                    "            if update.title is not None:\n"
                    '                todo["title"] = update.title\n'
                    "            if update.done is not None:\n"
                    '                todo["done"] = update.done\n'
                    "            return todo\n"
                    '    raise HTTPException(status_code=404, detail="Todo not found")\n\n'
                    "\n"
                    "@app.delete(\"/todos/{todo_id}\")\n"
                    "def delete_todo(todo_id: int):\n"
                    '    """Delete a todo."""\n'
                    "    global todos\n"
                    "    todos = [t for t in todos if t[\"id\"] != todo_id]\n"
                    '    return {"deleted": True}\n'
                ),
            },
            {"path": "README.md", "content": "# Todo API\n\nA simple REST API built with FastAPI. Practice routes, HTTP methods, and request validation.\n\nRun: `pip install fastapi uvicorn && uvicorn main:app --reload`\n"},
        ],
    },
    6: {
        "title": "Test Lab",
        "tech_stack": "Python + pytest",
        "description": "Write unit tests for a small library — practice pytest, assertions, and fixtures.",
        "files": [
            {
                "path": "calculator.py",
                "content": (
                    '"""A simple calculator module to test."""\n\n'
                    "\n"
                    "def add(a: float, b: float) -> float:\n"
                    "    return a + b\n\n"
                    "\n"
                    "def subtract(a: float, b: float) -> float:\n"
                    "    return a - b\n\n"
                    "\n"
                    "def multiply(a: float, b: float) -> float:\n"
                    "    return a * b\n\n"
                    "\n"
                    "def divide(a: float, b: float) -> float:\n"
                    "    if b == 0:\n"
                    '        raise ValueError("Cannot divide by zero.")\n'
                    "    return a / b\n"
                ),
            },
            {
                "path": "test_calculator.py",
                "content": (
                    '"""Tests for the calculator module."""\n\n'
                    "import pytest\n"
                    "from calculator import add, subtract, multiply, divide\n\n"
                    "\n"
                    "class TestAdd:\n"
                    "    def test_positive_numbers(self):\n"
                    "        assert add(2, 3) == 5\n\n"
                    "    def test_negative_numbers(self):\n"
                    "        assert add(-2, -3) == -5\n\n"
                    "    def test_zero(self):\n"
                    "        assert add(5, 0) == 5\n\n"
                    "\n"
                    "class TestDivide:\n"
                    "    def test_normal_division(self):\n"
                    "        assert divide(10, 2) == 5\n\n"
                    "    def test_divide_by_zero(self):\n"
                    "        with pytest.raises(ValueError, match=\"Cannot divide by zero\"):\n"
                    "            divide(10, 0)\n"
                ),
            },
            {"path": "README.md", "content": "# Test Lab\n\nPractice writing unit tests with pytest.\n\nRun: `pip install pytest && pytest test_calculator.py -v`\n"},
        ],
    },
    7: {
        "title": "Deploy Checklist",
        "tech_stack": "Python + Git",
        "description": "Create a deployment checklist and practice environment variables, logging, and git workflows.",
        "files": [
            {
                "path": "config.py",
                "content": (
                    '"""Application configuration from environment variables.\n\n'
                    "Practice working with env vars, logging, and configuration management.\n"
                    '"""\n\n'
                    "import os\n"
                    "import logging\n\n"
                    "\n"
                    "logging.basicConfig(level=logging.INFO)\n"
                    "logger = logging.getLogger(__name__)\n\n"
                    "\n"
                    "\n"
                    "class Config:\n"
                    '    """Load configuration from environment variables with sensible defaults."""\n\n'
                    "    def __init__(self):\n"
                    "        self.debug = os.getenv(\"DEBUG\", \"false\").lower() == \"true\"\n"
                    '        self.port = int(os.getenv("PORT", "8000"))\n'
                    '        self.database_url = os.getenv("DATABASE_URL", "sqlite:///app.db")\n'
                    '        self.secret_key = os.getenv("SECRET_KEY", "change-me-in-production")\n\n'
                    "        if self.debug:\n"
                    '            logger.info("Debug mode enabled.")\n'
                    "        if self.secret_key == \"change-me-in-production\":\n"
                    '            logger.warning("Using default secret key — set SECRET_KEY in production!")\n\n'
                    "\n"
                    'if __name__ == "__main__":\n'
                    "    config = Config()\n"
                    '    print(f"Debug: {config.debug}")\n'
                    '    print(f"Port: {config.port}")\n'
                    '    print(f"Database: {config.database_url}")\n'
                ),
            },
            {"path": "README.md", "content": "# Deploy Checklist\n\nPractice deployment fundamentals: environment variables, logging, and configuration management.\n"},
        ],
    },
    8: {
        "title": "Personal Homepage",
        "tech_stack": "HTML + CSS + JavaScript",
        "description": "Build a responsive personal homepage — practice HTML semantics, CSS layout, and vanilla JS interactivity.",
        "files": [
            {
                "path": "index.html",
                "content": (
                    '<!DOCTYPE html>\n'
                    '<html lang="en">\n'
                    '<head>\n'
                    '    <meta charset="UTF-8">\n'
                    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
                    '    <title>My Homepage</title>\n'
                    '    <link rel="stylesheet" href="style.css">\n'
                    '</head>\n'
                    '<body>\n'
                    '    <header>\n'
                    '        <h1>Hello, I\'m [Your Name]</h1>\n'
                    '        <p class="subtitle">Aspiring Full-Stack Developer</p>\n'
                    '    </header>\n'
                    '    <main>\n'
                    '        <section id="projects">\n'
                    '            <h2>Projects</h2>\n'
                    '            <div class="project-grid">\n'
                    '                <div class="project-card">\n'
                    '                    <h3>Todo API</h3>\n'
                    '                    <p>A REST API built with FastAPI.</p>\n'
                    '                </div>\n'
                    '                <div class="project-card">\n'
                    '                    <h3>Zoo Manager</h3>\n'
                    '                    <p>OOP practice with class hierarchies.</p>\n'
                    '                </div>\n'
                    '            </div>\n'
                    '        </section>\n'
                    '        <section id="skills">\n'
                    '            <h2>Skills</h2>\n'
                    '            <ul id="skills-list">\n'
                    '                <li>Python</li>\n'
                    '                <li>FastAPI</li>\n'
                    '                <li>HTML & CSS</li>\n'
                    '                <li>JavaScript</li>\n'
                    '            </ul>\n'
                    '        </section>\n'
                    '    </main>\n'
                    '    <footer>\n'
                    '        <p>Built as part of MentAi curriculum.</p>\n'
                    '    </footer>\n'
                    '    <script src="script.js"></script>\n'
                    '</body>\n'
                    '</html>\n'
                ),
            },
            {
                "path": "style.css",
                "content": (
                    '/* Personal Homepage Styles */\n\n'
                    ':root {\n'
                    '    --primary: #0969da;\n'
                    '    --bg: #fafbfc;\n'
                    '    --surface: #fff;\n'
                    '    --text: #24292e;\n'
                    '    --text-secondary: #6a737d;\n'
                    '    --border: #e1e4e8;\n'
                    '    --radius: 8px;\n'
                    '}\n\n'
                    '* { box-sizing: border-box; margin: 0; padding: 0; }\n\n'
                    'body {\n'
                    '    font-family: system-ui, sans-serif;\n'
                    '    background: var(--bg);\n'
                    '    color: var(--text);\n'
                    '    max-width: 800px;\n'
                    '    margin: 0 auto;\n'
                    '    padding: 2rem;\n'
                    '}\n\n'
                    'header { text-align: center; margin-bottom: 3rem; }\n'
                    'h1 { font-size: 2rem; }\n'
                    '.subtitle { color: var(--text-secondary); margin-top: 0.5rem; }\n\n'
                    'section { margin-bottom: 2rem; }\n'
                    'h2 { border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem; }\n\n'
                    '.project-grid {\n'
                    '    display: grid;\n'
                    '    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n'
                    '    gap: 1rem;\n'
                    '}\n'
                    '.project-card {\n'
                    '    background: var(--surface);\n'
                    '    border: 1px solid var(--border);\n'
                    '    border-radius: var(--radius);\n'
                    '    padding: 1rem;\n'
                    '}\n\n'
                    'footer {\n'
                    '    text-align: center;\n'
                    '    color: var(--text-secondary);\n'
                    '    font-size: 0.85rem;\n'
                    '    margin-top: 3rem;\n'
                    '    border-top: 1px solid var(--border);\n'
                    '    padding-top: 1rem;\n'
                    '}\n'
                ),
            },
            {
                "path": "script.js",
                "content": (
                    '// Simple interactivity for the personal homepage.\n\n'
                    "document.addEventListener('DOMContentLoaded', () => {\n"
                    "    // Add current year to footer\n"
                    "    const footer = document.querySelector('footer p');\n"
                    "    if (footer) {\n"
                    "        footer.textContent += ` — ${new Date().getFullYear()}`;\n"
                    "    }\n\n"
                    "    // Click to add a new skill\n"
                    "    const skillsList = document.getElementById('skills-list');\n"
                    "    if (skillsList) {\n"
                    "        skillsList.addEventListener('click', () => {\n"
                    "            const skill = prompt('Add a new skill:');\n"
                    "            if (skill) {\n"
                    "                const li = document.createElement('li');\n"
                    "                li.textContent = skill;\n"
                    "                skillsList.appendChild(li);\n"
                    "            }\n"
                    "        });\n"
                    "    }\n"
                    "});\n"
                ),
            },
        ],
    },
}


async def get_module_projects(db: AsyncSession, module_id: int) -> list[dict]:
    """Get suggested projects for a curriculum module."""
    result = await db.execute(
        select(CurriculumProject)
        .where(CurriculumProject.module_id == module_id)
        .order_by(CurriculumProject.order_index)
    )
    projects = result.scalars().all()
    return [
        {
            "id": p.id,
            "module_id": p.module_id,
            "title": p.title,
            "description": p.description,
            "tech_stack": p.tech_stack,
            "order_index": p.order_index,
        }
        for p in projects
    ]


async def seed_curriculum_projects(db: AsyncSession) -> int:
    """Create default scaffolded projects for all modules if not present.

    Idempotent — returns 0 if already seeded.
    """
    result = await db.execute(select(CurriculumProject).limit(1))
    if result.scalars().first():
        return 0

    modules_result = await db.execute(
        select(CurriculumModule).order_by(CurriculumModule.order_index)
    )
    modules = modules_result.scalars().all()

    created = 0
    for module in modules:
        template = SCAFFOLD_TEMPLATES.get(module.order_index)
        if not template:
            continue
        project = CurriculumProject(
            module_id=module.id,
            title=template["title"],
            description=template["description"],
            tech_stack=template["tech_stack"],
            scaffold_files=json.dumps(template["files"]),
            order_index=1,
        )
        db.add(project)
        created += 1

    await db.flush()
    logger.info("Seeded %d curriculum projects.", created)
    return created


async def scaffold_project(
    db: AsyncSession, curriculum_project_id: int, _workspace_subdir: str = ""
) -> dict:
    """Create a real project directory from a curriculum project template."""
    from app.models.project import LearningProject

    result = await db.execute(
        select(CurriculumProject).where(CurriculumProject.id == curriculum_project_id)
    )
    cp = result.scalars().first()
    if not cp:
        raise ValueError(f"Curriculum project {curriculum_project_id} not found.")

    # Create a safe directory name from the title
    slug = re.sub(r"[^\w\s-]", "", cp.title.lower().strip())
    slug = re.sub(r"[\s_]+", "-", slug).strip("-") or "scaffolded-project"

    project_dir = settings.workspace_dir / slug
    project_dir.mkdir(parents=True, exist_ok=True)

    # Write scaffold files
    if cp.scaffold_files:
        files = json.loads(cp.scaffold_files)
        for f in files:
            fpath = project_dir / f["path"]
            fpath.parent.mkdir(parents=True, exist_ok=True)
            fpath.write_text(f["content"], encoding="utf-8")

    learning_project = LearningProject(
        name=cp.title,
        description=cp.description,
        tech_stack=cp.tech_stack,
        directory=slug,
    )
    db.add(learning_project)
    await db.flush()
    await db.refresh(learning_project)

    logger.info(
        "Scaffolded project '%s' at workspace/%s.", cp.title, slug,
    )
    return {
        "id": learning_project.id,
        "name": learning_project.name,
        "directory": slug,
    }
