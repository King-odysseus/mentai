# MentAi — Product Requirements Document

## Overview

MentAi (Mentor AI) is a **personal, project-based, full-stack learning platform** that turns roadmap.sh curriculum into real app-building exercises, guided by an AI tutor, with all progress and insights persisted via Cognitive1.

**Target user:** A learner with HTML/CSS foundations and some JavaScript, aiming to become a full-stack developer with Python backend — while holding a full-time job.

---

## Problem

Traditional coding education does not work for this situation:

- **Static tutorials and video courses** — passive, boring, no real application. You watch but do not build.
- **Bootcamps** — rigid schedule, cannot fit around a full-time job.
- **Scattered resources** — roadmap.sh tells you *what* to learn but not *how*. Documentation is reference, not curriculum.
- **No memory** — nothing tracks what you have learned, what you struggled with, what patterns you have seen. Every session starts cold.
- **No context** — generic exercises (todo app, weather widget) have nothing to do with the real apps you care about.

## Solution

A platform where you **learn by building real apps, guided by an AI tutor**, that:

1. Knows the full-stack roadmap from roadmap.sh
2. Knows your history — what you have learned, what you found hard, what patterns you have encountered — via Cognitive1
3. Creates a curriculum of real, progressively complex projects that teach concepts in context
4. Adapts to your time constraints — 5-minute micro-lessons on weekdays, 30+ minute deep-build sessions on free days
5. Lets you converse with the AI tutor naturally — ask questions, get explanations, request code reviews — all in context of what you are currently building

---

## Core Principles

### 1. Learn by Building
Every concept is taught in the context of a real application. No abstract exercises. You encounter "database relationships" because the app you are building needs them.

### 2. Adaptive Pacing
The platform knows the available time window and adjusts:
- **Weekday micro-sessions (5-15 min):** concept reviews, code walkthroughs, vocabulary drills, quick fixes.
- **Free day deep sessions (30-120 min):** building features, refactoring, architecture discussions, debugging.

### 3. Spaced Concept Introduction
Concepts are introduced in dependency order (per roadmap.sh), reinforced across multiple projects, and revisited when the platform detects you are shaky on them.

### 4. Pattern Recognition
The system identifies design patterns, architectural choices, and recurring techniques as they appear in your code. It names them, explains them, and tracks them so you build a mental library of patterns.

### 5. Memory-Driven
Cognitive1 is the memory layer. Every session, every concept mastered, every bug fixed, every question asked — persisted and cross-referenced. The tutor knows what you learned last week, what you struggled with last month, and what you are ready for next.

---

## Architecture (High-Level)

```
                         ┌──────────────────┐
                         │   roadmap.sh API  │
                         │  (curriculum,     │
                         │   skill tree)     │
                         └────────┬─────────┘
                                  │
┌──────────────┐         ┌───────▼─────────┐         ┌──────────────┐
│  DeepSeek    │◄────────│     MentAi      │────────►│  Cognitive1  │
│  (AI Tutor)  │         │    Platform     │         │  (Brain)     │
└──────────────┘         └───────┬─────────┘         └──────────────┘
                                  │
                         ┌───────▼─────────┐
                         │  Project Files  │
                         │  (learner's     │
                         │   actual code)  │
                         └─────────────────┘
```

- **MentAi Platform** — the web application that is the learner's workspace. Hosts project code, provides the chat interface, manages sessions.
- **DeepSeek API** — powers the AI tutor (conversational, code-aware).
- **roadmap.sh** — provides structured curriculum data (what to learn, in what order, for which role).
- **Cognitive1** — brain/memory layer. Persists learning history, concept mastery, pattern recognition, session logs, project state.

---

## Key Features

### Phase 1 — Foundation (MVP)

