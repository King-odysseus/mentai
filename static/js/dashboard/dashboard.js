/**
 * Dashboard — fetches stats, lists projects, handles new project creation.
 * All vanilla JS, no framework.
 */

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
const API = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
async function loadStats() {
  try {
    const stats = await API.get("/api/dashboard/stats");
    document.getElementById("stat-projects").textContent = stats.total_projects;
    document.getElementById("stat-concepts").textContent = stats.total_concepts;
    document.getElementById("stat-sessions").textContent = stats.total_sessions;

    const mastered = stats.mastery_breakdown?.mastered || 0;
    document.getElementById("stat-mastered").textContent = mastered;

    // Mastery bar chart
    const bars = document.getElementById("mastery-bars");
    if (stats.mastery_breakdown && Object.keys(stats.mastery_breakdown).length > 0) {
      const total = Object.values(stats.mastery_breakdown).reduce((a, b) => a + b, 0);
      bars.innerHTML = ["introduced", "practiced", "confident", "mastered"]
        .map((level) => {
          const count = stats.mastery_breakdown[level] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return `
            <div class="mastery-row">
              <span class="mastery-label">${level}</span>
              <div class="mastery-bar-bg">
                <div class="mastery-bar-fill ${level}" style="width:${pct}%"></div>
              </div>
              <span class="mastery-count">${count}</span>
            </div>`;
        })
        .join("");
    }
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

// ---------------------------------------------------------------------------
// Project list
// ---------------------------------------------------------------------------
async function loadProjects() {
  try {
    const data = await API.get("/api/projects");
    const list = document.getElementById("project-list");
    if (!data.projects.length) {
      list.innerHTML = '<p class="empty-state">No projects yet. Create one to start learning!</p>';
      return;
    }
    list.innerHTML = data.projects
      .map(
        (p) => `
        <div class="project-item" data-id="${p.id}">
          <div>
            <div class="project-item-name">${escapeHtml(p.name)}</div>
            <div class="project-item-stack">${escapeHtml(p.tech_stack || "No stack specified")}</div>
          </div>
          <span class="project-item-status status-${p.status}">${p.status}</span>
        </div>`
      )
      .join("");

    // Click handler: navigate to workspace
    list.querySelectorAll(".project-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        window.location.href = `/workspace/${id}`;
      });
    });
  } catch (err) {
    console.error("Failed to load projects:", err);
  }
}

// ---------------------------------------------------------------------------
// New project modal
// ---------------------------------------------------------------------------
function setupNewProject() {
  const modal = document.getElementById("new-project-modal");
  const form = document.getElementById("new-project-form");
  const openBtn = document.getElementById("btn-new-project");
  const cancelBtn = document.getElementById("btn-cancel-project");

  openBtn.addEventListener("click", () => modal.showModal());
  cancelBtn.addEventListener("click", () => modal.close());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {
      name: formData.get("name"),
      description: formData.get("description") || null,
      tech_stack: formData.get("tech_stack") || null,
    };

    try {
      const project = await API.post("/api/projects", data);
      modal.close();
      form.reset();
      // Navigate to the new project workspace
      window.location.href = `/workspace/${project.id}`;
    } catch (err) {
      alert("Failed to create project: " + err.message);
    }
  });

  // Close modal on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
  });
}

// ---------------------------------------------------------------------------
// Quick session buttons
// ---------------------------------------------------------------------------
function setupSessionButtons() {
  const selectedProject = sessionStorage.getItem("mentai_selected_project");
  const microBtn = document.getElementById("btn-micro-session");
  const deepBtn = document.getElementById("btn-deep-session");

  function navigate(mode) {
    if (!selectedProject) {
      // Pick the first project from the list
      const first = document.querySelector(".project-item");
      if (first) {
        window.location.href = `/workspace/${first.dataset.id}?mode=${mode}`;
      } else {
        alert("Create a project first before starting a session.");
      }
    } else {
      window.location.href = `/workspace/${selectedProject}?mode=${mode}`;
    }
  }

  microBtn.addEventListener("click", () => navigate("micro"));
  deepBtn.addEventListener("click", () => navigate("deep"));
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Learning Path — AI-generated personalized curriculum per project
// ---------------------------------------------------------------------------
async function loadLearningPath() {
  const container = document.getElementById("learning-path-list");
  try {
    const data = await API.get("/api/projects");
    const projects = data.projects || [];

    // Find the most recent active project with a learning path
    const activeProject = projects.find(
      (p) => p.status === "active" && p.learning_path
    );
    if (!activeProject) {
      container.innerHTML =
        '<p class="empty-state">Create a project to get a personalized AI-generated learning path.</p>';
      return;
    }

    let path;
    try {
      path = JSON.parse(activeProject.learning_path);
    } catch {
      container.innerHTML = '<p class="empty-state">Learning path is being generated...</p>';
      return;
    }

    if (!path || !path.length) {
      container.innerHTML = '<p class="empty-state">Learning path is being generated...</p>';
      return;
    }

    let html = `<div class="learning-path-project">${escapeHtml(activeProject.name)}</div>`;
    path.forEach((mod, mi) => {
      html +=
        `<div class="lp-module">` +
        `<div class="lp-module-header" data-module="${mi}">` +
        `<span class="lp-module-toggle">▶</span>` +
        `<span class="lp-module-title">${escapeHtml(mod.title)}</span>` +
        `<span class="lp-module-count">${mod.concepts ? mod.concepts.length : 0} concepts</span>` +
        `</div>` +
        `<div class="lp-concepts" id="lp-concepts-${mi}" hidden>`;

      if (mod.concepts) {
        mod.concepts.forEach((c) => {
          html +=
            `<div class="lp-concept">` +
            `<span class="lp-concept-title">${escapeHtml(c.title)}</span>` +
            `<span class="lp-concept-desc">${escapeHtml(c.description || "")}</span>` +
            `<button class="btn btn-sm lp-teach-btn" data-project="${activeProject.id}" data-concept="${escapeHtml(c.title)}">Teach Me</button>` +
            `</div>`;
        });
      }
      html += `</div></div>`;
    });

    container.innerHTML = html;

    // Toggle module expand/collapse
    container.querySelectorAll(".lp-module-header").forEach((header) => {
      header.addEventListener("click", () => {
        const mi = header.dataset.module;
        const concepts = document.getElementById(`lp-concepts-${mi}`);
        const toggle = header.querySelector(".lp-module-toggle");
        if (concepts.hidden) {
          concepts.hidden = false;
          toggle.textContent = "▼";
        } else {
          concepts.hidden = true;
          toggle.textContent = "▶";
        }
      });
    });

    // Teach Me buttons
    container.querySelectorAll(".lp-teach-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const projectId = btn.dataset.project;
        const concept = btn.dataset.concept;
        window.location.href = `/workspace/${projectId}?concept=${encodeURIComponent(concept)}`;
      });
    });
  } catch (err) {
    console.error("Failed to load learning path:", err);
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadProjects();
  loadLearningPath();
  loadProgress();
  setupNewProject();
  setupSessionButtons();
});

