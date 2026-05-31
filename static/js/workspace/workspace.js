/**
 * Workspace — orchestrates the three-panel learning environment.
 * Handles editor collapse/expand and panel resizing.
 */

document.addEventListener("DOMContentLoaded", () => {
  const workspace = document.querySelector(".workspace");
  if (!workspace) return;

  const projectId = parseInt(workspace.dataset.projectId, 10);
  if (!projectId) return;

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "micro";

  Editor.init();
  FileTree.init(projectId);
  Chat.init(projectId, mode);
  LearningPath.init(projectId);
  Voice.init();

  setInterval(() => FileTree.refresh(), 30_000);

  window.addEventListener("beforeunload", (e) => {
    const title = document.getElementById("editor-title");
    if (title?.textContent?.startsWith("●")) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // --------------------------------------------------------------------------
  // Editor Toggle — collapse/expand center panel
  // --------------------------------------------------------------------------
  const toggleBtn = document.getElementById("btn-toggle-editor");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const collapsed = workspace.classList.toggle("editor-collapsed");
      toggleBtn.textContent = collapsed ? "▶" : "◀";
      toggleBtn.title = collapsed ? "Show editor" : "Hide editor";

      if (collapsed) {
        document.getElementById("chat-input")?.focus();
      }
      setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
    });
  }

  // --------------------------------------------------------------------------
  // Panel Resize — drag divider between editor and chat
  // --------------------------------------------------------------------------
  const handle = document.getElementById("panel-resize-handle");
  if (handle) {
    let isDragging = false;

    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      handle.classList.add("active");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const rect = workspace.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const leftWidth = 220; // file tree pixel width
      const rightPanelMin = 280;
      const editorMin = 200;
      const available = rect.width - leftWidth - rightPanelMin - 4; // 4px for handle
      const editorPx = Math.max(editorMin, Math.min(mouseX - leftWidth, available));
      const chatPx = available - editorPx + rightPanelMin;

      // Set the handle's position explicitly
      workspace.style.gridTemplateColumns = `${leftWidth}px ${editorPx}px 4px ${chatPx}px`;
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      handle.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  }
});
