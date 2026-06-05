import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../../services/projectsApi";
import { queryKeys } from "../../services/queryKeys";
import { Modal, Input, Button } from "../shared";
import styles from "./NewProjectModal.module.css";
import type { ProjectCreate } from "../../types/project";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

export default function NewProjectModal({
  open,
  onClose,
  onCreated,
}: NewProjectModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [fieldError, setFieldError] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreate) => projectsApi.create(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      resetForm();
      onCreated(project.id);
    },
  });

  function resetForm() {
    setName("");
    setDescription("");
    setTechStack("");
    setFieldError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFieldError("Project name is required.");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      tech_stack: techStack.trim() || undefined,
    });
  }

  function handleClose() {
    if (!createMutation.isPending) {
      resetForm();
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create New Project">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="new-proj-name">Project Name</label>
          <Input
            id="new-proj-name"
            placeholder="e.g. Task Tracker API"
            maxLength={255}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldError) setFieldError("");
            }}
            error={fieldError}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="new-proj-desc">Description (optional)</label>
          <Input
            id="new-proj-desc"
            placeholder="What will this project do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="new-proj-stack">Tech Stack (optional)</label>
          <Input
            id="new-proj-stack"
            placeholder="e.g. Python, FastAPI, SQLite"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
          />
        </div>

        {createMutation.isError && (
          <div className={styles.error}>
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "Failed to create project."}
          </div>
        )}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="neo-secondary"
            size="sm"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="neo-primary"
            size="sm"
            loading={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
