/**
 * Custom Roadmap — CRUD for curriculum modules and concepts.
 * Lists all modules, supports creating/editing custom modules and concepts.
 */

const Roadmap = {
  modules: [],

  async load() {
    try {
      const data = await (await fetch("/api/curriculum/modules")).json();
      this.modules = data;
      this.render();
    } catch (e) {
      console.error("Failed to load roadmap:", e);
    }
  },

  render() {
    const container = document.getElementById("roadmap-list");
    if (!this.modules.length) {
      container.innerHTML =
        '<p class="empty-state">No curriculum yet. Seed it or create custom modules.</p>';
      return;
    }

    let html = "";
    this.modules.forEach((mod) => {
      const isCustom = mod.source === "custom";
      html +=
        `<div class="roadmap-module" data-id="${mod.id}">` +
        `<div class="roadmap-module-header">` +
        `<span class="roadmap-module-title">${escapeHtml(mod.title)}</span>` +
        `<span class="roadmap-module-source">${escapeHtml(mod.source)}</span>` +
        (isCustom
          ? `<button class="btn-icon roadmap-btn-edit" data-id="${mod.id}" data-title="${escapeHtml(mod.title)}" data-desc="${escapeHtml(mod.description || "")}" title="Edit module">✏️</button>` +
            `<button class="btn-icon roadmap-btn-delete" data-id="${mod.id}" title="Delete module">🗑️</button>`
          : "") +
        `</div>` +
        `<div class="roadmap-concepts">`;

      if (mod.concepts && mod.concepts.length) {
        mod.concepts.forEach((c) => {
          html +=
            `<div class="roadmap-concept">` +
            `<span class="roadmap-concept-title">${escapeHtml(c.title)}</span>` +
            `<span class="roadmap-concept-diff">${escapeHtml(c.difficulty)}</span>` +
            `</div>`;
        });
      }

      html +=
        `<button class="btn btn-sm roadmap-btn-add-concept" data-module-id="${mod.id}">+ Concept</button>` +
        `</div></div>`;
    });

    container.innerHTML = html;
    this.bindEvents();
  },

  bindEvents() {
    // New module
    const newBtn = document.getElementById("btn-new-module");
    if (newBtn) {
      newBtn.onclick = () => this.promptNewModule();
    }

    // Edit module buttons
    document.querySelectorAll(".roadmap-btn-edit").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.promptEditModule(
          parseInt(btn.dataset.id),
          btn.dataset.title,
          btn.dataset.desc
        )
      );
    });

    // Delete module buttons
    document.querySelectorAll(".roadmap-btn-delete").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.deleteModule(parseInt(btn.dataset.id))
      );
    });

    // Add concept buttons
    document.querySelectorAll(".roadmap-btn-add-concept").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.promptNewConcept(parseInt(btn.dataset.moduleId))
      );
    });
  },

  async promptNewModule() {
    const title = prompt("Module title:");
    if (!title) return;
    const desc = prompt("Description (optional):") || "";
    try {
      await fetch("/api/curriculum/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc || null, order_index: this.modules.length }),
      });
      this.load();
    } catch (e) {
      alert("Failed to create module: " + e.message);
    }
  },

  async promptEditModule(id, currentTitle, currentDesc) {
    const title = prompt("Module title:", currentTitle);
    if (!title) return;
    const desc = prompt("Description:", currentDesc) || "";
    try {
      await fetch(`/api/curriculum/modules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc || null }),
      });
      this.load();
    } catch (e) {
      alert("Failed to update module: " + e.message);
    }
  },

  async deleteModule(id) {
    if (!confirm("Delete this module and all its concepts?")) return;
    try {
      const res = await fetch(`/api/curriculum/modules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail);
        return;
      }
      this.load();
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  },

  async promptNewConcept(moduleId) {
    const title = prompt("Concept title:");
    if (!title) return;
    const desc = prompt("Description (optional):") || "";
    const difficulty = prompt("Difficulty (foundational / intermediate / advanced):", "foundational");
    try {
      await fetch(`/api/curriculum/modules/${moduleId}/concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: desc || null,
          difficulty: difficulty || "foundational",
        }),
      });
      this.load();
    } catch (e) {
      alert("Failed to create concept: " + e.message);
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Roadmap.load();
});
