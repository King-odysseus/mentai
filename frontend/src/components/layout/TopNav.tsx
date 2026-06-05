import { Link } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { Button } from "../shared";
import styles from "./TopNav.module.css";

export default function TopNav() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand}>
        MentAi
      </Link>
      <div className={styles.links}>
        <Link to="/">
          <Button variant="neo-secondary" size="sm">
            Dashboard
          </Button>
        </Link>
        <Button
          variant="icon"
          size="sm"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </Button>
      </div>
    </nav>
  );
}
