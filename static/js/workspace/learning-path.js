/**
 * Learning Path Panel — shows AI-generated modules/concepts for the project.
 * Clicking a concept triggers the teach→code→review cycle via Chat.
 */
const LearningPath = {
  projectId: null,
  path: null,

  async init(projectId) {
    this.projectId = projectId;
    await this.load();
  },

  async load() {
    const container = document.getElementById("learning-path-content");
    if (!container) return;

    try {
      const res = await fetch(`/api/projects/${this.projectId}`);
      const project = await res.json();
      if (!project.learning_path) {
        container.innerHTML = '<p class="empty-state">No learning path yet.</p>';
        return;
      }

      this.path = JSON.parse(project.learning_path);
      this.render();
    } catch (e) {
      console.error("Failed to load learning path:", e);
      container.innerHTML = '<p class="empty-state">Failed to load.</p>';
    }
  },

  render() {
    const container = document.getElementById("learning-path-content");
    if (!this.path || !this.path.length) {
      container.innerHTML = '<p class="empty-state">No learning path yet.</p>';
      return;
    }

    let html = "";
    this.path.forEach((mod, mi) => {
      html +=
        `<div class="lp-module">` +
        `<div class="lp-module-header" data-module="${mi}">` +
        `<span class="lp-module-toggle">▶</span>` +
        `<span class="lp-module-title">${escapeHtml(mod.title)}</span>` +
        `</div>` +
        `<div class="lp-concepts" id="ws-lp-concepts-${mi}" hidden>`;

      if (mod.concepts) {
        mod.concepts.forEach((c) => {
          html +=
            `<div class="lp-concept ws-lp-concept" data-concept="${escapeHtml(c.title)}" data-module="${escapeHtml(mod.title)}">` +
            `<span class="lp-concept-title">${escapeHtml(c.title)}</span>` +
            `</div>`;
        });
      }
      html += `</div></div>`;
    });

    container.innerHTML = html;

    // Toggle expand/collapse
    container.querySelectorAll(".lp-module-header").forEach((header) => {
      header.addEventListener("click", () => {
        const mi = header.dataset.module;
        const concepts = document.getElementById(`ws-lp-concepts-${mi}`);
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

    // Click concept to start teach cycle
    container.querySelectorAll(".ws-lp-concept").forEach((el) => {
      el.addEventListener("click", () => {
        const concept = el.dataset.concept;
        const moduleTitle = el.dataset.module;
        // Highlight selected
        container.querySelectorAll(".ws-lp-concept").forEach((e) =>
          e.classList.remove("lp-selected")
        );
        el.classList.add("lp-selected");
        // Send teach_concept via the Chat WebSocket
        if (window.Chat && window.Chat.ws && window.Chat.ws.readyState === WebSocket.OPEN) {
          window.Chat.send({
            type: "teach_concept",
            concept: concept,
            module_title: moduleTitle,
          });
        } else {
          console.error("Chat not connected. Cannot send teach_concept.");
        }
      });
    });

    // If there's a concept in the URL, auto-trigger it
    const params = new URLSearchParams(location.search);
    const autoConcept = params.get("concept");
    if (autoConcept) {
      setTimeout(() => {
        const el = container.querySelector(`.ws-lp-concept[data-concept="${autoConcept}"]`);
        if (el) el.click();
      }, 1500); // Wait for WebSocket to connect
    }
  },
};
