import type { ReactNode, HTMLAttributes } from "react";
import styles from "./Card.module.css";

type CardVariant = "neo" | "neo-inset" | "glass";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
  children: ReactNode;
}

const paddingMap = {
  sm: "var(--space-md)",
  md: "var(--space-lg)",
  lg: "var(--space-xl)",
};

export default function Card({
  variant = "neo",
  hover = false,
  padding = "md",
  children,
  className = "",
  style,
  ...rest
}: CardProps) {
  const cls = [styles.card, styles[variant], hover ? styles.hover : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} style={{ padding: paddingMap[padding], ...style }} {...rest}>
      {children}
    </div>
  );
}
