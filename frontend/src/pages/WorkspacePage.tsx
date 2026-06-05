/** Workspace page — three-panel IDE.
 *  Phase 5: file tree + code editor + output panel.
 *  Right panel (AI tutor chat) is wired in Phase 6. */
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useEditorActions } from "../hooks/useEditorActions";
import { useEditorStore } from "../stores/editorStore";
import { useUIStore } from "../stores/uiStore";
import {
  WorkspaceLayout,
  FileTree,
  CodeEditor,
  EditorToolbar,
  OutputPanel,
} from "../components/workspace";
import styles from "./WorkspacePage.module.css";

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);

  const openFile = useEditorStore((s) => s.openFile);
  const setPreviewUrl = useEditorStore((s) => s.setPreviewUrl);
  const setOutputPanelVisible = useUIStore((s) => s.setOutputPanelVisible);

  // Reset editor state when switching projects so a file from another
  // project never lingers in the editor.
  useEffect(() => {
    openFile("", "");
    setPreviewUrl(null);
    setOutputPanelVisible(false);
  }, [id, openFile, setPreviewUrl, setOutputPanelVisible]);

  const actions = useEditorActions(id);

  if (!projectId || Number.isNaN(id)) {
    return <div className={styles.invalid}>Invalid project.</div>;
  }

  return (
    <WorkspaceLayout
      leftPanel={<FileTree projectId={id} />}
      centerPanel={
        <div className={styles.center}>
          <EditorToolbar actions={actions} />
          <CodeEditor onSave={actions.save} />
          <OutputPanel />
        </div>
      }
      rightPanel={
        <div className={styles.chatPlaceholder}>
          <h3 className={styles.chatTitle}>AI Tutor</h3>
          <p className={styles.chatHint}>Chat with your tutor arrives in Phase 6.</p>
        </div>
      }
    />
  );
}
