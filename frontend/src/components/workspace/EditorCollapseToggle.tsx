import { useUIStore } from "../../stores/uiStore";
import styles from "./EditorCollapseToggle.module.css";

export default function EditorCollapseToggle() {
  const collapsed = useUIStore((s) => s.editorCollapsed);
  const setCollapsed = useUIStore((s) => s.setEditorCollapsed);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setCollapsed(!collapsed)}
      title={collapsed ? "Show editor" : "Hide editor"}
      aria-label={collapsed ? "Show editor" : "Hide editor"}
    >
      {collapsed ? "▶" : "◀"}
    </button>
  );
}
