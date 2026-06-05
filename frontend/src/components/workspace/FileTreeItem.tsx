import type { FileInfo } from "../../types/project";
import styles from "./FileTree.module.css";

const ICONS: Record<string, string> = {
  py: "🐍",
  js: "📜",
  ts: "📘",
  jsx: "⚛️",
  tsx: "⚛️",
  html: "🌐",
  css: "🎨",
  json: "🔧",
  md: "📝",
  txt: "📄",
  csv: "📊",
  sql: "🗄️",
  yml: "⚙️",
  yaml: "⚙️",
};

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ICONS[ext] ?? "📄";
}

interface FileTreeItemProps {
  file: FileInfo;
  selected: boolean;
  onSelect: (file: FileInfo) => void;
  onDelete: (file: FileInfo) => void;
}

export default function FileTreeItem({
  file,
  selected,
  onSelect,
  onDelete,
}: FileTreeItemProps) {
  return (
    <div
      className={`${styles.item} ${selected ? styles.selected : ""}`}
      onClick={() => onSelect(file)}
      role="button"
      tabIndex={0}
      title={file.path}
    >
      <span className={styles.icon}>{fileIcon(file.name)}</span>
      <span className={styles.name}>{file.path}</span>
      <button
        type="button"
        className={styles.deleteBtn}
        title="Delete file"
        aria-label={`Delete ${file.path}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(file);
        }}
      >
        ✕
      </button>
    </div>
  );
}
