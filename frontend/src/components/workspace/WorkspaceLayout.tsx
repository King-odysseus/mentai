import { useState, useCallback, type ReactNode } from "react";
import { useUIStore } from "../../stores/uiStore";
import styles from "./WorkspaceLayout.module.css";

interface WorkspaceLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
}

export default function WorkspaceLayout({
  leftPanel,
  centerPanel,
  rightPanel,
}: WorkspaceLayoutProps) {
  const editorCollapsed = useUIStore((s) => s.editorCollapsed);
  const [leftPx, setLeftPx] = useState(220);
  const [chatPx, setChatPx] = useState(340);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX;
    const startLeft = leftPx;
    const startChat = chatPx;
    const layout = e.currentTarget.parentElement!;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newLeft = Math.max(160, Math.min(320, startLeft + dx));
      const newChat = Math.max(240, Math.min(500, startChat - dx));
      setLeftPx(newLeft);
      setChatPx(newChat);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      layout.style.cursor = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    layout.style.cursor = "col-resize";
  }, [leftPx, chatPx]);

  return (
    <div
      className={`${styles.layout} ${editorCollapsed ? styles.editorCollapsed : ""}`}
      style={{
        gridTemplateColumns: editorCollapsed
          ? `${leftPx}px 0fr 0px 1fr`
          : `${leftPx}px 1fr 4px ${chatPx}px`,
      }}
    >
      <aside className={`${styles.panel} ${styles.panelLeft}`}>{leftPanel}</aside>
      <section className={`${styles.panel} ${styles.panelCenter}`}>{centerPanel}</section>
      <div
        className={styles.handle}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
      />
      <aside className={`${styles.panel} ${styles.right}`}>{rightPanel}</aside>
    </div>
  );
}
