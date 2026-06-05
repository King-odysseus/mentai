import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi } from "../../services/filesApi";
import { queryKeys } from "../../services/queryKeys";
import { useEditorStore } from "../../stores/editorStore";
import { useToast } from "../shared";
import Spinner from "../shared/Spinner";
import EmptyState from "../shared/EmptyState";
import type { FileInfo } from "../../types/project";
import FileTreeItem from "./FileTreeItem";
import styles from "./FileTree.module.css";

interface FileTreeProps {
  projectId: number;
}

export default function FileTree({ projectId }: FileTreeProps) {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const openFile = useEditorStore((s) => s.openFile);
  const currentFilePath = useEditorStore((s) => s.currentFilePath);

  const { data: files, isLoading, isError } = useQuery({
    queryKey: queryKeys.projects.files(projectId),
    queryFn: () => filesApi.list(projectId),
    refetchInterval: 30_000,
  });

  const openMutation = useMutation({
    mutationFn: (file: FileInfo) => filesApi.read(projectId, file.path),
    onSuccess: (data) => openFile(data.path, data.content),
    onError: (err: Error) => show(err.message, { type: "info", icon: "⚠️" }),
  });

  const createMutation = useMutation({
    mutationFn: (path: string) => filesApi.create(projectId, path),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.files(projectId),
      });
      openFile(data.path, "");
      show("File created", { type: "success", icon: "📄" });
    },
    onError: (err: Error) => show(err.message, { type: "info", icon: "⚠️" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (file: FileInfo) => filesApi.delete(projectId, file.path),
    onSuccess: (_data, file) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.files(projectId),
      });
      if (currentFilePath === file.path) openFile("", "");
      show("File deleted", { type: "info", icon: "🗑️" });
    },
    onError: (err: Error) => show(err.message, { type: "info", icon: "⚠️" }),
  });

  function handleNewFile() {
    const name = window.prompt("New file name (e.g. main.py):");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }

  function handleDelete(file: FileInfo) {
    if (window.confirm(`Delete "${file.path}"? This cannot be undone.`)) {
      deleteMutation.mutate(file);
    }
  }

  return (
    <>
      <div className={styles.header}>
        <span className={styles.title}>Files</span>
        <button
          type="button"
          className={styles.newBtn}
          onClick={handleNewFile}
          title="New file"
          aria-label="New file"
        >
          +
        </button>
      </div>

      <div className={styles.body}>
        {isLoading && <Spinner size="sm" />}
        {isError && <EmptyState message="Could not load files." />}
        {files && files.length === 0 && (
          <EmptyState message="No files yet. Create one to start." />
        )}
        {files && files.length > 0 && (
          <div className={styles.list}>
            {files.map((file) => (
              <FileTreeItem
                key={file.path}
                file={file}
                selected={currentFilePath === file.path}
                onSelect={(f) => openMutation.mutate(f)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
