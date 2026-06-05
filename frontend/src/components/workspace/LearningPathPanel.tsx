import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "../../services/projectsApi";
import { useChatStore } from "../../stores/chatStore";
import { queryKeys } from "../../services/queryKeys";
import type { LearningPathModule } from "../../types/project";
import styles from "./LearningPathPanel.module.css";

interface LearningPathPanelProps {
  projectId: number;
}

export default function LearningPathPanel({ projectId }: LearningPathPanelProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const { data } = useQuery({
    queryKey: queryKeys.projects.byId(projectId),
    queryFn: () => projectsApi.get(projectId),
  });

  const project = data?.project;
  const learningPathStr = project?.learning_path;

  let path: LearningPathModule[] | null = null;
  if (learningPathStr) {
    try {
      path = JSON.parse(learningPathStr);
      if (!Array.isArray(path) || path.length === 0) path = null;
    } catch {
      path = null;
    }
  }

  // Handle ?concept=X auto-trigger from URL (e.g. from dashboard "Teach Me")
  useEffect(() => {
    const conceptParam = searchParams.get("concept");
    if (!conceptParam || !path) return;

    // Wait for WebSocket to be available (debounce-style via timeout)
    const timer = setTimeout(() => {
      const wsSend = useChatStore.getState().wsSend;
      if (!wsSend) return;

      // Find which module contains this concept and expand it
      for (let i = 0; i < path.length; i++) {
        const found = path[i].concepts?.find((c) => c.title === conceptParam);
        if (found) {
          setExpanded((prev) => ({ ...prev, [i]: true }));
          setSelected(conceptParam);
          wsSend({
            type: "teach_concept",
            concept: conceptParam,
            module_title: path[i].title,
          });
          break;
        }
      }
    }, 1200); // Wait for WebSocket connection

    return () => clearTimeout(timer);
  }, [searchParams, path]);

  function toggleModule(mi: number) {
    setExpanded((prev) => ({ ...prev, [mi]: !prev[mi] }));
  }

  function handleConceptClick(concept: string, moduleTitle: string) {
    setSelected(concept);
    const wsSend = useChatStore.getState().wsSend;
    if (wsSend) {
      wsSend({
        type: "teach_concept",
        concept,
        module_title: moduleTitle,
      });
    }
  }

  if (!path) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.heading}>Learning Path</h3>
        <p className={styles.empty}>Learning path is being generated…</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Learning Path</h3>
      {path.map((mod, mi) => (
        <div key={mi} className={styles.module}>
          <button
            className={styles.moduleHeader}
            onClick={() => toggleModule(mi)}
          >
            <span className={styles.toggle}>
              {expanded[mi] ? "▼" : "▶"}
            </span>
            <span className={styles.moduleTitle}>{mod.title}</span>
          </button>
          {expanded[mi] && mod.concepts && (
            <div className={styles.concepts}>
              {mod.concepts.map((c, ci) => (
                <button
                  key={ci}
                  className={`${styles.concept} ${
                    selected === c.title ? styles.selected : ""
                  }`}
                  onClick={() => handleConceptClick(c.title, mod.title)}
                >
                  <span className={styles.conceptTitle}>{c.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
