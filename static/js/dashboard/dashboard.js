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
// Init
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadProjects();
  setupNewProject();
  setupSessionButtons();
});
