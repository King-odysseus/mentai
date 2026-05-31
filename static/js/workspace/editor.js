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
    const projectId = document.querySelector(".workspace")?.dataset.projectId;
    document.addEventListener("file-selected", (e) => {
      this.loadFile(e.detail.path, e.detail.content);
      // Auto-preview HTML/rendered files on selection
      const ext = e.detail.path.split(".").pop().toLowerCase();
      if (["html", "css", "js"].includes(ext)) {
        previewFile(e.detail.path, projectId);
      }
    });

    // Save button
    document.getElementById("btn-save-file").addEventListener("click", () => this.save());

    // Run button
    document.getElementById("btn-run-file").addEventListener("click", () => this.run());

    // Preview button
    document.getElementById("btn-preview-file").addEventListener("click", () => {
      if (!this.currentPath) return;
      previewFile(this.currentPath, projectId);
    });

    // Review button
    document.getElementById("btn-review-file").addEventListener("click", () => this.review());

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

    // Auto-format before saving: tabs→spaces, trim trailing whitespace, trailing newline
    let content = this.view.state.doc.toString();
    content = content.replace(/\t/g, "    ");
    content = content.split("\n").map((line) => line.trimEnd()).join("\n");
    content = content.trimEnd() + "\n";

    // Update editor with formatted content
    const { EditorView } = window.CodeMirror;
    const currentPos = this.view.state.selection.main.head;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: content },
    });
    // Restore cursor position approximately
    const newPos = Math.min(currentPos, content.length);
    this.view.dispatch({ selection: { anchor: newPos } });

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

      // Refresh live preview if the preview is visible and file is renderable
      const previewFrame = document.getElementById("preview-frame");
      const ext = this.currentPath.split(".").pop().toLowerCase();
      if (!previewFrame.hidden && ["html", "css", "js"].includes(ext)) {
        const url = new URL(previewFrame.src, location.origin);
        url.searchParams.set("_t", Date.now());
        previewFrame.src = url.toString();
      }

      // Brief visual feedback
      const btn = document.getElementById("btn-save-file");
      btn.textContent = "✅ Formatted & Saved";
      setTimeout(() => (btn.textContent = "💾 Save"), 1500);
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
  },

  /**
   * Request a code review from the AI tutor.
   */
  review() {
    if (!this.currentPath || !this.view) return;
    const code = this.view.state.doc.toString();
    const focus = prompt("Review focus? (general / security / style / architecture)", "general");
    document.dispatchEvent(
      new CustomEvent("code-review-requested", {
        detail: { code, file_path: this.currentPath, focus: focus || "general" },
      })
    );
  },

  /**
   * Run the current Python file and show output. Auto-saves first.
   */
  async run() {
    if (!this.currentPath || !this.view) return;

    const projectId = document.querySelector(".workspace")?.dataset.projectId;
    const outputPanel = document.getElementById("output-panel");
    const outputContent = document.getElementById("output-content");

    outputPanel.hidden = false;
    outputContent.textContent = "Saving & running...";

    // Auto-save before running so the latest code executes
    try {
      await this.save();
    } catch (e) {
      outputContent.textContent = "Failed to save: " + e.message;
      return;
    }

    outputContent.textContent = "Running...";

    try {
      const res = await fetch(`/api/projects/${projectId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: this.currentPath }),
      });
      const data = await res.json();

      let text = "";
      if (data.output) text += data.output;
      if (data.error) text += (text ? "\n" : "") + "[stderr]\n" + data.error;
      if (!text) {
        text =
          data.exit_code === 0
            ? "Program finished with no output."
            : `Program exited with code ${data.exit_code}.`;
      }
      outputContent.textContent = text;
    } catch (err) {
      outputContent.textContent = "Error running file: " + err.message;
    }
  },
};

// Output panel resize, close, tab switching, and live preview
document.addEventListener("DOMContentLoaded", () => {
  // Close button
  document.getElementById("btn-close-output")?.addEventListener("click", () => {
    document.getElementById("output-panel").hidden = true;
  });

  // Tab switching: Output vs Preview
  const outputContent = document.getElementById("output-content");
  const previewFrame = document.getElementById("preview-frame");
  document.querySelectorAll(".output-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".output-tab").forEach((t) =>
        t.classList.remove("active")
      );
      tab.classList.add("active");
      const panel = tab.dataset.panel;
      if (panel === "output-tab-preview") {
        outputContent.hidden = true;
        previewFrame.hidden = false;
      } else {
        outputContent.hidden = false;
        previewFrame.hidden = true;
      }
    });
  });

  // Live preview: load current file in iframe
  window.previewFile = function (filePath, projectId) {
    const ext = filePath.split(".").pop().toLowerCase();
    const isRenderable = ["html", "css", "js", "svg"].includes(ext);
    if (!isRenderable) {
      outputContent.hidden = false;
      previewFrame.hidden = true;
      document.querySelector('.output-tab[data-panel="output-tab-console"]')?.click();
      return;
    }

    const panel = document.getElementById("output-panel");
    panel.hidden = false;

    // Switch to Preview tab
    const previewTab = document.querySelector('.output-tab[data-panel="output-tab-preview"]');
    previewTab?.click();

    // For HTML files, use serve endpoint so relative CSS/JS links work
    const serveUrl = `/api/projects/${projectId}/serve/${encodeURIComponent(filePath)}`;
    previewFrame.src = serveUrl;
  };

  // Drag-to-resize output panel
  const handle = document.getElementById("output-resize-handle");
  const outputPanel = document.getElementById("output-panel");
  if (handle && outputPanel) {
    let startY = 0;
    let startHeight = 0;

    handle.addEventListener("mousedown", (e) => {
      startY = e.clientY;
      startHeight = outputPanel.offsetHeight;
      handle.classList.add("active");
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      const onMouseMove = (e) => {
        const delta = startY - e.clientY;
        const newHeight = Math.max(80, Math.min(window.innerHeight * 0.6, startHeight + delta));
        outputPanel.style.height = newHeight + "px";
      };

      const onMouseUp = () => {
        handle.classList.remove("active");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }
});
