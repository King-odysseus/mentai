/**
 * Workspace — orchestrates the three-panel learning environment.
 * Initializes all modules: FileTree, Editor, Chat, Voice.
 * Handles editor collapse/expand and theme sync.
 */

document.addEventListener("DOMContentLoaded", () => {
  const workspace = document.querySelector(".workspace");
  if (!workspace) return;

  const projectId = parseInt(workspace.dataset.projectId, 10);
  if (!projectId) return;

  // Parse URL params for session mode
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "micro";

  // Initialize modules
  Editor.init();
  FileTree.init(projectId);
  Chat.init(projectId, mode);
  LearningPath.init(projectId);
  Voice.init();

  // Refresh file tree periodically (every 30s) in case files change externally
  setInterval(() => FileTree.refresh(), 30_000);

  // Warn before leaving if there are unsaved changes
  window.addEventListener("beforeunload", (e) => {
    const title = document.getElementById("editor-title");
    if (title?.textContent?.startsWith("●")) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // --------------------------------------------------------------------------
  // Editor Collapse/Expand — toggle center panel visibility
  // --------------------------------------------------------------------------
  const collapseBtn = document.getElementById("btn-collapse-editor");
  const editorHeader = document.getElementById("editor-header");
  if (collapseBtn) {
    let collapsed = false;

    collapseBtn.addEventListener("click", () => {
      collapsed = !collapsed;
      workspace.classList.toggle("editor-collapsed", collapsed);
      collapseBtn.textContent = collapsed ? "◀" : "▶";
      collapseBtn.title = collapsed ? "Expand editor" : "Collapse editor";

      // When collapsed, prevent the editor from retaining keyboard focus
      if (collapsed) {
        document.getElementById("chat-input")?.focus();
      }

      // Redraw CodeMirror after transition
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 300);
    });
  }
});
