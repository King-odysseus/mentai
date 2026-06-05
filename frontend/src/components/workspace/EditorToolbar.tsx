import { useEditorStore } from "../../stores/editorStore";
import Button from "../shared/Button";
import EditorCollapseToggle from "./EditorCollapseToggle";
import type { useEditorActions } from "../../hooks/useEditorActions";
import styles from "./EditorToolbar.module.css";

interface EditorToolbarProps {
  actions: ReturnType<typeof useEditorActions>;
}

export default function EditorToolbar({ actions }: EditorToolbarProps) {
  const currentFilePath = useEditorStore((s) => s.currentFilePath);
  const isDirty = useEditorStore((s) => s.isDirty);
  const language = useEditorStore((s) => s.language);

  const hasFile = !!currentFilePath;
  const canRun = language === "python";
  const canPreview = language === "html";

  return (
    <div className={styles.toolbar}>
      <span className={styles.title} title={currentFilePath ?? ""}>
        {hasFile ? (
          <>
            <span className={styles.dirty}>{isDirty ? "●" : "📝"}</span>
            {currentFilePath}
          </>
        ) : (
          <span className={styles.placeholder}>No file open</span>
        )}
      </span>

      <div className={styles.actions}>
        <Button
          variant="neo-secondary"
          size="sm"
          disabled={!hasFile}
          onClick={() => actions.save()}
        >
          Save
        </Button>
        <Button
          variant="neo-secondary"
          size="sm"
          disabled={!hasFile || !canRun}
          onClick={() => actions.run()}
        >
          Run
        </Button>
        <Button
          variant="neo-secondary"
          size="sm"
          disabled={!hasFile || !canPreview}
          onClick={() => actions.preview()}
        >
          Preview
        </Button>
        <Button
          variant="neo-secondary"
          size="sm"
          disabled={!hasFile}
          onClick={() => actions.review()}
        >
          Review
        </Button>
        <EditorCollapseToggle />
      </div>
    </div>
  );
}
