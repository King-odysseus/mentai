/** Workspace page — three-panel IDE. Full implementation in Phases 5-7. */
import { useParams } from "react-router-dom";

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="workspace-page" style={{ height: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="neo-card" style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, marginBottom: "var(--space-md)" }}>
          Workspace — Project {projectId}
        </h2>
        <p className="empty-state">
          Three-panel IDE (file tree, code editor, AI tutor chat) coming in Phases 5-7.
        </p>
      </div>
    </div>
  );
}
