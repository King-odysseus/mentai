import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "neo" | "glass";
  error?: string;
}

export default function Input({
  variant = "neo",
  error,
  className = "",
  ...rest
}: InputProps) {
  const cls = [styles.input, styles[variant], error ? styles.error : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrapper}>
      <input className={cls} {...rest} />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
