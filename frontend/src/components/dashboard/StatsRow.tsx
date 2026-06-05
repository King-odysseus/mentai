import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../services/dashboardApi";
import { queryKeys } from "../../services/queryKeys";
import { Card } from "../shared";
import styles from "./StatsRow.module.css";

export default function StatsRow() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardApi.getStats,
  });

  const mastered = data?.mastery_breakdown?.mastered ?? 0;

  return (
    <div className={styles.row}>
      <Card className={styles.stat}>
        <div className={styles.value}>{isLoading ? "—" : data?.total_projects ?? 0}</div>
        <div className={styles.label}>Projects</div>
      </Card>
      <Card className={styles.stat}>
        <div className={styles.value}>{isLoading ? "—" : data?.total_concepts ?? 0}</div>
        <div className={styles.label}>Concepts Tracked</div>
      </Card>
      <Card className={styles.stat}>
        <div className={styles.value}>{isLoading ? "—" : data?.total_sessions ?? 0}</div>
        <div className={styles.label}>Sessions</div>
      </Card>
      <Card className={styles.stat}>
        <div className={styles.value}>{isLoading ? "—" : mastered}</div>
        <div className={styles.label}>Mastered</div>
      </Card>
    </div>
  );
}
