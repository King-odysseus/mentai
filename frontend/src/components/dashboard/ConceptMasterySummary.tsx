import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../services/dashboardApi";
import { queryKeys } from "../../services/queryKeys";
import { Card, EmptyState } from "../shared";
import { MASTERY_ORDER } from "../../types/dashboard";
import styles from "./ConceptMasterySummary.module.css";

const MASTERY_BAR_COLORS: Record<string, string> = {
  introduced: "#f0c040",
  practiced: "#54aeff",
  confident: "#4ac26b",
  mastered: "#8250df",
};

export default function ConceptMasterySummary() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardApi.getStats,
  });

  const breakdown = data?.mastery_breakdown;
  const hasData = breakdown && Object.keys(breakdown).length > 0;
  const total = hasData
    ? Object.values(breakdown).reduce((a: number, b: number) => a + b, 0)
    : 0;

  return (
    <Card>
      <h2 className={styles.title}>Concept Mastery</h2>
      {isLoading && <EmptyState message="Loading..." />}
      {!isLoading && !hasData && (
        <EmptyState message="Start a project and your concept progress will appear here." />
      )}
      {hasData &&
        MASTERY_ORDER.map((level) => {
          const count = breakdown[level] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={level} className={styles.row}>
              <span className={styles.label}>{level}</span>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{
                    width: `${pct}%`,
                    background: MASTERY_BAR_COLORS[level],
                  }}
                />
              </div>
              <span className={styles.count}>{count}</span>
            </div>
          );
        })}
    </Card>
  );
}
