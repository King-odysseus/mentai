import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "../../services/projectsApi";
import { queryKeys } from "../../services/queryKeys";
import { Card, EmptyState, Button } from "../shared";
import styles from "./LearningPathWidget.module.css";
import type { LearningPathModule, LearningPathConcept } from "../../types/project";

export default function LearningPathWidget() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { data } = useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: projectsApi.list,
  });

  const projects = data?.projects ?? [];
  const activeProject = projects.find(
    (p) => p.status === "active" && p.learning_path
  );

  if (!activeProject || !activeProject.learning_path) {
    return (
      <Card>
        <h2 className={styles.title}>Your Learning Path</h2>
        <EmptyState message="Create a project to get a personalized AI-generated learning path." />
      </Card>
    );
  }

  // Capture narrowed values for use in callbacks
  const projectId = activeProject.id;
  const projectName = activeProject.name;
  const learningPathStr = activeProject.learning_path;

  let path: LearningPathModule[];
  try {
    path = JSON.parse(learningPathStr);
    if (!Array.isArray(path) || path.length === 0) throw new Error("empty");
  } catch {
    return (
      <Card>
        <h2 className={styles.title}>Your Learning Path</h2>
        <EmptyState message="Learning path is being generated..." />
      </Card>
    );
  }

  function toggleModule(i: number) {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function handleTeach(concept: string) {
    navigate(`/workspace/${projectId}?concept=${encodeURIComponent(concept)}`);
  }

  return (
    <Card>
      <h2 className={styles.title}>Your Learning Path</h2>
      <div className={styles.projectName}>{projectName}</div>
      {path.map((mod, mi) => (
        <div key={mi} className={styles.module}>
          <button
            className={styles.moduleHeader}
            onClick={() => toggleModule(mi)}
          >
            <span className={styles.toggle}>{expanded[mi] ? "▼" : "▶"}</span>
            <span className={styles.moduleTitle}>{mod.title}</span>
            <span className={styles.moduleCount}>
              {mod.concepts?.length ?? 0} concepts
            </span>
          </button>
          {expanded[mi] && mod.concepts && (
            <div className={styles.concepts}>
              {mod.concepts.map((c: LearningPathConcept, ci: number) => (
                <div key={ci} className={styles.concept}>
                  <div>
                    <div className={styles.conceptTitle}>{c.title}</div>
                    {c.description && (
                      <div className={styles.conceptDesc}>{c.description}</div>
                    )}
                  </div>
                  <Button
                    variant="neo-secondary"
                    size="sm"
                    onClick={() => handleTeach(c.title)}
                  >
                    Teach Me
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
