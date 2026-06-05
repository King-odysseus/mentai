# MentAi React Frontend Rewrite — Comprehensive Implementation Plan

**Created:** 2026-06-05  
**Status:** Planning — not yet implemented  
**Estimated effort:** 8-12 focused sessions (40-60 hours total)  
**Backend changes:** Zero API changes, minor serving changes (Jinja2 removal, SPA static serving)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design System: Neumorphism + Glassmorphism](#2-design-system-neumorphism--glassmorphism)
3. [Project Structure and Tooling](#3-project-structure-and-tooling)
4. [Complete Component Tree](#4-complete-component-tree)
5. [Component Specifications](#5-component-specifications)
6. [State Management Architecture](#6-state-management-architecture)
7. [Data Flow: API, WebSocket, and TanStack Query](#7-data-flow-api-websocket-and-tanstack-query)
8. [Route Design](#8-route-design)
9. [File-by-File Migration Map](#9-file-by-file-migration-map)
10. [Implementation Phases (Step-by-Step)](#10-implementation-phases-step-by-step)
11. [Backend Changes](#11-backend-changes)
12. [What Gets Deleted](#12-what-gets-deleted)
13. [Edge Cases and Risks](#13-edge-cases-and-risks)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Architecture Overview

### Before (Current)

```
Browser
  ├── Jinja2 server-rendered HTML (templates/)
  ├── Vanilla JS modules (~1,800 lines across 11 files)
  ├── Plain CSS (4 files, glassmorphism)
  ├── CodeMirror 6 via CDN esm.sh import
  └── Global objects: Chat, Editor, FileTree, LearningPath, Voice, Compare, Goals, PatternLibrary

FastAPI (port 9000)
  ├── Page routes → Jinja2 TemplateResponse (/, /onboarding, /workspace/{id})
  ├── Static file mount → /static/*
  ├── API routes → JSON (/api/*)
  └── WebSocket → /ws/chat/{project_id}
```

### After (Target)

```
Browser (React SPA)
  ├── Vite dev server (port 5173) → proxies API to FastAPI (port 9000)
  ├── React 19 + TypeScript
  ├── React Router v7 (client-side routing)
  ├── Zustand (global UI state)
  ├── TanStack Query v5 (server state, caching)
  ├── @uiw/react-codemirror (CodeMirror 6 React wrapper)
  ├── rehype / remark (markdown rendering)
  ├── CSS Modules + CSS custom properties (neumorphism + glassmorphism)
  └── No global objects — everything is a React component or hook

FastAPI (port 9000)
  ├── Page routes REMOVED (no more Jinja2)
  ├── Static file mount → serves Vite build in production
  ├── API routes → JSON (/api/*) — UNCHANGED
  └── WebSocket → /ws/chat/{project_id} — UNCHANGED
```

### Key Principle

**The backend is frozen.** All 29 REST endpoints and the WebSocket protocol remain exactly as they are. The React frontend is a pure client that consumes the existing API. This minimizes risk — if the React rewrite has issues, the vanilla JS version still works as long as templates exist.

---

## 2. Design System: Neumorphism + Glassmorphism

### Visual Hierarchy

| Surface Type | Style | Where Used |
|---|---|---|
| **Page background** | Subtle gradient + neumorphic texture | Behind everything |
| **Cards (primary)** | Neumorphism — soft outer shadow + subtle inner highlight | Dashboard cards, stat cards, form sections |
| **Interactive elements** | Neumorphic raised — light shadow bottom-right, dark shadow top-left | Buttons, inputs, selects |
| **Pressed/active** | Neumorphic inset — shadows flip inward | Active buttons, selected items |
| **Modals** | Glassmorphism — frosted glass, backdrop blur | New Project modal, Compare modal, onboarding overlay |
| **Chat panel** | Glassmorphism — translucent with blur | Right panel in workspace |
| **Top nav** | Neumorphic flat — subtle shadow, solid-ish | Navigation bar |
| **Code editor** | Dark surface, no neumorphism | Center panel in workspace |

### CSS Custom Properties (Design Tokens)

```css
:root {
  /* === Neumorphism (primary design language) === */

  /* Background */
  --neo-bg: #e8ecf1;                    /* Light mode background */
  --neo-bg-dark: #1a1d23;              /* Dark mode background */

  /* Neumorphic surfaces */
  --neo-surface: #e8ecf1;              /* Card/panel background (matches bg) */
  --neo-surface-elevated: #ecf0f3;     /* Slightly lighter for raised elements */

  /* Neumorphic shadows — light mode */
  --neo-shadow-dark: rgba(163, 177, 198, 0.5);   /* Dark shadow (bottom-right) */
  --neo-shadow-light: rgba(255, 255, 255, 0.8);   /* Light shadow (top-left) */
  --neo-shadow-inset-dark: rgba(163, 177, 198, 0.3);
  --neo-shadow-inset-light: rgba(255, 255, 255, 0.6);

  /* Neumorphic shadows — dark mode */
  --neo-shadow-dark-dm: rgba(0, 0, 0, 0.4);
  --neo-shadow-light-dm: rgba(255, 255, 255, 0.05);

  /* Neo shadow presets */
  --neo-raised: 6px 6px 12px var(--neo-shadow-dark),
                -6px -6px 12px var(--neo-shadow-light);
  --neo-raised-sm: 3px 3px 6px var(--neo-shadow-dark),
                    -3px -3px 6px var(--neo-shadow-light);
  --neo-inset: inset 4px 4px 8px var(--neo-shadow-inset-dark),
               inset -4px -4px 8px var(--neo-shadow-inset-light);
  --neo-inset-sm: inset 2px 2px 4px var(--neo-shadow-inset-dark),
                  inset -2px -2px 4px var(--neo-shadow-inset-light);

  /* === Glassmorphism (selective accents) === */

  --glass-surface: rgba(255, 255, 255, 0.08);
  --glass-surface-hover: rgba(255, 255, 255, 0.14);
  --glass-border: rgba(255, 255, 255, 0.10);
  --glass-border-hover: rgba(255, 255, 255, 0.20);
  --blur-sm: blur(8px);
  --blur-md: blur(16px);
  --blur-lg: blur(24px);
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.3);

  /* === Shared === */

  /* Colors */
  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;
  --color-primary-light: rgba(124, 58, 237, 0.12);
  --color-accent: #059669;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;

  /* Typography */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 0.9375rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-round: 50%;

  /* Transitions */
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Dark mode overrides */
[data-theme="dark"] {
  --neo-bg: #1a1d23;
  --neo-surface: #1e2128;
  --neo-surface-elevated: #252830;
  --neo-shadow-dark: rgba(0, 0, 0, 0.5);
  --neo-shadow-light: rgba(255, 255, 255, 0.03);
  --neo-shadow-inset-dark: rgba(0, 0, 0, 0.4);
  --neo-shadow-inset-light: rgba(255, 255, 255, 0.02);
}
```

### CSS Utility Classes

```css
/* Neumorphic card */
.neo-card {
  background: var(--neo-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--neo-raised);
  padding: var(--space-lg);
}

/* Neumorphic raised button */
.neo-btn {
  background: var(--neo-surface);
  border: none;
  border-radius: var(--radius-md);
  box-shadow: var(--neo-raised-sm);
  padding: 10px 22px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
}
.neo-btn:hover {
  box-shadow: var(--neo-raised);
  transform: translateY(-1px);
}
.neo-btn:active {
  box-shadow: var(--neo-inset-sm);
  transform: translateY(0);
}

/* Neumorphic input */
.neo-input {
  background: var(--neo-surface);
  border: none;
  border-radius: var(--radius-md);
  box-shadow: var(--neo-inset-sm);
  padding: 12px 16px;
  color: var(--glass-text);
}
.neo-input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

/* Glassmorphic overlay */
.glass-overlay {
  background: var(--glass-surface);
  backdrop-filter: var(--blur-lg);
  -webkit-backdrop-filter: var(--blur-lg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
}

/* Glassmorphic modal */
.glass-modal {
  background: var(--glass-surface);
  backdrop-filter: var(--blur-xl);
  -webkit-backdrop-filter: var(--blur-xl);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
}
```

---

## 3. Project Structure and Tooling

### New Directory Layout

```
mentai/
  frontend/                         # NEW — React SPA
    package.json
    tsconfig.json
    vite.config.ts
    index.html                      # Vite entry point
    public/
      favicon.svg
    src/
      main.tsx                      # React entry, renders <App />
      App.tsx                       # Router + providers + layout
      vite-env.d.ts

      styles/
        tokens.css                  # CSS custom properties (neo + glass)
        neumorphism.css             # .neo-card, .neo-btn, .neo-input, shadows
        glassmorphism.css           # .glass-overlay, .glass-modal, blurs
        global.css                  # Reset, body, typography, scrollbar
        markdown.css                # Rendered markdown in chat

      hooks/
        useWebSocket.ts             # WebSocket connection + message dispatch
        useTheme.ts                 # Dark/light toggle + localStorage
        useVoice.ts                 # STT + TTS wrapper
        useResizablePanel.ts        # Drag-to-resize logic
        useKeyboardShortcuts.ts     # Ctrl+S, etc.
        useAutoSave.ts              # Debounced auto-save for editor

      stores/
        uiStore.ts                  # Theme, sidebar collapsed, panel sizes
        chatStore.ts                # Messages, streaming state, session state
        editorStore.ts              # Current file, dirty state, language mode
        workspaceStore.ts           # Active project ID, file list

      services/
        api.ts                      # Axios or fetch wrapper, base URL, error handling
        projectsApi.ts              # /api/projects/* endpoints
        conceptsApi.ts              # /api/concepts/* endpoints
        patternsApi.ts              # /api/patterns/* endpoints
        goalsApi.ts                 # /api/goals/* endpoints
        profileApi.ts               # /api/profile/* endpoints
        dashboardApi.ts             # /api/dashboard/* endpoints

      types/
        project.ts                  # Project, ProjectCreate, ProjectResponse, etc.
        concept.ts                  # ConceptExposure, MasteryUpdate
        goal.ts                     # Goal, GoalCreate, GoalUpdate
        pattern.ts                  # DesignPattern, PatternCreate
        profile.ts                  # UserProfile, ProfileCreate
        chat.ts                     # WebSocket message types
        dashboard.ts                # Stats, Progress response types

      pages/
        OnboardingPage.tsx
        DashboardPage.tsx
        WorkspacePage.tsx

      components/
        layout/
          AppLayout.tsx             # Top nav + <Outlet /> + theme provider
          TopNav.tsx                # Brand, nav links, theme toggle

        dashboard/
          StatsRow.tsx              # 4 stat cards
          ProjectList.tsx           # Project cards + compare select
          QuickSession.tsx          # Micro/Deep session buttons
          GoalsWidget.tsx           # Today's goals + suggestions
          PatternLibrary.tsx        # Patterns grouped by category
          SessionChart.tsx          # 14-day bar chart
          MasteryDonut.tsx          # SVG donut + legend
          RecentlyMastered.tsx      # Recently mastered concept list
          LearningPathWidget.tsx    # Expandable module/concept tree
          NewProjectModal.tsx       # Create project dialog
          CompareModal.tsx          # Compare two projects (files/concepts/patterns)

        workspace/
          WorkspaceLayout.tsx       # Three-panel grid + resize handles
          FileTree.tsx              # File list + new file button
          FileTreeItem.tsx          # Single file row with icon
          LearningPathPanel.tsx     # AI learning path in left sidebar
          CodeEditor.tsx            # CodeMirror 6 wrapper
          EditorToolbar.tsx         # Save, Run, Preview, Review buttons
          OutputPanel.tsx           # Console output + HTML preview iframe
          OutputConsole.tsx         # Text output display
          LivePreview.tsx           # Iframe for HTML preview
          TutorChat.tsx             # Chat messages + input + WebSocket
          ChatMessage.tsx           # Single message bubble
          ChatInput.tsx             # Textarea + send button
          SessionControls.tsx       # Mode selector (Micro/Deep)
          VoiceToggle.tsx           # Speaker icon + status indicator
          SpecialistBadge.tsx       # Shows which AI specialist is active
          ConceptToast.tsx          # Mastery level toast notification
          EditorCollapseToggle.tsx  # Show/hide editor button

        shared/
          Button.tsx                # <Button variant="neo-primary" />
          Card.tsx                  # <Card> wrapper with neo styles
          Input.tsx                 # <Input> with neo inset shadow
          Select.tsx                # <Select> styled select
          Modal.tsx                 # <Modal> with glassmorphism
          EmptyState.tsx            # "Nothing here yet" placeholder
          Spinner.tsx               # Loading spinner
          Toast.tsx                 # Toast notification system
          Badge.tsx                 # Status badge
          ProgressBar.tsx           # Animated progress bar
  ...
  (backend files unchanged)
```

### Tooling Decisions

| Tool | Version | Purpose |
|---|---|---|
| `react` | ^19.0 | UI library |
| `react-dom` | ^19.0 | DOM renderer |
| `react-router-dom` | ^7.0 | Client-side routing |
| `zustand` | ^5.0 | Global state (theme, UI, chat) |
| `@tanstack/react-query` | ^5.0 | Server state, caching, refetching |
| `@uiw/react-codemirror` | ^4.23 | CodeMirror 6 React wrapper |
| `@codemirror/lang-python` | ^6.1 | Python syntax |
| `@codemirror/lang-html` | ^6.4 | HTML syntax |
| `@codemirror/lang-css` | ^6.3 | CSS syntax |
| `@codemirror/lang-javascript` | ^6.2 | JS syntax |
| `@codemirror/theme-one-dark` | ^6.1 | One Dark theme |
| `react-markdown` | ^9.0 | Markdown rendering in chat |
| `remark-gfm` | ^4.0 | GFM tables, strikethrough |
| `rehype-highlight` | ^7.0 | Syntax highlighting in code blocks |
| `typescript` | ^5.6 | Type safety |
| `vite` | ^6.0 | Build tool + dev server |
| `@vitejs/plugin-react` | ^4.3 | Vite React plugin |

### Vite Configuration

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:9000",
      "/ws": {
        target: "ws://localhost:9000",
        ws: true,
      },
    },
  },
  build: {
    outDir: "../static/spa",
    emptyOutDir: true,
  },
});
```

---

## 4. Complete Component Tree

```
<App>
  <QueryClientProvider>
    <ThemeProvider>                          ← reads/writes localStorage, sets data-theme
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>   ← TopNav + <Outlet />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/workspace/:projectId" element={<WorkspacePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
</App>

<!-- ===== AppLayout ===== -->
<AppLayout>
  <TopNav>
    <BrandLink />                           ← "MentAi" → /
    <NavLink to="/" />                      ← Dashboard
    <ThemeToggle />                         ← Sun/moon button
  </TopNav>
  <main>
    <Outlet />
  </main>
</AppLayout>

<!-- ===== OnboardingPage ===== -->
<OnboardingPage>
  <OnboardingHeader />                      ← Title + subtitle
  <OnboardingForm>                          ← Controlled form
    <NameSection>                           ← "What should we call you?"
      <Input name="name" />
    </NameSection>
    <ExperienceSection>                     ← 4 selects (Python, JS, HTML/CSS, DB)
      <Select name="python_level" />
      <Select name="javascript_level" />
      <Select name="html_css_level" />
      <Select name="database_level" />
    </ExperienceSection>
    <StackPreferencesSection>               ← 5 selects (backend, frontend, DB, goal, time)
      <Select name="preferred_backend" />
      <Select name="preferred_frontend" />
      <Select name="preferred_database" />
      <Select name="learning_goal" />
      <Select name="time_per_week" />
    </StackPreferencesSection>
    <SubmitButton />                        ← "Create Account & Start Learning"
  </OnboardingForm>
</OnboardingPage>

<!-- ===== DashboardPage ===== -->
<DashboardPage>
  <DashboardHeader />                       ← Welcome back, {name}

  <StatsRow>                                ← 4 stat cards from /api/dashboard/stats
    <StatCard label="Projects" />
    <StatCard label="Concepts Tracked" />
    <StatCard label="Sessions" />
    <StatCard label="Mastered" />
  </StatsRow>

  <div className="dash-grid">              ← CSS grid, 2fr 1fr
    <!-- Left column -->
    <ProjectList>                           ← from /api/projects
      <ProjectItem />                       ← click → navigate to workspace
      <ProjectItem />
      <Button "New Project" />              ← opens NewProjectModal
    </ProjectList>

    <!-- Right column -->
    <QuickSession>                          ← Micro / Deep buttons
      <SessionButton mode="micro" />
      <SessionButton mode="deep" />
    </QuickSession>

    <ConceptMasterySummary>                 ← from /api/dashboard/stats
      <MasteryBar level="introduced" />
      <MasteryBar level="practiced" />
      <MasteryBar level="confident" />
      <MasteryBar level="mastered" />
    </ConceptMasterySummary>

    <GoalsWidget>                           ← from /api/goals/today
      <GoalItem />                          ← progress bar + description
      <GoalSuggestion />                    ← clickable suggestion
    </GoalsWidget>

    <PatternLibrary>                        ← from /api/patterns
      <PatternGroup category="creational">
        <PatternItem />
      </PatternGroup>
    </PatternLibrary>
  </div>

  <div className="dash-grid">              ← second row
    <SessionChart />                        ← 14-day bar chart (pure div bars, no lib)
    <div>
      <MasteryDonut />                      ← SVG donut chart
      <RecentlyMastered />                  ← list of mastered concepts
    </div>
  </div>

  <LearningPathWidget />                    ← expandable module/concept tree

  <!-- Modals (portaled) -->
  <NewProjectModal />                       ← <dialog> or portal
  <CompareModal />                          ← <dialog> or portal
</DashboardPage>

<!-- ===== WorkspacePage ===== -->
<WorkspacePage>
  <WorkspaceLayout>                         ← CSS grid: 220px 1fr 4px 340px

    <!-- Left Panel -->
    <LeftPanel>
      <FileTree>                            ← from /api/projects/:id/files
        <FileTreeHeader>                    ← "Files" + refresh + new file button
        <FileTreeItem />                    ← click → load into editor
        <FileTreeItem />
      </FileTree>
      <LearningPathPanel>                   ← from /api/projects/:id (learning_path field)
        <ModuleHeader />                    ← expandable
        <ConceptItem />                     ← click → teach_concept via WebSocket
      </LearningPathPanel>
    </LeftPanel>

    <!-- Center Panel -->
    <CenterPanel>
      <EditorToolbar>                       ← file title + action buttons
        <EditorTitle />                     ← "📝 filename.py" or "● filename.py"
        <Button "Save" />
        <Button "Run" />
        <Button "Preview" />
        <Button "Review" />
        <EditorCollapseToggle />            ← ◀/▶ button
      </EditorToolbar>
      <CodeEditor>                          ← CodeMirror 6 via @uiw/react-codemirror
        <!-- language auto-detected from file extension -->
      </CodeEditor>
      <OutputPanel>                         ← resizable, collapsible
        <OutputResizeHandle />
        <OutputTabs>                        ← Console | Preview
          <OutputTab panel="console" />
          <OutputTab panel="preview" />
        </OutputTabs>
        <OutputConsole />                   ← pre > code, shows stdout/stderr
        <LivePreview />                     ← iframe, shows HTML/CSS/JS
        <CloseButton />
      </OutputPanel>
    </CenterPanel>

    <!-- Resize Handle -->
    <PanelResizeHandle />                   ← draggable vertical divider

    <!-- Right Panel -->
    <RightPanel>
      <TutorChat>                           ← WebSocket-managed chat
        <ChatHeader>
          <SpecialistBadge />               ← PyMentor / DataMentor / UIMentor / Mentor
          <EditorCollapseToggle />           ← ◀/▶
          <VoiceToggle />                   ← speaker icon
          <SessionControls />               ← Micro / Deep select
        </ChatHeader>
        <ChatMessages>                      ← scrollable message list
          <ChatMessage role="tutor" />      ← rendered markdown
          <ChatMessage role="learner" />    ← plain text
        </ChatMessages>
        <ChatInput>                         ← textarea + send button
          <textarea />
          <SendButton />
        </ChatInput>
        <VoiceStatus />                     ← "Listening..." / "Tutor speaking..." indicator
      </TutorChat>
    </RightPanel>

    <!-- Voice overlay (portaled to body) -->
    <ConceptToast />                        ← animated mastery notification
  </WorkspaceLayout>
</WorkspacePage>
```

---

## 5. Component Specifications

### 5.1 Layout Components

#### AppLayout
- **Path:** `components/layout/AppLayout.tsx`
- **State:** reads theme from `uiStore`
- **Renders:** `TopNav` + `<Outlet />` (React Router)
- **Side effects:** Sets `data-theme` attribute on `<html>` on mount and on theme change

#### TopNav
- **Path:** `components/layout/TopNav.tsx`
- **Contains:** Brand link, Dashboard nav link, ThemeToggle button
- **Style:** Neumorphic flat bar, sticky top, z-index 100

#### ThemeToggle
- **Path:** `components/shared/ThemeToggle.tsx` (or inline in TopNav)
- **State:** reads/writes `uiStore.theme`
- **Side effects:** Toggles `data-theme` on `<html>`, persists to localStorage key `mentai_theme`

### 5.2 Dashboard Components

#### StatsRow
- **Path:** `components/dashboard/StatsRow.tsx`
- **Data:** `useQuery` → `GET /api/dashboard/stats`
- **Renders:** 4 `StatCard` components in a CSS grid (4 columns)
- **States:** Loading (skeleton), loaded, error

#### ProjectList
- **Path:** `components/dashboard/ProjectList.tsx`
- **Data:** `useQuery` → `GET /api/projects`
- **Renders:** List of project cards + "New Project" button
- **Interaction:** Click project → `navigate(/workspace/${id})`, Compare button → selects for comparison
- **States:** Empty ("No projects yet"), loading, loaded, error

#### QuickSession
- **Path:** `components/dashboard/QuickSession.tsx`
- **Interaction:** Micro button → `navigate(/workspace/${firstProjectId}?mode=micro)`, Deep → `?mode=deep`
- **States:** No projects (shows hint to create one first), ready

#### GoalsWidget
- **Path:** `components/dashboard/GoalsWidget.tsx`
- **Data:** `useQuery` → `GET /api/goals/today`
- **Renders:** Goal items with progress bars + clickable suggestions
- **Interaction:** Click suggestion → `useMutation` → `POST /api/goals` → invalidate query
- **States:** Loading, empty ("No goals today"), loaded, error

#### PatternLibrary
- **Path:** `components/dashboard/PatternLibrary.tsx`
- **Data:** `useQuery` → `GET /api/patterns`
- **Renders:** Patterns grouped by category
- **States:** Empty ("Patterns will appear here as you build"), loading, loaded

#### SessionChart
- **Path:** `components/dashboard/SessionChart.tsx`
- **Data:** From `GET /api/dashboard/progress` → `daily_sessions` field
- **Renders:** Pure div/CSS bar chart — no chart library. Max height 120px, proportional bars
- **States:** Empty ("No sessions in the last 14 days"), loading, loaded

#### MasteryDonut
- **Path:** `components/dashboard/MasteryDonut.tsx`
- **Data:** From `GET /api/dashboard/progress` → `mastery_distribution` field
- **Renders:** SVG donut chart (4 segments) + color legend
- **Colors:** introduced=#f0c040, practiced=#54aeff, confident=#4ac26b, mastered=#8250df

#### NewProjectModal
- **Path:** `components/dashboard/NewProjectModal.tsx`
- **Style:** Glassmorphism modal (`<dialog>` element)
- **Form fields:** Name (required), Description, Tech Stack
- **Submit:** `useMutation` → `POST /api/projects` → navigate to new workspace
- **States:** Idle, submitting, validation error, API error

#### CompareModal
- **Path:** `components/dashboard/CompareModal.tsx`
- **Style:** Glassmorphism modal
- **Tabs:** Files, Concepts, Patterns
- **Data:** `useQuery` → `GET /api/projects/compare/{idA}/{idB}`
- **Interaction:** Select two projects from ProjectList, then modal opens
- **States:** No selection, comparing (loading), results loaded

### 5.3 Workspace Components

#### WorkspaceLayout
- **Path:** `components/workspace/WorkspaceLayout.tsx`
- **State:** Reads `workspaceStore` for active project, `uiStore` for panel sizes
- **Renders:** Three-panel CSS grid with resize handle
- **Grid template:** `220px 1fr 4px 340px` (or `220px 0fr 0px 1fr` when editor collapsed)
- **Resize:** `useResizablePanel` hook manages drag behavior

#### FileTree
- **Path:** `components/workspace/FileTree.tsx`
- **Data:** `useQuery` → `GET /api/projects/${projectId}/files` (polling every 30s)
- **Renders:** List of `FileTreeItem` components + "New File" button in footer
- **Interaction:** Click item → `useMutation` → `GET .../files/content?path=...` → load into editor
- **New file:** Prompt for name → `POST /api/projects/${id}/files` → refetch

#### CodeEditor
- **Path:** `components/workspace/CodeEditor.tsx`
- **Wrapper around:** `@uiw/react-codemirror`
- **State:** Reads `editorStore` for current file path, content, language
- **Language detection:** Auto-sets based on file extension (.py → python, .html → html, .css → css, .js → javascript)
- **Save:** Ctrl+S or button → auto-format (tabs→spaces, trim trailing whitespace) → `PUT /api/projects/${id}/files/content`
- **Run:** Auto-save first → `POST /api/projects/${id}/run` → show in OutputConsole
- **Preview:** Sets iframe src → `/api/projects/${id}/serve/${filePath}`
- **Review:** Prompts for focus → dispatches `code-review-requested` event (or calls chat hook)
- **Dirty indicator:** Compares current content with original, shows ● prefix on title

#### OutputPanel
- **Path:** `components/workspace/OutputPanel.tsx`
- **State:** Reads `editorStore` for output text, preview URL, visibility
- **Contains:** Resize handle (drag up/down), tabs (Console/Preview), close button
- **Console tab:** `<pre>` with stdout/stderr text
- **Preview tab:** `<iframe>` with sandbox attributes, live-reload on save
- **Resize:** `useResizablePanel` hook (vertical, min 80px, max 60vh)

#### TutorChat
- **Path:** `components/workspace/TutorChat.tsx`
- **State:** Reads `chatStore` for messages, streaming state, session mode, specialist
- **WebSocket:** Uses `useWebSocket` hook at `/ws/chat/${projectId}`
- **Renders:** Message list (scrollable), input area, session controls
- **Auto-scroll:** Scrolls to bottom on new message, unless user has scrolled up
- **Initial message:** "Hi! I'm Mentor, your AI tutor..." shown when chat is empty

#### ChatMessage
- **Path:** `components/workspace/ChatMessage.tsx`
- **Props:** `role` ("tutor" | "learner"), `content` (string), `isStreaming` (boolean)
- **Tutor rendering:** `react-markdown` with `remark-gfm` and `rehype-highlight`
- **Learner rendering:** Plain text, escaped
- **Style:** Tutor = left-aligned, glass border; Learner = right-aligned, primary color bg
- **Streaming:** Subtle border glow when `isStreaming` is true

#### ChatInput
- **Path:** `components/workspace/ChatInput.tsx`
- **Interaction:** Enter to send (no Shift), Shift+Enter for newline
- **Voice integration:** Reads from `useVoice` hook — STT fills the textarea
- **States:** Disabled during streaming, placeholder text

#### VoiceToggle
- **Path:** `components/workspace/VoiceToggle.tsx`
- **Hook:** `useVoice` manages STT + TTS
- **States:** Off (🔇), On + listening (🔊 with pulse), On + speaking (🔊 with different color)
- **TTS:** Listens for `tutor-response-complete` event, speaks response text
- **TTS text cleaning:** Strips code blocks before speaking

#### ConceptToast
- **Path:** `components/workspace/ConceptToast.tsx`
- **Portal:** Rendered to `document.body` via `createPortal`
- **Animation:** Slides up from bottom-right, auto-dismisses after 3s
- **Mastery icons:** 🌱 introduced, 🌿 practiced, 🪴 confident, 🌳 mastered

### 5.4 Shared Components

#### Button
- **Path:** `components/shared/Button.tsx`
- **Props:** `variant` ("neo-primary" | "neo-secondary" | "neo-danger" | "glass" | "icon"), `size` ("sm" | "md" | "lg"), `loading`
- **Style:** Neumorphic raised (primary) or glassmorphic (glass variant)

#### Card
- **Path:** `components/shared/Card.tsx`
- **Props:** `variant` ("neo" | "glass"), `hover` (boolean), `padding`, `className`
- **Style:** `neo` = neumorphic raised shadow, `glass` = frosted glass

#### Modal
- **Path:** `components/shared/Modal.tsx`
- **Uses:** `<dialog>` element with `.showModal()`
- **Style:** Glassmorphism backdrop + container
- **Props:** `open`, `onClose`, `title`, `children`
- **Close:** Backdrop click, Escape key, close button

#### Input / Select
- **Path:** `components/shared/Input.tsx`, `components/shared/Select.tsx`
- **Style:** Neumorphic inset shadow
- **States:** Default, focus, error, disabled

#### EmptyState
- **Path:** `components/shared/EmptyState.tsx`
- **Props:** `message` (string), `action` (optional ReactNode — e.g., a button)
- **Style:** Centered, muted text

#### ProgressBar
- **Path:** `components/shared/ProgressBar.tsx`
- **Props:** `value`, `max`, `label`, `color`
- **Style:** Neumorphic inset background, colored fill, animated transition

---

## 6. State Management Architecture

### Zustand Stores (Global UI State)

```typescript
// stores/uiStore.ts
interface UIState {
  theme: "dark" | "light";
  editorCollapsed: boolean;
  panelRatio: number;  // ratio of editor width to chat width (0.0 - 1.0)
  outputPanelHeight: number;
  outputPanelVisible: boolean;
  outputActiveTab: "console" | "preview";

  toggleTheme: () => void;
  setEditorCollapsed: (collapsed: boolean) => void;
  setPanelRatio: (ratio: number) => void;
  // ...
}
```

```typescript
// stores/chatStore.ts
interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionMode: "micro" | "deep";
  sessionId: number | null;
  specialist: { name: string; specialization: string } | null;
  voiceEnabled: boolean;

  addMessage: (msg: ChatMessage) => void;
  appendDelta: (text: string) => void;
  finishStreaming: () => void;
  setSessionMode: (mode: "micro" | "deep") => void;
  // ...
}
```

```typescript
// stores/editorStore.ts
interface EditorState {
  currentFilePath: string | null;
  currentContent: string;
  originalContent: string;
  isDirty: boolean;
  language: "python" | "html" | "css" | "javascript" | null;
  outputText: string;
  previewUrl: string | null;

  openFile: (path: string, content: string) => void;
  setContent: (content: string) => void;
  markSaved: () => void;
  setOutput: (text: string) => void;
  // ...
}
```

### Why Zustand Instead of Context or Redux?

1. **Minimal boilerplate** — a store is a single function call, no providers needed
2. **Selective subscriptions** — components only re-render when their slice changes
3. **Outside-React access** — WebSocket handlers can update stores directly
4. **No wrapping hell** — no `<Provider>` nesting

### TanStack Query (Server State)

All API data is managed by TanStack Query. Key queries:

```typescript
// Query keys
const queryKeys = {
  dashboard: {
    stats: ["dashboard", "stats"] as const,
    progress: ["dashboard", "progress"] as const,
  },
  projects: {
    all: ["projects"] as const,
    byId: (id: number) => ["projects", id] as const,
    files: (id: number) => ["projects", id, "files"] as const,
    fileContent: (id: number, path: string) => ["projects", id, "files", path] as const,
    compare: (idA: number, idB: number) => ["projects", "compare", idA, idB] as const,
  },
  concepts: {
    byProject: (id: number) => ["concepts", "project", id] as const,
    due: (id: number) => ["concepts", "due", id] as const,
  },
  patterns: {
    all: ["patterns"] as const,
    byProject: (id: number) => ["patterns", "project", id] as const,
  },
  goals: {
    today: ["goals", "today"] as const,
  },
  profile: {
    current: ["profile"] as const,
  },
};
```

**Cache invalidation rules:**
- After file save → invalidate `["projects", id, "files"]`
- After goal create → invalidate `["goals", "today"]`
- After project create → invalidate `["projects"]` + `["dashboard", "stats"]`
- After session end → invalidate `["dashboard", "progress"]` + `["dashboard", "stats"]`

---

## 7. Data Flow: API, WebSocket, and TanStack Query

### 7.1 REST API Calls

```typescript
// services/api.ts
const BASE = "";  // Vite proxy handles /api → localhost:9000

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(url: string) => apiFetch<T>(url),
  post: <T>(url: string, data?: unknown) =>
    apiFetch<T>(url, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(url: string, data: unknown) =>
    apiFetch<T>(url, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(url: string, data: unknown) =>
    apiFetch<T>(url, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};
```

### 7.2 WebSocket Hook

```typescript
// hooks/useWebSocket.ts
function useWebSocket(projectId: number) {
  const addDelta = useChatStore((s) => s.appendDelta);
  const finishStreaming = useChatStore((s) => s.finishStreaming);
  const setSpecialist = useChatStore((s) => s.setSpecialist);
  const setSessionId = useChatStore((s) => s.setSessionId);
  // ...

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws/chat/${projectId}`);

    ws.onopen = () => {
      send({ type: "session_start", mode: "micro", available_minutes: 10 });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "delta":         addDelta(data.content); break;
        case "done":          finishStreaming(); break;
        case "error":         /* show error toast */ break;
        case "session_started": setSessionId(data.session_id); break;
        case "session_ended":   /* update session state */ break;
        case "specialist":      setSpecialist(data.name, data.specialization); break;
        case "cycle_complete":
        case "concept_exposed": /* show concept toast */ break;
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [projectId]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
```

### 7.3 Voice Hook

```typescript
// hooks/useVoice.ts
function useVoice() {
  const [enabled, setEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Fill chat input + auto-send after brief pause
      onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
  }, []);

  // TTS: listen for tutor-response-complete event
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (enabled) speak(e.detail.text);
    };
    document.addEventListener("tutor-response-complete", handler);
    return () => document.removeEventListener("tutor-response-complete", handler);
  }, [enabled]);

  const startListening = () => recognitionRef.current?.start();
  const stopListening = () => recognitionRef.current?.stop();
  const speak = (text: string) => {
    // Strip code blocks, use SpeechSynthesis with preferred Natural voice
  };
  const stopSpeaking = () => speechSynthesis.cancel();
  const toggle = () => setEnabled((v) => !v);

  return { enabled, listening, speaking, toggle, startListening, stopListening, speak, stopSpeaking };
}
```

---

## 8. Route Design

```typescript
// App.tsx
<Routes>
  {/* Redirect to onboarding if no profile */}
  <Route
    path="/"
    element={
      <RequireProfile fallback="/onboarding">
        <DashboardPage />
      </RequireProfile>
    }
  />
  <Route path="/onboarding" element={<OnboardingPage />} />
  <Route
    path="/workspace/:projectId"
    element={
      <RequireProfile fallback="/onboarding">
        <WorkspacePage />
      </RequireProfile>
    }
  />
  {/* Catch-all: redirect to dashboard */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

### RequireProfile Guard

```typescript
function RequireProfile({ children, fallback }: { children: ReactNode; fallback: string }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: () => api.get<ProfileResponse>("/api/profile"),
    retry: false,
  });

  if (isLoading) return <Spinner />;
  if (!profile || !profile.onboarding_complete) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
```

**Note:** The backend currently handles the profile-check redirect server-side for `/`. In the React version, this moves to the client via the `RequireProfile` guard. The backend page routes are removed entirely — the SPA handles all routing.

### URL Parameters

| Route | Query Params | Effect |
|---|---|---|
| `/workspace/:projectId` | `?mode=micro` | Start in micro session |
| `/workspace/:projectId` | `?mode=deep` | Start in deep session |
| `/workspace/:projectId` | `?concept=X` | Auto-teach concept X after WebSocket connects |

---

## 9. File-by-File Migration Map

### What Gets Deleted

| Current File | Fate | Reason |
|---|---|---|
| `templates/base.html` | Deleted | Replaced by `AppLayout` + `TopNav` React components |
| `templates/dashboard.html` | Deleted | Replaced by `DashboardPage` + child components |
| `templates/onboarding.html` | Deleted | Replaced by `OnboardingPage` |
| `templates/workspace.html` | Deleted | Replaced by `WorkspacePage` + child components |
| `static/js/dashboard/dashboard.js` | Deleted | Replaced by DashboardPage + TanStack Query hooks |
| `static/js/dashboard/goals.js` | Deleted | Replaced by GoalsWidget component |
| `static/js/dashboard/patterns.js` | Deleted | Replaced by PatternLibrary component |
| `static/js/dashboard/compare.js` | Deleted | Replaced by CompareModal component |
| `static/js/workspace/workspace.js` | Deleted | Replaced by WorkspaceLayout + useResizablePanel hook |
| `static/js/workspace/chat.js` | Deleted | Replaced by TutorChat + useWebSocket + chatStore |
| `static/js/workspace/editor.js` | Deleted | Replaced by CodeEditor + editorStore |
| `static/js/workspace/file-tree.js` | Deleted | Replaced by FileTree component |
| `static/js/workspace/learning-path.js` | Deleted | Replaced by LearningPathPanel component |
| `static/js/workspace/voice.js` | Deleted | Replaced by useVoice hook + VoiceToggle |
| `static/js/onboarding.js` | Deleted | Replaced by OnboardingPage component |
| `static/css/main.css` | Deleted | Replaced by `tokens.css` + `global.css` + `neumorphism.css` + `glassmorphism.css` |
| `static/css/dashboard.css` | Deleted | Styles absorbed into component CSS Modules |
| `static/css/workspace.css` | Deleted | Styles absorbed into component CSS Modules |
| `static/css/onboarding.css` | Deleted | Styles absorbed into OnboardingPage.module.css |
| `templates/partials/` | Deleted | Empty directory, was placeholder for HTMX |

### What Gets Repurposed / Referenced

| Current Source | New Destination | What to Carry Over |
|---|---|---|
| `base.html` theme toggle script | `useTheme.ts` hook | localStorage key `mentai_theme`, `data-theme` attribute |
| `dashboard.js` `escapeHtml()` | `shared/` utility | HTML escape function |
| `dashboard.js` `renderSessionChart()` | `SessionChart.tsx` | Bar chart logic (proportional heights, date labels) |
| `dashboard.js` `renderMasteryChart()` | `MasteryDonut.tsx` | SVG donut math (circumference calculation, dasharray) |
| `dashboard.js` `loadLearningPath()` | `LearningPathWidget.tsx` | Module expand/collapse logic, "Teach Me" button |
| `chat.js` `renderMarkdown()` | `ChatMessage.tsx` | Replaced by `react-markdown` library — more robust |
| `chat.js` WebSocket message types | `types/chat.ts` | All message type definitions as TypeScript interfaces |
| `editor.js` save formatting | `CodeEditor.tsx` | Tab→spaces, trailing whitespace trim, trailing newline |
| `editor.js` `previewFile()` | `LivePreview.tsx` | Iframe URL construction, serve endpoint usage |
| `editor.js` `run()` | `CodeEditor.tsx` | Auto-save before run, output capture logic |
| `file-tree.js` `fileIcon()` | `FileTreeItem.tsx` | Extension→icon mapping table |
| `voice.js` Natural Voice selection | `useVoice.ts` | `voices.find(v => v.name.includes("Natural"))` |
| `voice.js` TTS text cleaning | `useVoice.ts` | Code block stripping regex |
| `learning-path.js` concept click → WebSocket | `LearningPathPanel.tsx` | Send `teach_concept` message via WebSocket |
| `workspace.js` resize drag logic | `useResizablePanel.ts` | Mouse event handling, min/max constraints |
| `workspace.js` editor toggle | `EditorCollapseToggle.tsx` | Grid column swap, button text change |
| `main.py` page routes | Backend updated | Remove `templates` dependency, add SPA fallback route |
| `config.py` `templates_dir` | Backend updated | Remove or keep for reference |

### What is Brand New

| New File | Purpose |
|---|---|
| All `types/*.ts` files | TypeScript interfaces replacing implicit JSON shapes |
| All `services/*Api.ts` files | Typed API call functions |
| All `stores/*.ts` files | Zustand state management |
| All `hooks/*.ts` files | Reusable React hooks |
| `main.tsx`, `App.tsx` | React entry point and router setup |
| `vite.config.ts`, `tsconfig.json`, `package.json` | Build tooling |
| `styles/markdown.css` | Rendered markdown styling (previously inline in workspace.css) |

---

## 10. Implementation Phases (Step-by-Step)

### Phase 0: Scaffold and Tooling (1 session)

**Goal:** Vite + React running, proxying to existing FastAPI backend.

1. Create `frontend/` directory at project root
2. Run `npm create vite@latest frontend -- --template react-ts` inside `frontend/`
3. Install dependencies:
   ```bash
   cd frontend
   npm install react-router-dom zustand @tanstack/react-query
   npm install @uiw/react-codemirror @codemirror/lang-python @codemirror/lang-html @codemirror/lang-css @codemirror/lang-javascript @codemirror/theme-one-dark
   npm install react-markdown remark-gfm rehype-highlight
   ```
4. Configure `vite.config.ts` with proxy to `localhost:9000`
5. Create `styles/tokens.css` with all CSS custom properties (neo + glass)
6. Create `styles/global.css` with reset, body, typography, scrollbar
7. Create `styles/neumorphism.css` with `.neo-card`, `.neo-btn`, `.neo-input`, shadow utilities
8. Create `styles/glassmorphism.css` with `.glass-overlay`, `.glass-modal`, blur utilities
9. Create `styles/markdown.css` with rendered markdown styles for chat
10. Create `src/types/` with all TypeScript interfaces
11. Verify: `npm run dev` starts, proxies API calls correctly
12. Verify: Can fetch `http://localhost:5173/api/health` → returns JSON

**Deliverable:** Running Vite dev server proxying to FastAPI. All design tokens in place.

### Phase 1: Layout + Routing + Shared Components (1 session)

**Goal:** App shell with navigation, routing, theme toggle, and all shared components.

1. Create `useTheme` hook
2. Create `uiStore` with theme + panel state
3. Create shared components: Button, Card, Input, Select, Modal, EmptyState, Spinner, ProgressBar, Badge, Toast
4. Create `AppLayout` with `TopNav` (brand, links, theme toggle)
5. Create `App.tsx` with React Router setup and `RequireProfile` guard
6. Create stub pages: DashboardPage, OnboardingPage, WorkspacePage (just titles for now)
7. Verify: Navigate between routes via URL, theme toggle works, dark/light mode renders correctly

**Deliverable:** App shell with routing, neumorphic theme, and shared component library.

### Phase 2: Onboarding Page (1 session)

**Goal:** Complete onboarding flow.

1. Build `OnboardingPage` with all form sections
2. Wire up `POST /api/profile` via TanStack Query mutation
3. Redirect to dashboard on success
4. Handle validation errors, API errors
5. Verify: Create account, verify in SQLite, redirect to dashboard

**Deliverable:** Working onboarding flow.

### Phase 3: Dashboard — Stats + Projects + Quick Session (1 session)

**Goal:** Dashboard with core widgets.

1. Build `DashboardPage` layout
2. Build `StatsRow` — fetch `/api/dashboard/stats`, render 4 stat cards
3. Build `ProjectList` — fetch `/api/projects`, render project items, click → navigate
4. Build `NewProjectModal` — form + `POST /api/projects` mutation
5. Build `QuickSession` — Micro/Deep buttons navigating to workspace
6. Verify: Dashboard loads, stats populate, create project works, navigate to workspace

**Deliverable:** Functional dashboard with stats, project list, and new project creation.

### Phase 4: Dashboard — Goals + Patterns + Charts (1 session)

**Goal:** Remaining dashboard widgets.

1. Build `GoalsWidget` — fetch `/api/goals/today`, render goals + suggestions
2. Build `PatternLibrary` — fetch `/api/patterns`, group by category
3. Build `SessionChart` — pure CSS bar chart from progress data
4. Build `MasteryDonut` — SVG donut chart + legend
5. Build `RecentlyMastered` — list from progress data
6. Build `LearningPathWidget` — expandable module/concept tree with "Teach Me" buttons
7. Build `CompareModal` — two-project comparison with tabs
8. Verify: All widgets load, charts render, compare works

**Deliverable:** Complete dashboard with all 10 widgets.

### Phase 5: Workspace — Layout + File Tree + Editor (1 session)

**Goal:** Workspace shell, file management, code editor.

1. Build `WorkspaceLayout` — CSS grid, three panels
2. Build `useResizablePanel` hook
3. Build `FileTree` + `FileTreeItem` — file listing, selection, new file
4. Build `editorStore` — current file, content, dirty state
5. Build `CodeEditor` — CodeMirror 6 wrapper, language detection, save/run/review
6. Build `EditorToolbar` — title + action buttons
7. Build `OutputPanel` + `OutputConsole` + `LivePreview`
8. Build `EditorCollapseToggle`
9. Verify: Navigate to workspace, file tree loads, click file → editor loads, edit → save, run Python, preview HTML

**Deliverable:** Functional code editor with file tree and output panel.

### Phase 6: Workspace — Chat + WebSocket (1 session)

**Goal:** AI tutor chat with streaming.

1. Build `chatStore` — messages, streaming state, session state
2. Build `useWebSocket` hook — connect, handle all message types
3. Build `TutorChat` — message list, auto-scroll
4. Build `ChatMessage` — markdown rendering for tutor, plain text for learner
5. Build `ChatInput` — textarea + send, Enter to send
6. Build `SessionControls` — Micro/Deep mode selector
7. Build `SpecialistBadge` — shows active AI specialist
8. Build `ConceptToast` — mastery notification portal
9. Verify: Start session, send message, see streaming response, markdown renders, specialist badge appears

**Deliverable:** Working AI tutor chat with streaming responses.

### Phase 7: Workspace — Voice + Learning Path (1 session)

**Goal:** Voice tutor and AI learning path in workspace.

1. Build `useVoice` hook — STT + TTS
2. Build `VoiceToggle` — speaker icon, states
3. Integrate voice with ChatInput (STT fills textarea, auto-sends)
4. Build `LearningPathPanel` — expandable module/concept tree
5. Wire concept click → `teach_concept` WebSocket message
6. Wire teach cycle → code review flow
7. Handle `?concept=X` URL param auto-trigger
8. Verify: Toggle voice, speak → text appears → auto-sends, tutor responds, TTS speaks response, click concept → teach cycle starts

**Deliverable:** Complete workspace with voice and learning path.

### Phase 8: Polish + Backend Updates (1 session)

**Goal:** Production build, backend serving changes, cleanup.

1. Update `app/main.py`:
   - Remove Jinja2 template dependency
   - Remove page routes (/, /onboarding, /workspace/{id})
   - Add SPA fallback route: serve `static/spa/index.html` for all non-API, non-static routes
   - Mount `static/spa/` as static files for JS/CSS assets
2. Build frontend: `cd frontend && npm run build` → outputs to `static/spa/`
3. Test: Run FastAPI, navigate to `localhost:9000`, SPA loads, all routes work
4. Delete old frontend files (templates/, static/js/, static/css/)
5. Update `.gitignore` — add `static/spa/` (build output), keep `frontend/src/`, `frontend/package.json`

**Deliverable:** Production-ready React SPA served by FastAPI. Old code removed.

### Phase 9: Edge Cases and Final Verification (1 session)

**Goal:** Test all edge cases, fix bugs.

1. Test: No profile → redirect to onboarding → cannot bypass
2. Test: Empty projects → dashboard shows empty states
3. Test: WebSocket disconnect → reconnection logic
4. Test: Very long AI responses → chat scrolls correctly
5. Test: Save while running → no race condition
6. Test: Path traversal attempts → API rejects them (backend handles this)
7. Test: Dark/light mode on all pages → consistent
8. Test: Panel resize → editor collapse → restore → works correctly
9. Test: Mobile viewport (workspace collapses to single column)
10. Fix any issues found

**Deliverable:** Production-ready, thoroughly tested React SPA.

---

## 11. Backend Changes

### Minimal Changes — Zero API Modifications

The 29 API endpoints and WebSocket protocol are **frozen**. No changes to:
- `app/routers/*` — all API routes unchanged
- `app/services/*` — all business logic unchanged
- `app/models/*` — all database models unchanged
- `app/schemas/*` — all Pydantic schemas unchanged
- `app/config.py` — all settings unchanged (templates_dir can stay for reference)

### Only `app/main.py` Changes

```python
# BEFORE (current main.py page routes)
templates = Jinja2Templates(directory=str(settings.templates_dir))

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    # ... renders dashboard.html via Jinja2 ...
    return templates.TemplateResponse("dashboard.html", ...)

@app.get("/onboarding", response_class=HTMLResponse)
async def onboarding(request: Request):
    return templates.TemplateResponse("onboarding.html", ...)

@app.get("/workspace/{project_id}", response_class=HTMLResponse)
async def workspace(request: Request, project_id: int):
    return templates.TemplateResponse("workspace.html", ...)

# AFTER (React SPA serving)
import os

# Mount the built SPA assets (JS, CSS, fonts, etc.)
spa_dir = settings.static_dir / "spa"
if spa_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(spa_dir / "assets")), name="spa_assets")

# SPA catch-all: serve index.html for all non-API, non-static routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve the React SPA. API and WebSocket routes take priority."""
    # API and WebSocket routes are matched first by FastAPI's route resolution
    index_html = spa_dir / "index.html"
    if index_html.exists():
        return FileResponse(str(index_html))
    # Fallback for development without a build
    return {"message": "SPA not built. Run: cd frontend && npm run build"}
```

**Important:** The `/{full_path:path}` catch-all must be registered LAST so API routes match first. FastAPI matches routes in registration order, so the existing `include_router` calls all take priority over the catch-all.

### Profile Check Migration

The backend's server-side profile check (redirect to `/onboarding` if no profile) moves to the client:

```typescript
// In the React SPA, RequireProfile component handles this
// The backend's /api/profile endpoint still returns the profile
// If no profile exists, the SPA redirects to /onboarding
```

### .gitignore Update

```
# React SPA
frontend/node_modules/
static/spa/          # Build output (generated, not committed)
```

---

## 12. What Gets Deleted

After Phase 8 verification, delete these files/directories:

```
templates/
  base.html
  dashboard.html
  onboarding.html
  workspace.html
  partials/              (empty, placeholder)

static/js/
  dashboard/
    dashboard.js
    goals.js
    patterns.js
    compare.js
  workspace/
    workspace.js
    chat.js
    editor.js
    file-tree.js
    learning-path.js
    voice.js
  onboarding.js

static/css/
  main.css              (replaced by tokens.css + neumorphism.css + glassmorphism.css)
  dashboard.css         (absorbed into component CSS Modules)
  workspace.css         (absorbed into component CSS Modules)
  onboarding.css        (absorbed into OnboardingPage.module.css)
```

**What stays in `static/`:**
- `static/spa/` — the built React app (gitignored, generated by `npm run build`)
- Any future static assets the backend may serve directly

**The `workspace/` directory stays** — this contains learner project files, not application code.

---

## 13. Edge Cases and Risks

### 13.1 WebSocket Reconnection

**Risk:** WebSocket disconnects (network blip, server restart). Session state is lost.

**Mitigation:** The `useWebSocket` hook should:
- Detect `onclose` events
- Attempt reconnection with exponential backoff (1s, 2s, 4s, max 30s)
- Re-send `session_start` on reconnect to resume the session
- Show a subtle "Reconnecting..." indicator in the chat panel

### 13.2 CodeMirror Instance Recreation

**Risk:** Currently, `editor.js` destroys and recreates the CodeMirror instance on every file change (to switch language modes). This causes a visual flicker and loses undo history.

**Mitigation:** With `@uiw/react-codemirror`, the component handles instance lifecycle. Use React `key` only when the language actually changes (different extension from the current one). For same-language files, just update the `value` prop — CodeMirror handles this efficiently.

### 13.3 Large File Editing

**Risk:** Very large files cause CodeMirror performance issues.

**Mitigation:** CodeMirror 6 handles large files well out of the box. If issues arise, add `EditorView.lineWrapping` and increase the viewport margin.

### 13.4 Race Condition: Save + Run

**Risk:** User clicks Run while a save is in progress. Two concurrent API calls to the same file.

**Mitigation:** The `run()` function already calls `save()` first and awaits it. In the React version, use `useMutation` with `onSuccess` chaining:
```typescript
const saveMutation = useMutation({ mutationFn: saveFile });
const runMutation = useMutation({ mutationFn: runFile });

async function handleRun() {
  await saveMutation.mutateAsync({ path, content });
  await runMutation.mutateAsync({ path });
}
```

### 13.5 Theme Flicker on Load

**Risk:** Page loads in light mode, then switches to dark mode after JS executes.

**Mitigation:** Add a blocking `<script>` in `index.html` head:
```html
<script>
  (function() {
    var theme = localStorage.getItem("mentai_theme") || "dark";
    document.documentElement.setAttribute("data-theme", theme);
  })();
</script>
```

### 13.6 Browser Back/Forward with Modals

**Risk:** User opens a modal, presses back, expects the modal to close (not navigate away).

**Mitigation:** Use React Router's `useSearchParams` for modal state:
- `?newProject=true` → NewProjectModal open
- `?compare=1,2` → CompareModal open with project IDs
- Pressing back removes the search param, closing the modal

### 13.7 Vite Proxy vs Production

**Risk:** In dev, Vite proxies `/api/*` to port 9000. In production, FastAPI serves everything from port 9000. Different behavior.

**Mitigation:**
- Dev: Vite dev server on 5173, proxy `/api` and `/ws` to 9000
- Production: `npm run build` outputs to `static/spa/`, FastAPI serves `index.html` as catch-all
- API calls use relative paths (`/api/...`) — works in both environments

### 13.8 Missing Profile API State

**Risk:** The `RequireProfile` guard fetches `/api/profile`. If the API call fails, it might incorrectly redirect to onboarding.

**Mitigation:** Distinguish between "no profile exists" (404 or empty) and "API error" (500, network error). Only redirect on "no profile." Show error state on API failures.

---

## 14. Testing Strategy

### Manual Testing Checklist (per phase)

Each phase has specific verification steps listed in Section 10. General manual tests:

1. **Theme toggle:** Dark → Light → Dark. All pages consistent. localStorage persists.
2. **Empty states:** No projects, no goals, no patterns, no sessions. All show appropriate empty states.
3. **Error states:** Stop the FastAPI server. All pages show error states, not white screens.
4. **Loading states:** Slow network (simulate with browser DevTools). All pages show loading indicators.
5. **Full flow:** Onboarding → Dashboard → New Project → Workspace → Edit code → Save → Run → Chat with AI → End session → Back to dashboard → See updated stats.

### Automated Testing (Future, Not in Scope for Initial Rewrite)

- **Component tests:** Vitest + React Testing Library for shared components
- **Hook tests:** Test `useWebSocket`, `useVoice`, `useTheme` in isolation
- **Integration tests:** Playwright for full user flows
- **API mocking:** MSW (Mock Service Worker) to mock backend responses

---

## Appendix A: Dependency Versions (package.json)

```json
{
  "name": "mentai-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@codemirror/lang-css": "^6.3.1",
    "@codemirror/lang-html": "^6.4.9",
    "@codemirror/lang-javascript": "^6.2.2",
    "@codemirror/lang-python": "^6.1.6",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@tanstack/react-query": "^5.62.0",
    "@uiw/react-codemirror": "^4.23.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^9.0.1",
    "react-router-dom": "^7.0.0",
    "rehype-highlight": "^7.0.0",
    "remark-gfm": "^4.0.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.6.0",
    "vite": "^6.0.0"
  }
}
```

## Appendix B: TypeScript Interfaces (types/)

All TypeScript interfaces mirror the existing Pydantic schemas exactly. See Section 5 of the backend code (`app/schemas/*.py`). Key types:

```typescript
// types/project.ts
interface Project {
  id: number;
  name: string;
  description: string | null;
  tech_stack: string | null;
  directory: string;
  status: string;
  learning_path: string | null;  // JSON string — parse on use
  created_at: string;
  updated_at: string;
}

interface ProjectCreate {
  name: string;
  description?: string;
  tech_stack?: string;
}

// types/chat.ts
interface WsMessage {
  type: string;
  content?: string;
  concept?: string;
  mastery?: string;
  name?: string;
  specialization?: string;
  session_id?: number;
  mode?: string;
  phase?: string;
  prompt?: string;
  module_title?: string;
  timestamp?: string;
}

// types/profile.ts
interface Profile {
  id: number;
  display_name: string;
  python_level: string;
  javascript_level: string;
  html_css_level: string;
  database_level: string;
  git_level: string;
  preferred_backend: string | null;
  preferred_frontend: string | null;
  preferred_database: string | null;
  learning_goal: string | null;
  time_per_week: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}
```

---

*Plan completed 2026-06-05. Ready for implementation.*
