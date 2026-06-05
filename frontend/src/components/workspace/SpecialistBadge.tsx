import { useChatStore } from "../../stores/chatStore";
import type { SpecialistInfo } from "../../types/chat";
import styles from "./TutorChat.module.css";

const COLORS: Record<SpecialistInfo["specialization"], string> = {
  python: "#3b82f6",
  database: "#f59e0b",
  frontend: "#ec4899",
  general: "#7c3aed",
};

export default function SpecialistBadge() {
  const specialist = useChatStore((s) => s.specialist);
  const name = specialist?.name ?? "Mentor";
  const color = COLORS[specialist?.specialization ?? "general"];

  return (
    <span className={styles.badge} style={{ borderColor: color, color }}>
      <span className={styles.badgeDot} style={{ background: color }} />
      {name}
    </span>
  );
}
