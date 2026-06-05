import { useEditorStore } from "../../stores/editorStore";
import styles from "./OutputPanel.module.css";

export default function LivePreview() {
  const previewUrl = useEditorStore((s) => s.previewUrl);

  if (!previewUrl) {
    return (
      <div className={styles.previewEmpty}>
        <span className={styles.muted}>
          No preview. Open an HTML file and click Preview.
        </span>
      </div>
    );
  }

  return (
    <iframe
      key={previewUrl}
      className={styles.preview}
      src={previewUrl}
      title="Live preview"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
