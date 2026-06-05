import { create } from "zustand";

type Theme = "dark" | "light";

interface UIState {
  theme: Theme;
  editorCollapsed: boolean;
  panelRatio: number; // 0.0 (editor min) to 1.0 (editor max)
  outputPanelHeight: number;
  outputPanelVisible: boolean;
  outputActiveTab: "console" | "preview";

  toggleTheme: () => void;
  setEditorCollapsed: (collapsed: boolean) => void;
  setPanelRatio: (ratio: number) => void;
  setOutputPanelHeight: (height: number) => void;
  setOutputPanelVisible: (visible: boolean) => void;
  setOutputActiveTab: (tab: "console" | "preview") => void;
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("mentai_theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage unavailable
  }
  return "dark";
}

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  editorCollapsed: false,
  panelRatio: 0.6,
  outputPanelHeight: 200,
  outputPanelVisible: false,
  outputActiveTab: "console",

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      localStorage.setItem("mentai_theme", next);
      return { theme: next };
    }),

  setEditorCollapsed: (collapsed) => set({ editorCollapsed: collapsed }),

  setPanelRatio: (ratio) => set({ panelRatio: Math.max(0, Math.min(1, ratio)) }),

  setOutputPanelHeight: (height) =>
    set({ outputPanelHeight: Math.max(80, Math.min(window.innerHeight * 0.6, height)) }),

  setOutputPanelVisible: (visible) => set({ outputPanelVisible: visible }),

  setOutputActiveTab: (tab) => set({ outputActiveTab: tab }),
}));
