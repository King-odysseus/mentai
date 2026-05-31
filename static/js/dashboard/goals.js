/**
 * Goals — daily and weekly learning goal tracking.
 * Loads today's goals, auto-suggests if none exist, supports creation.
 */

const Goals = {
  async load() {
    try {
      const data = await (await fetch("/api/goals/today")).json();
      this.render(data.goals, data.suggestions);
    } catch (e) {
      console.error("Failed to load goals:", e);
    }
  },

  render(goals, suggestions) {
    const container = document.getElementById("goal-list");
    if (!goals.length && !suggestions.length) {
      container.innerHTML = '<p class="empty-state">No goals today.</p>';
      return;
    }
    let html = "";
    goals.forEach((g) => {
      const pct = g.target_value
        ? Math.min(100, Math.round((g.progress / g.target_value) * 100))
        : 0;
      const completedClass = g.completed ? " goal-completed" : "";
      html +=
        `<div class="goal-item${completedClass}">` +
        `<div class="goal-desc">${escapeHtml(g.description)}</div>` +
        `<div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${pct}%"></div></div>` +
        `<div class="goal-meta">${g.progress}/${g.target_value || "?"} ${g.unit}</div>` +
        `</div>`;
    });
    suggestions.forEach((s) => {
      html +=
        `<div class="goal-item goal-suggestion" data-desc="${escapeHtml(s.description)}" data-target="${s.target_value}" data-unit="${s.unit}">` +
        `<div class="goal-desc">💡 ${escapeHtml(s.description)}</div>` +
        `<div class="goal-meta">Suggested: ${s.target_value} ${s.unit} — click to add</div>` +
        `</div>`;
    });
    container.innerHTML = html;

    // Click suggestions to create goals
    container.querySelectorAll(".goal-suggestion").forEach((el) => {
      el.addEventListener("click", () =>
        this.create(el.dataset.desc, parseInt(el.dataset.target), el.dataset.unit)
      );
    });
  },

  async create(description, target, unit) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_type: "daily",
          description,
          target_value: target,
          unit,
          target_date: today,
        }),
      });
      this.load();
    } catch (e) {
      console.error("Failed to create goal:", e);
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Goals.load();
});
