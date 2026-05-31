/**
 * Pattern Library — lists design patterns discovered across projects.
 */

const PatternLibrary = {
  async load() {
    try {
      const res = await fetch("/api/patterns");
      const patterns = await res.json();
      this.render(patterns);
    } catch (e) {
      console.error("Failed to load patterns:", e);
    }
  },

  render(patterns) {
    const container = document.getElementById("pattern-list");
    if (!patterns.length) {
      container.innerHTML =
        '<p class="empty-state">Patterns you discover will appear here as you build projects.</p>';
      return;
    }

    // Group by category
    const grouped = {};
    patterns.forEach((p) => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });

    let html = "";
    for (const [category, items] of Object.entries(grouped)) {
      html +=
        `<div class="pattern-group">` +
        `<div class="pattern-category">${escapeHtml(category)}</div>`;
      items.forEach((p) => {
        html +=
          `<div class="pattern-item">` +
          `<div class="pattern-name">${escapeHtml(p.name)}</div>` +
          `<div class="pattern-meta">${escapeHtml(p.difficulty)} — seen ${p.encounter_count}x</div>` +
          `</div>`;
      });
      html += `</div>`;
    }
    container.innerHTML = html;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  PatternLibrary.load();
});
