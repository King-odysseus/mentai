import { useNavigate } from "react-router-dom";
import { Card } from "../shared";
import styles from "./QuickSession.module.css";

export default function QuickSession() {
  const navigate = useNavigate();

  function startSession(mode: "micro" | "deep") {
    // Navigate to the most recent project workspace with mode param.
    // If no project exists, the workspace will handle it.
    navigate(`/workspace/1?mode=${mode}`);
  }

  return (
    <Card>
      <h2 className={styles.title}>Quick Session</h2>
      <div className={styles.options}>
        <button
          className={styles.btn}
          onClick={() => startSession("micro")}
        >
          <span className={styles.icon}>⚡</span>
          <span className={styles.label}>Micro Session</span>
          <span className={styles.time}>5-15 min</span>
          <span className={styles.desc}>Quick concept review or code walkthrough</span>
        </button>
        <button
          className={`${styles.btn} ${styles.deep}`}
          onClick={() => startSession("deep")}
        >
          <span className={styles.icon}>🔨</span>
          <span className={styles.label}>Deep Build</span>
          <span className={styles.time}>30-120 min</span>
          <span className={styles.desc}>Build features, refactor, deep architecture discussions</span>
        </button>
      </div>
      <p className={styles.hint}>Select a project first, then pick a session type.</p>
    </Card>
  );
}
