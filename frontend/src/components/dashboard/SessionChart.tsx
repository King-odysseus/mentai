import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../services/dashboardApi";
import { queryKeys } from "../../services/queryKeys";
import { Card, EmptyState } from "../shared";
import styles from "./SessionChart.module.css";

export default function SessionChart() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.progress,
    queryFn: dashboardApi.getProgress,
  });

  const sessions = data?.daily_sessions ?? [];

  return (
    <Card>
      <h2 className={styles.title}>Session History (14 days)</h2>
      {isLoading && <EmptyState message="Loading..." />}
      {!isLoading && sessions.length === 0 && (
        <EmptyState message="No sessions in the last 14 days. Start a session to see your activity!" />
      )}
      {sessions.length > 0 && (
        <div className={styles.chart}>
          {sessions.map((d) => {
            const maxMin = Math.max(...sessions.map((s) => s.minutes), 1);
            const h = Math.max((d.minutes / maxMin) * 120, 4);
            return (
              <div key={d.date} className={styles.barWrapper}>
                <div
                  className={styles.bar}
                  style={{ height: `${h}px` }}
                  title={`${d.minutes} min`}
                >
                  <span className={styles.barLabel}>{d.minutes}m</span>
                </div>
                <span className={styles.date}>{d.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
