import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../services/profileApi";
import { queryKeys } from "../services/queryKeys";
import {
  StatsRow,
  ProjectList,
  NewProjectModal,
  QuickSession,
  GoalsWidget,
  PatternLibrary,
  ConceptMasterySummary,
  SessionChart,
  MasteryDonut,
  RecentlyMastered,
  LearningPathWidget,
  CompareModal,
} from "../components/dashboard";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: profileApi.get,
  });

  function handleToggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      const next = [...prev, id];
      if (next.length === 2) setCompareOpen(true);
      return next;
    });
  }

  function handleProjectCreated(id: number) {
    setNewProjectOpen(false);
    navigate(`/workspace/${id}`);
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className={styles.subtitle}>
          Your full-stack journey, one project at a time.
        </p>
      </header>

      {/* Stats Row */}
      <StatsRow />

      {/* Row 1: Projects + Quick Session */}
      <div className={styles.grid}>
        <ProjectList
          onNewProject={() => setNewProjectOpen(true)}
          onToggleCompare={handleToggleCompare}
          selectedForCompare={compareIds}
        />
        <QuickSession />
      </div>

      {/* Row 2: Concept Mastery + Today's Goals */}
      <div className={styles.grid}>
        <ConceptMasterySummary />
        <GoalsWidget />
      </div>

      {/* Row 3: Session Chart + Mastery Donut */}
      <div className={styles.grid}>
        <SessionChart />
        <div>
          <MasteryDonut />
          <RecentlyMastered />
        </div>
      </div>

      {/* Row 4: Patterns + Learning Path */}
      <div className={styles.grid}>
        <PatternLibrary />
        <LearningPathWidget />
      </div>

      {/* Modals */}
      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={handleProjectCreated}
      />
      <CompareModal
        open={compareOpen}
        onClose={() => {
          setCompareOpen(false);
          setCompareIds([]);
        }}
        projectA={compareIds[0] ?? 0}
        projectB={compareIds[1] ?? 0}
      />
    </div>
  );
}
