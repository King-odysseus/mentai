/**
 * Workspace — orchestrates the three-panel learning environment.
 * Initializes all modules: FileTree, Editor, Chat, Voice.
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
});
