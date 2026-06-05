import type { SelectHTMLAttributes, ReactNode } from "react";
import styles from "./Select.module.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  variant?: "neo" | "glass";
  error?: string;
  children: ReactNode;
}

export default function Select({
  variant = "neo",
  error,
  children,
  className = "",
  ...rest
}: SelectProps) {
  const cls = [styles.select, styles[variant], error ? styles.error : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrapper}>
      <select className={cls} {...rest}>
        {children}
      </select>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
