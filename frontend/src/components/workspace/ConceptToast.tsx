import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ConceptToast.module.css";

const MASTERY: Record<string, { icon: string; label: string; color: string }> = {
  introduced: { icon: "🌱", label: "Introduced", color: "#f0c040" },
  practiced: { icon: "🌿", label: "Practiced", color: "#54aeff" },
  confident: { icon: "🪴", label: "Confident", color: "#4ac26b" },
  mastered: { icon: "🌳", label: "Mastered", color: "#8250df" },
};

interface ToastData {
  id: number;
  concept: string;
  mastery: string;
}

let counter = 0;

export default function ConceptToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { concept: string; mastery: string };
      if (!detail?.concept) return;
      const id = ++counter;
      setToasts((prev) => [...prev, { id, concept: detail.concept, mastery: detail.mastery }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    }
    window.addEventListener("concept-exposed", handler);
    return () => window.removeEventListener("concept-exposed", handler);
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className={styles.container}>
      {toasts.map((t) => {
        const m = MASTERY[t.mastery] ?? MASTERY.introduced;
        return (
          <div key={t.id} className={styles.toast} style={{ borderColor: m.color }}>
            <span className={styles.icon}>{m.icon}</span>
            <div className={styles.text}>
              <span className={styles.level} style={{ color: m.color }}>
                {m.label}
              </span>
              <span className={styles.concept}>{t.concept}</span>
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
