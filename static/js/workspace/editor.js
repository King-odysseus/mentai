/**
 * Code Editor — CodeMirror 6 wrapper.
 * Loads files on selection, supports save and run.
 */

const Editor = {
  view: null,
  currentPath: null,
  originalContent: "",

  /**
   * Initialize CodeMirror in the editor container.
   */
  init() {
    const { EditorView, basicSetup, python, html, css, javascript, oneDark } =
      window.CodeMirror;
    if (!EditorView) {
      // CodeMirror hasn't loaded yet — retry
      setTimeout(() => this.init(), 200);
      return;
    }

    const container = document.getElementById("editor-container");
    container.innerHTML = "";

    this.view = new EditorView({
      doc: "",
      extensions: [
        basicSetup,
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.onChange();
          }
        }),
      ],
      parent: container,
    });

    // Listen for file selection events from the file tree
    document.addEventListener("file-selected", (e) => {
      this.loadFile(e.detail.path, e.detail.content);
    });

    // Save button
    document.getElementById("btn-save-file").addEventListener("click", () => this.save());

    // Run button
    document.getElementById("btn-run-file").addEventListener("click", () => this.run());

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        this.save();
      }
    });
  },

  /**
   * Load file content into the editor with the appropriate language mode.
   */
  loadFile(path, content) {
    if (!this.view) return;

    this.currentPath = path;
    this.originalContent = content;

    // Determine language
    const ext = path.split(".").pop().toLowerCase();
    const { python, html, css, javascript } = window.CodeMirror;

    let lang = null;
    if (ext === "py") lang = python();
    else if (ext === "html") lang = html();
    else if (ext === "css") lang = css();
    else if (ext === "js") lang = javascript();

    // Rebuild extensions with the correct language
    const { EditorView, basicSetup, oneDark } = window.CodeMirror;
    const extensions = [basicSetup, oneDark];
    if (lang) extensions.push(lang);
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) this.onChange();
      })
    );

    this.view.destroy();
    this.view = new EditorView({
      doc: content,
      extensions,
      parent: document.getElementById("editor-container"),
    });
  },

  /**
   * Track whether the file has been modified.
   */
  onChange() {
    const currentContent = this.view?.state.doc.toString() || "";
    const isDirty = currentContent !== this.originalContent;
    const title = document.getElementById("editor-title");
    if (title && this.currentPath) {
      title.textContent = `${isDirty ? "● " : "📝 "}${this.currentPath}`;
    }
  },

  /**
   * Save the current file via the API.
   */
  async save() {
    if (!this.currentPath || !this.view) return;

    const content = this.view.state.doc.toString();
    const projectId = document.querySelector(".workspace")?.dataset.projectId;

    try {
      const res = await fetch(`/api/projects/${projectId}/files/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: this.currentPath, content }),
      });
      if (!res.ok) throw new Error("Save failed");

      this.originalContent = content;
      document.getElementById("editor-title").textContent = `📝 ${this.currentPath}`;
      // Brief visual feedback
      const btn = document.getElementById("btn-save-file");
      btn.textContent = "✅ Saved";
      setTimeout(() => (btn.textContent = "💾 Save"), 1500);
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
  },

  /**
   * Run the current Python file and show output.
   */
  async run() {
    if (!this.currentPath || !this.view) return;

    const projectId = document.querySelector(".workspace")?.dataset.projectId;
    const outputPanel = document.getElementById("output-panel");
    const outputContent = document.getElementById("output-content");

    outputPanel.hidden = false;
    outputContent.textContent = "Running...";

    try {
      const res = await fetch(`/api/projects/${projectId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: this.currentPath }),
      });
      const data = await res.json();
      outputContent.textContent = data.output || data.error || "(no output)";
    } catch (err) {
      outputContent.textContent = "Error running file: " + err.message;
    }
  },
};

// Close output button
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-close-output")?.addEventListener("click", () => {
    document.getElementById("output-panel").hidden = true;
  });
});
