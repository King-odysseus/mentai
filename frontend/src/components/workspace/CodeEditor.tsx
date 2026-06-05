import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { keymap } from "@codemirror/view";
import { Prec, type Extension } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { useEditorStore } from "../../stores/editorStore";
import { useUIStore } from "../../stores/uiStore";
import EmptyState from "../shared/EmptyState";
import styles from "./CodeEditor.module.css";

function languageExtension(
  language: ReturnType<typeof useEditorStore.getState>["language"]
): Extension[] {
  switch (language) {
    case "python":
      return [python()];
    case "html":
      return [html()];
    case "css":
      return [css()];
    case "javascript":
      return [javascript()];
    default:
      return [];
  }
}

interface CodeEditorProps {
  onSave: () => void;
}

export default function CodeEditor({ onSave }: CodeEditorProps) {
  const currentFilePath = useEditorStore((s) => s.currentFilePath);
  const currentContent = useEditorStore((s) => s.currentContent);
  const language = useEditorStore((s) => s.language);
  const setContent = useEditorStore((s) => s.setContent);
  const theme = useUIStore((s) => s.theme);

  const extensions = useMemo<Extension[]>(
    () => [
      ...languageExtension(language),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              onSave();
              return true;
            },
          },
        ])
      ),
    ],
    [language, onSave]
  );

  if (!currentFilePath) {
    return (
      <div className={styles.empty}>
        <EmptyState message="Select a file from the tree to start editing." />
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <CodeMirror
        value={currentContent}
        height="100%"
        theme={theme === "dark" ? oneDark : "light"}
        extensions={extensions}
        onChange={(value) => setContent(value)}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          tabSize: 4,
        }}
      />
    </div>
  );
}
