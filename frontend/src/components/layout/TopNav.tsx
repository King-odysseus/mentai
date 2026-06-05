import { Link } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";

export default function TopNav() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <nav className="glass-topnav">
      <Link to="/" className="topnav-brand">
        MentAi
      </Link>
      <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
        <Link to="/" className="neo-btn neo-btn-sm">
          Dashboard
        </Link>
        <button
          className="neo-btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </nav>
  );
}

/* Inline style override for the brand link since it's a one-off */
