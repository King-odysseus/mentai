import { useCallback } from "react";
import { useUIStore } from "../../stores/uiStore";
import OutputConsole from "./OutputConsole";
import LivePreview from "./LivePreview";
import styles from "./OutputPanel.module.css";

export default function OutputPanel() {
  const visible = useUIStore((s) => s.outputPanelVisible);
  const height = useUIStore((s) => s.outputPanelHeight);
  const activeTab = useUIStore((s) => s.outputActiveTab);
  const setVisible = useUIStore((s) => s.setOutputPanelVisible);
  const setHeight = useUIStore((s) => s.setOutputPanelHeight);
  const setTab = useUIStore((s) => s.setOutputActiveTab);

  const handleResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = useUIStore.getState().outputPanelHeight;

      const onMove = (ev: MouseEvent) => {
        // Dragging up (negative dy) grows the panel.
        setHeight(startHeight + (startY - ev.clientY));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [setHeight]
  );

  if (!visible) return null;

  return (
    <div className={styles.panel} style={{ height }}>
      <div
        className={styles.resizeHandle}
        onMouseDown={handleResize}
        role="separator"
        aria-orientation="horizontal"
      />
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "console" ? styles.tabActive : ""}`}
            onClick={() => setTab("console")}
          >
            Console
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "preview" ? styles.tabActive : ""}`}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={() => setVisible(false)}
          title="Close output panel"
          aria-label="Close output panel"
        >
          ✕
        </button>
      </div>
      <div className={styles.body}>
        {activeTab === "console" ? <OutputConsole /> : <LivePreview />}
      </div>
    </div>
  );
}