// ---------------------------------------------------------------------------
// Progress charts
// ---------------------------------------------------------------------------
async function loadProgress() {
  try {
    const data = await API.get("/api/dashboard/progress");
    renderSessionChart(data.daily_sessions);
    renderMasteryChart(data.mastery_distribution);
    renderRecentlyMastered(data.recently_mastered);
  } catch (err) {
    console.error("Failed to load progress:", err);
  }
}

function renderSessionChart(dailySessions) {
  const container = document.getElementById("session-chart");
  if (!dailySessions.length) {
    container.innerHTML =
      '<p class="empty-state">No sessions in the last 14 days. Start a session to see your activity!</p>';
    return;
  }
  const maxMinutes = Math.max(...dailySessions.map((d) => d.minutes), 1);
  const maxHeight = 120;
  container.innerHTML = dailySessions
    .map((d) => {
      const height = Math.max((d.minutes / maxMinutes) * maxHeight, 4);
      const dateLabel = d.date.slice(5); // MM-DD
      return (
        `<div class="chart-bar-wrapper">` +
        `<div class="chart-bar" style="height:${height}px" title="${d.minutes}min">` +
        `<span class="chart-bar-label">${d.minutes}m</span>` +
        `</div>` +
        `<span class="chart-date">${dateLabel}</span>` +
        `</div>`
      );
    })
    .join("");
}

function renderMasteryChart(distribution) {
  const container = document.getElementById("mastery-chart");
  const total =
    Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
  const levels = ["introduced", "practiced", "confident", "mastered"];
  const colors = {
    introduced: "#f0c040",
    practiced: "#54aeff",
    confident: "#4ac26b",
    mastered: "#8250df",
  };

  // SVG donut chart
  const mastered = distribution.mastered || 0;
  let svg =
    '<svg viewBox="0 0 120 120" width="120" height="120">';
  let offset = 0;
  const circumference = 2 * Math.PI * 40;
  levels.forEach((level) => {
    const count = distribution[level] || 0;
    const pct = count / total;
    const dash = pct * circumference;
    svg +=
      `<circle cx="60" cy="60" r="40" fill="none" stroke="${colors[level]}" ` +
      `stroke-width="12" stroke-dasharray="${dash} ${circumference - dash}" ` +
      `stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"/>`;
    offset += dash;
  });
  svg +=
    '<text x="60" y="55" text-anchor="middle" font-size="16" font-weight="700" fill="#24292e">' +
    mastered +
    "</text>" +
    '<text x="60" y="72" text-anchor="middle" font-size="10" fill="#6a737d">mastered</text></svg>';

  const legend = levels
    .map(
      (l) =>
        `<div class="legend-item">` +
        `<span class="legend-dot" style="background:${colors[l]}"></span>${l}: ${distribution[l] || 0}` +
        `</div>`
    )
    .join("");

  container.innerHTML =
    `<div class="mastery-chart-row">${svg}<div class="mastery-legend">${legend}</div></div>`;
}

function renderRecentlyMastered(concepts) {
  const container = document.getElementById("recently-mastered");
  if (!concepts.length) return;
  container.innerHTML =
    `<h4 style="margin-bottom:var(--space-xs)">Recently Mastered</h4>` +
    concepts
      .map(
        (c) =>
          `<div class="mastered-item">` +
          `<span>${escapeHtml(c.concept)}</span>` +
          `<span class="mastered-count">${c.encounter_count}x</span>` +
          `</div>`
      )
      .join("");
}
