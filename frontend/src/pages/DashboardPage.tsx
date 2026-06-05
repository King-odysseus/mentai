import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../services/profileApi";
import { queryKeys } from "../services/queryKeys";
import { Card, EmptyState } from "../components/shared";
import { StatsRow, ProjectList, NewProjectModal, QuickSession } from "../components/dashboard";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: profileApi.get,
  });

  function handleToggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
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

      {/* Main Grid: Projects + Quick Session + Placeholders */}
      <div className={styles.grid}>
        <ProjectList
          onNewProject={() => setNewProjectOpen(true)}
          onToggleCompare={handleToggleCompare}
          selectedForCompare={compareIds}
        />
        <QuickSession />
      </div>

      {/* Second Row — Phase 4 widgets (stubs for now) */}
      <div className={styles.grid}>
        <Card>
          <h2 className={styles.cardTitle}>Concept Mastery</h2>
          <EmptyState message="Mastery bars and charts coming in Phase 4." />
        </Card>
        <Card>
          <h2 className={styles.cardTitle}>Today's Goals</h2>
          <EmptyState message="Goals widget coming in Phase 4." />
        </Card>
      </div>

      {/* Modals */}
      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