| Feature | Description |
|---------|-------------|
| **Project workspace** | Create and manage learning projects. Each project has a tech stack, description, and source files. |
| **AI tutor chat** | Conversational interface with the tutor. Tutor knows the current project, the roadmap, and the learner's history. |
| **Voice tutor (speak toggle)** | Human-like voice conversation. Speak to the tutor (STT) and hear responses out loud (TTS). Toggleable — text is primary, voice is an option like ChatGPT's voice mode. |
| **roadmap.sh integration** | Pull the Python backend + full-stack roadmap as the curriculum backbone. |
| **Cognitive1 integration** | Persist learning progress, concept exposure, session history. |
| **Session time awareness** | Tutor adapts responses to the available time window (micro vs deep session). |
| **Concept tracker** | Track which concepts have been introduced, practiced, and mastered. |

### Phase 2 — Enrichment

| Feature | Description |
|---------|-------------|
| **Curriculum project sequence** | Auto-generated sequence of projects that progressively introduce concepts. |
| **Pattern library** | Automatically identify and catalog design patterns as they appear in projects. |
| **Code review** | Tutor reviews code and provides feedback with roadmap-aware context. |
| **Progress dashboard** | Visual overview: concepts covered, projects built, patterns learned, sessions logged. |
| **Daily/weekly goals** | Adaptive goal-setting based on schedule and progress. |

### Phase 3 — Team

| Feature | Description |
|---------|-------------|
| **Multi-agent tutoring** | Leverage Cognitive1 to coordinate multiple teaching agents (different specializations). |
| **Peer project comparison** | See how different architectural choices play out in similar projects. |
| **Custom roadmap building** | Go beyond roadmap.sh — define your own learning path. |

---

## Tech Stack (Decided)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Backend** | Python (FastAPI) | Async-native, WebSocket support for real-time chat streaming. Auto-generated API docs. The platform is built in the same stack the learner is studying — the codebase doubles as reference material. |
| **Frontend** | HTML + CSS + vanilla JS (progressively enhanced) | Matches the learner's current skills. Server-rendered Jinja2 templates. No build step, no framework to learn before the learner is ready. Can evolve: Alpine.js or Web Components, then React when the learner reaches that stage. |
| **Code Editor** | CodeMirror 6 (vanilla JS embed) | Lighter than Monaco. Real Python execution on the backend — real filesystem, real pip, real git. |
| **Chat** | WebSocket streaming via FastAPI | Tutor responses appear word-by-word. Feels alive, not like waiting for a page load. |
| **Database** | SQLite (MVP) → PostgreSQL | Simple start, easy migration path. |
| **AI Integration** | DeepSeek API | Powers the tutor's text intelligence. |
| **Voice TTS** | Browser SpeechSynthesis with Microsoft Natural Voices | Human-like neural TTS on Windows (Jenny, Aria, Guy, Davis). Local, free, unlimited — same engine as Edge Read Aloud. Just select the right voice. No paid API needed. |
| **Voice STT** | Browser SpeechRecognition (MVP) → Whisper | Speech-to-text for learner voice input. Free browser API first, upgrade later. |
| **Curriculum** | Scraped from roadmap.sh, freeCodeCamp, The Odin Project, and others | Unified curriculum model normalized from multiple sources. Extensible — add more sources as needed. |
| **Memory** | Cognitive1 MCP | Brain, session history, concept tracking, pattern recognition. |
| **Project Files** | On disk (real filesystem) | Real git, real pip, real everything. Projects are portable and Cognitive1 can read them directly. |
| **Deployment** | Local-first | Runs where the learner is. |

### Progressive Enhancement Path

The frontend grows with the learner's skills — not ahead of them.

| Stage | Learner knows | Platform layer |
|-------|-------------|----------------|
| **Now** | HTML, CSS, basic JS | Server-rendered Jinja2 templates, forms, full-page navigation |
| **Soon** | FastAPI, HTTP, routes | Static files, template inheritance, basic JS interactivity |
| **Later** | WebSockets, async Python | Real-time tutor chat streaming, live code output |
| **Eventually** | REST APIs, fetch, DOM | Partial-page updates, smoother transitions |
| **Beyond** | React, component architecture, state | Platform frontend can be rebuilt in React as a learning project itself |

---

## Voice Tutor

The tutor can speak and listen. This is an optional layer on top of the text chat — the learner toggles it on or off, similar to ChatGPT's voice mode.

### Text-to-Speech (Tutor Speaks)

