import { create } from "zustand";

type EditorLanguage = "python" | "html" | "css" | "javascript" | null;

function detectLanguage(path: string): EditorLanguage {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "py": return "python";
    case "html": return "html";
    case "css": return "css";
    case "js": return "javascript";
    default: return null;
  }
}

interface EditorState {
  currentFilePath: string | null;
  currentContent: string;
  originalContent: string;
  isDirty: boolean;
  language: EditorLanguage;
  outputText: string;
  previewUrl: string | null;

  openFile: (path: string, content: string) => void;
  setContent: (content: string) => void;
  markSaved: () => void;
  setOutput: (text: string) => void;
  setPreviewUrl: (url: string | null) => void;
  setDirty: (dirty: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentFilePath: null,
  currentContent: "",
  originalContent: "",
  isDirty: false,
  language: null,
  outputText: "",
  previewUrl: null,

  openFile: (path, content) =>
    set({
      currentFilePath: path,
      currentContent: content,
      originalContent: content,
      isDirty: false,
      language: detectLanguage(path),
      outputText: "",
    }),

  setContent: (content) =>
    set((s) => ({
      currentContent: content,
      isDirty: content !== s.originalContent,
    })),

  markSaved: () =>
    set((s) => ({
      originalContent: s.currentContent,
      isDirty: false,
    })),

  setOutput: (text) => set({ outputText: text }),

  setPreviewUrl: (url) => set({ previewUrl: url }),

  setDirty: (dirty) => set({ isDirty: dirty }),
}));
