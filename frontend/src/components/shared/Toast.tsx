import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Toast.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ToastType = "success" | "info" | "mastery";

interface ToastItem {
  id: number;
  message: string;
  icon?: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, opts?: { icon?: string; type?: ToastType }) => void;
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback(
    (message: string, opts?: { icon?: string; type?: ToastType }) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, icon: opts?.icon, type: opts?.type || "info" }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className={styles.tray}>
          {toasts.map((t) => (
            <ToastItemView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Single toast                                                        */
/* ------------------------------------------------------------------ */

function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss handled by parent removing from array
    const timer = setTimeout(() => setVisible(false), 3000);
    // After exit animation, notify parent
    const cleanup = setTimeout(onDismiss, 3350);
    return () => {
      clearTimeout(timer);
      clearTimeout(cleanup);
    };
  }, [onDismiss]);

  const cls = [styles.toast, styles[item.type], visible ? styles.visible : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      {item.icon && <span className={styles.icon}>{item.icon}</span>}
      <div className={styles.body}>{item.message}</div>
    </div>
  );
}
