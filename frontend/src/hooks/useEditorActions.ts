import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { filesApi } from "../services/filesApi";
import { queryKeys } from "../services/queryKeys";
import { useEditorStore } from "../stores/editorStore";
import { useUIStore } from "../stores/uiStore";
import { useToast } from "../components/shared";

/** Normalize code before saving: tabs→4 spaces, trim trailing whitespace,
 *  ensure a single trailing newline. Mirrors the legacy editor.js behavior. */
function formatContent(content: string): string {
  const normalized = content
    .replace(/\t/g, "    ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");
  return normalized.replace(/\n*$/, "") + "\n";
}

export function useEditorActions(projectId: number) {
  const queryClient = useQueryClient();
  const { show } = useToast();

  const setContent = useEditorStore((s) => s.setContent);
  const markSaved = useEditorStore((s) => s.markSaved);
  const setOutput = useEditorStore((s) => s.setOutput);
  const setPreviewUrl = useEditorStore((s) => s.setPreviewUrl);

  const setOutputVisible = useUIStore((s) => s.setOutputPanelVisible);
  const setOutputTab = useUIStore((s) => s.setOutputActiveTab);

  const save = useCallback(async (): Promise<boolean> => {
    const { currentFilePath, currentContent } = useEditorStore.getState();
    if (!currentFilePath) return false;
    const formatted = formatContent(currentContent);
    try {
      await filesApi.write(projectId, currentFilePath, formatted);
      if (formatted !== currentContent) setContent(formatted);
      markSaved();
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.files(projectId),
      });
      return true;
    } catch (err) {
      show((err as Error).message, { type: "info", icon: "⚠️" });
      return false;
    }
  }, [projectId, setContent, markSaved, queryClient, show]);

  const run = useCallback(async () => {
    const { currentFilePath } = useEditorStore.getState();
    if (!currentFilePath) return;
    if (!currentFilePath.endsWith(".py")) {
      show("Only Python files can be run.", { type: "info", icon: "🐍" });
      return;
    }
    const ok = await save();
    if (!ok) return;
    setOutputTab("console");
    setOutputVisible(true);
    setOutput("Running…");
    try {
      const result = await filesApi.run(projectId, currentFilePath);
      const parts: string[] = [];
      if (result.output) parts.push(result.output);
      if (result.error) parts.push(result.error);
      const text = parts.join("\n").trim();
      setOutput(text || `(no output — exit code ${result.exit_code})`);
    } catch (err) {
      setOutput((err as Error).message);
    }
  }, [projectId, save, setOutput, setOutputTab, setOutputVisible, show]);

  const preview = useCallback(async () => {
    const { currentFilePath } = useEditorStore.getState();
    if (!currentFilePath) return;
    await save();
    setPreviewUrl(filesApi.serveUrl(projectId, currentFilePath));
    setOutputTab("preview");
    setOutputVisible(true);
  }, [projectId, save, setPreviewUrl, setOutputTab, setOutputVisible]);

  const review = useCallback(() => {
    const { currentFilePath, currentContent } = useEditorStore.getState();
    if (!currentFilePath) return;
    const focus = window.prompt(
      "What should the tutor focus on in this review? (optional)",
      ""
    );
    if (focus === null) return; // cancelled
    document.dispatchEvent(
      new CustomEvent("code-review-requested", {
        detail: { path: currentFilePath, content: currentContent, focus },
      })
    );
  }, []);

  return { save, run, preview, review };
}
