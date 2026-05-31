/**
 * Project Comparison — select two projects and compare them side by side.
 */

const Compare = {
  selectedA: null,
  selectedB: null,
  projects: [],

  init() {
    // Listen for project data loaded by dashboard.js
    this.loadProjects();

    document.getElementById("btn-close-compare").addEventListener("click", () => {
      document.getElementById("compare-modal").close();
    });

    // Tab switching
    document.querySelectorAll(".compare-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".compare-tab").forEach((t) =>
          t.classList.remove("active")
        );
        tab.classList.add("active");
        this.showTab(tab.dataset.tab);
      });
    });
  },

  async loadProjects() {
    try {
      const data = await (await fetch("/api/projects")).json();
      this.projects = data.projects;
      this.addCompareButtons();
    } catch (e) {
      console.error("Failed to load projects for compare:", e);
    }
  },

  addCompareButtons() {
    // Add a small compare icon to each project item
    document.querySelectorAll(".project-item").forEach((el) => {
      const id = parseInt(el.dataset.id);
      const btn = document.createElement("button");
      btn.className = "btn-icon compare-btn";
      btn.title = "Select for comparison";
      btn.textContent = "🔀";
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // Don't navigate to workspace
        this.selectProject(id, el);
      });
      el.appendChild(btn);
    });
  },

  selectProject(id, el) {
    if (this.selectedA === id) {
      this.selectedA = null;
      el.classList.remove("compare-selected");
    } else if (this.selectedB === id) {
      this.selectedB = null;
      el.classList.remove("compare-selected");
    } else if (!this.selectedA) {
      this.selectedA = id;
      el.classList.add("compare-selected");
    } else if (!this.selectedB) {
      this.selectedB = id;
      el.classList.add("compare-selected");
      // Both selected — run comparison
      this.runComparison();
    }
  },

  async runComparison() {
    const modal = document.getElementById("compare-modal");
    const body = document.getElementById("compare-body");
    modal.showModal();
    body.innerHTML = '<p class="empty-state">Comparing projects...</p>';

    try {
      const res = await fetch(`/api/projects/compare/${this.selectedA}/${this.selectedB}`);
      this.data = await res.json();
      this.showTab("files"); // Default tab
    } catch (e) {
      body.innerHTML = `<p class="empty-state">Comparison failed: ${e.message}</p>`;
    }

    // Reset selection
    this.selectedA = null;
    this.selectedB = null;
    document.querySelectorAll(".compare-selected").forEach((el) =>
      el.classList.remove("compare-selected")
    );
  },

  showTab(tab) {
    if (!this.data) return;
    const body = document.getElementById("compare-body");

    const aName = escapeHtml(this.data.project_a.name);
    const bName = escapeHtml(this.data.project_b.name);

    if (tab === "files") {
      const diff = this.data.file_diff;
      body.innerHTML =
        `<div class="compare-section">` +
        `<h4>File Structure</h4>` +
        `<div class="compare-stats">${diff.total_a} files in ${aName} vs ${diff.total_b} in ${bName}</div>` +
        this.renderDiffList("Only in " + aName, diff.only_in_a) +
        this.renderDiffList("Only in " + bName, diff.only_in_b) +
        this.renderDiffList("In both projects", diff.in_both) +
        `</div>`;
    } else if (tab === "concepts") {
      const concepts = this.data.concept_comparison;
      const onlyA = concepts.filter((c) => c.project_b_mastery === "not_seen");
      const onlyB = concepts.filter((c) => c.project_a_mastery === "not_seen");
      const both = concepts.filter(
        (c) => c.project_a_mastery !== "not_seen" && c.project_b_mastery !== "not_seen"
      );
      body.innerHTML =
        `<div class="compare-section">` +
        `<h4>Concept Coverage</h4>` +
        `<p>Only in ${aName}: ${onlyA.length} | Only in ${bName}: ${onlyB.length} | Both: ${both.length}</p>` +
        `<table class="compare-table">` +
        `<tr><th>Concept</th><th>${aName}</th><th>${bName}</th></tr>` +
        concepts
          .map(
            (c) =>
              `<tr>` +
              `<td>${escapeHtml(c.concept)}</td>` +
              `<td class="mastery-${c.project_a_mastery}">${c.project_a_mastery}</td>` +
              `<td class="mastery-${c.project_b_mastery}">${c.project_b_mastery}</td>` +
              `</tr>`
          )
          .join("") +
        `</table></div>`;
    } else if (tab === "patterns") {
      const pat = this.data.pattern_comparison;
      body.innerHTML =
        `<div class="compare-section">` +
        `<h4>Design Patterns</h4>` +
        this.renderDiffList("Only in " + aName, pat.only_in_a) +
        this.renderDiffList("Only in " + bName, pat.only_in_b) +
        this.renderDiffList("In both projects", pat.in_both) +
        `</div>`;
    }
  },

  renderDiffList(label, items) {
    if (!items || !items.length) return "";
    return (
      `<div class="diff-group">` +
      `<div class="diff-label">${label} (${items.length})</div>` +
      `<ul class="diff-list">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` +
      `</div>`
    );
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Compare.init();
});