Uses the browser's built-in `SpeechSynthesis` API — but with the **Microsoft Natural Voices** that Windows ships with. These are the same neural TTS models that power Edge's Read Aloud:

- On-device neural processing — no cloud, no API key, no usage limit
- Human-like prosody, natural pausing, warm tone
- Completely free, forever, on Windows

| Voice | Gender | Accent |
|-------|--------|--------|
| Microsoft Aria (Natural) | Female | US English |
| Microsoft Jenny (Natural) | Female | US English |
| Microsoft Guy (Natural) | Male | US English |
| Microsoft Davis (Natural) | Male | US English |
| Microsoft Sonia (Natural) | Female | UK English |

**How it works:** Most apps sound robotic because they accept whatever voice `speechSynthesis` defaults to (usually David or Zira — the old non-neural voices). The fix is one line: enumerate available voices, pick one with `"Natural"` in the name. That is what Edge Read Aloud does.

**On Linux:** Natural voices may require installing `speech-dispatcher` and espeak-ng (functional but less human-like). For non-Windows platforms, a future upgrade path to ElevenLabs or OpenAI TTS remains available.

### Speech-to-Text (Learner Speaks)

| Stage | Engine | Quality |
|-------|--------|---------|
| **MVP (free)** | Browser SpeechRecognition API | Good accuracy in quiet environments. Zero cost, zero setup. |
| **Upgrade** | OpenAI Whisper | Better accuracy, handles code terms, accents, and noisy environments. |

### How It Works

1. Learner clicks the speaker icon in the chat panel — voice mode on.
2. Microphone activates (browser `SpeechRecognition` captures speech).
3. Learner speaks a question. Text appears in the chat input. Sent to DeepSeek.
4. DeepSeek's text response streams back via WebSocket — displayed in chat AND spoken by TTS simultaneously (Microsoft Natural voice).
5. Voice stops when the response is done, or learner can interrupt (tap to stop speaking).
6. Learner clicks speaker icon again — voice mode off, back to text-only.

---

## UI Layout

Three-panel workspace for learning sessions. Dashboard for overview.

### Workspace Layout

```
┌──────────┬──────────────────────┐
│          │                      │
│  File    │    Code Editor       │
│  Tree    │    (CodeMirror 6)    │
│          │                      │
│  ─ .py   │                      │
│  ─ .html │                      │
│  ─ .css  │                      │
│          ├──────────────────────┤
│          │                      │
│          │    AI Tutor Chat     │
│          │    (streaming text)  │
│          │    [speaker icon]    │
│          │    (toggle voice)    │
│          │                      │
└──────────┴──────────────────────┘
```

### Dashboard

Project overview, progress charts, concept tracker, session history, daily goals. Switches to workspace when a learning session starts.

---

## Success Metrics

- **Session consistency** — the learner shows up regularly, even for 5-minute micro-sessions.
- **Concept retention** — concepts mastered are still recognized in later sessions.
- **Project completion** — real apps get built, not abandoned.
- **Growing independence** — over time, the learner needs the tutor less for things they have mastered.
- **Full-stack readiness** — the learner can independently design, build, and deploy a full-stack application.

---

## Resolved Decisions

1. **Tech stack:** Python (FastAPI) backend, HTML/CSS/vanilla JS frontend, progressively enhanced. FastAPI chosen for async/WebSocket support and because it is the learner's target stack.
2. **Curriculum:** Scraped from roadmap.sh, freeCodeCamp, The Odin Project, and other sources. Ingested into a unified curriculum model. Extensible to add more sources later.
3. **UI:** Dashboard for overview + three-panel workspace (file tree, code editor, chat) for learning sessions.
4. **Project files:** On disk. Real filesystem, real git, real pip. Portable and Cognitive1-readable.
5. **Voice tutor:** Speak toggle like ChatGPT voice mode. Uses browser SpeechSynthesis with Microsoft Natural Voices (Jenny, Aria, Guy, Davis) — same engine as Edge Read Aloud. Local, free, human-like on Windows. Browser SpeechRecognition for STT. No paid API needed.

---

*Created 2026-05-31. Updated with architecture decisions 2026-05-31. This is a living document.*
