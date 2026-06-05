import { useChatStore } from "../../stores/chatStore";
import styles from "./TutorChat.module.css";

interface SessionControlsProps {
  onModeChange: (mode: "micro" | "deep") => void;
}

export default function SessionControls({ onModeChange }: SessionControlsProps) {
  const sessionMode = useChatStore((s) => s.sessionMode);

  return (
    <select
      className={styles.sessionSelect}
      value={sessionMode}
      onChange={(e) => onModeChange(e.target.value as "micro" | "deep")}
      title="Session mode"
      aria-label="Session mode"
    >
      <option value="micro">Micro · 5–15m</option>
      <option value="deep">Deep · 30–120m</option>
    </select>
  );
}
