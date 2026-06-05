import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../../services/projectsApi";
import { queryKeys } from "../../services/queryKeys";
import { Card, Button, EmptyState, Spinner, Badge } from "../shared";
import styles from "./ProjectList.module.css";

interface ProjectListProps {
  onNewProject: () => void;
  onToggleCompare: (id: number) => void;
  selectedForCompare: number[];
}

export default function ProjectList({
  onNewProject,
  onToggleCompare,
  selectedForCompare,
}: ProjectListProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: projectsApi.list,
  });

  const projects = data?.projects ?? [];

  if (isLoading) return <Spinner size="md" />;

  if (isError || projects.length === 0) {
    return (
      <Card>
        <div className={styles.header}>
          <h2 className={styles.title}>Your Projects</h2>
          <Button variant="neo-primary" size="sm" onClick={onNewProject}>
            + New Project
          </Button>
        </div>
        <EmptyState
          message="No projects yet. Create one to start learning!"
          action={
            <Button variant="neo-primary" size="sm" onClick={onNewProject}>
              + New Project
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Projects</h2>
        <Button variant="neo-primary" size="sm" onClick={onNewProject}>
          + New Project
        </Button>
      </div>
      <div className={styles.list}>
        {projects.map((p) => {
          const isSelected = selectedForCompare.includes(p.id);
          return (
            <div
              key={p.id}
              className={`${styles.item} ${isSelected ? styles.selected : ""}`}
              onClick={() => navigate(`/workspace/${p.id}`)}
            >
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{p.name}</div>
                <div className={styles.itemStack}>
                  {p.tech_stack || "No stack specified"}
                </div>
              </div>
              <div className={styles.itemRight}>
                <Badge
                  variant={p.status === "active" ? "success" : p.status === "completed" ? "primary" : "default"}
                >
                  {p.status}
                </Badge>
                <button
                  className={styles.compareBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompare(p.id);
                  }}
                  title={isSelected ? "Remove from comparison" : "Select for comparison"}
                >
                  {isSelected ? "✅" : "↔"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {projects.length > 1 && (
        <div className={styles.compareHint}>
          Select two projects with ↔ to compare them side by side
        </div>
      )}
    </Card>
  );
}
