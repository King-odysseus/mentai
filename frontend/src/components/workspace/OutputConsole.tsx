import { useEditorStore } from "../../stores/editorStore";
import styles from "./OutputPanel.module.css";

export default function OutputConsole() {
  const outputText = useEditorStore((s) => s.outputText);

  return (
    <pre className={styles.console}>
      {outputText || <span className={styles.muted}>No output yet. Run a Python file to see results here.</span>}
    </pre>
  );
}
