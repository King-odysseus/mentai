import { useEffect } from "react";
import { useUIStore } from "../stores/uiStore";

/**
 * Syncs the theme store with the <html data-theme> attribute.
 * Call once at the app root.
 */
export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return { theme, toggleTheme };
}
