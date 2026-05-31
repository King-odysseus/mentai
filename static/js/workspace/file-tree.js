/**
 * File Tree — loads the workspace directory listing for the current project.
 * Files are listed from the /workspace/ static mount (read-only via HTTP).
 * Editing is done through API endpoints that write to the real filesystem.
 */

const FileTree = {
  projectId: null,
  currentFile: null,

  async init(projectId) {
    this.projectId = projectId;
    await this.refresh();
    this.setupNewFileButton();
  },

  /**
   * Fetch file listing from the API and render the tree.
   */
  async refresh() {
    const container = document.getElementById("file-tree");
    try {
      const res = await fetch(`/api/projects/${this.projectId}/files`);
      if (!res.ok) throw new Error("Failed to load files");

      const files = await res.json();
      if (!files.length) {
        container.innerHTML =
          '<p class="empty-state">No files yet.<br>Create one to start coding!</p>';
        return;
      }

      container.innerHTML = files
        .map(
          (f) => `
          <div class="file-tree-item" data-path="${escapeHtml(f.path)}" data-type="${f.type || 'file'}">
            <span class="icon">${this.fileIcon(f.path)}</span>
            <span class="name">${escapeHtml(f.name || f.path)}</span>
          </div>`
        )
        .join("");

      // Click handler
      container.querySelectorAll(".file-tree-item").forEach((el) => {
        el.addEventListener("click", () => this.selectFile(el.dataset.path));
      });
    } catch (err) {
      console.error("File tree error:", err);
      container.innerHTML = '<p class="empty-state">Could not load files.</p>';
    }
  },

  /**
   * Select a file and notify the editor to load it.
   */
  async selectFile(path) {
    // Highlight
    document
      .querySelectorAll(".file-tree-item")
      .forEach((el) => el.classList.remove("selected"));
    const item = document.querySelector(`.file-tree-item[data-path="${CSS.escape(path)}"]`);
    if (item) item.classList.add("selected");

    this.currentFile = path;

    // Load file content
    try {
      const res = await fetch(
        `/api/projects/${this.projectId}/files/content?path=${encodeURIComponent(path)}`
      );
      if (!res.ok) throw new Error("Failed to load file");
      const data = await res.json();

      document.getElementById("editor-title").textContent = `📝 ${path}`;
      // Dispatch event for the editor module
      document.dispatchEvent(
        new CustomEvent("file-selected", {
          detail: { path, content: data.content },
        })
      );
    } catch (err) {
      console.error("Load file error:", err);
    }
  },

  /**
   * Set up the "New File" button.
   */
  setupNewFileButton() {
    document.getElementById("btn-new-file").addEventListener("click", () => {
      const name = prompt("File name (e.g. app.py):");
      if (!name) return;
      this.createFile(name);
    });
  },

  /**
   * Create a new file in the workspace.
   */
  async createFile(name) {
    try {
      const res = await fetch(`/api/projects/${this.projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create file");
      }
      await this.refresh();
      // Auto-select the new file
      setTimeout(() => this.selectFile(name), 200);
    } catch (err) {
      alert("Could not create file: " + err.message);
    }
  },

  /**
   * Pick an icon based on file extension.
   */
  fileIcon(path) {
    const ext = path.split(".").pop().toLowerCase();
    const icons = {
      py: "🐍",
      html: "🌐",
      css: "🎨",
      js: "📜",
      json: "📋",
      md: "📖",
      txt: "📄",
      yml: "⚙️",
      yaml: "⚙️",
      toml: "⚙️",
      cfg: "⚙️",
      gitignore: "🙈",
      sql: "🗄️",
      db: "🗄️",
    };
    return icons[ext] || "📄";
  },
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
