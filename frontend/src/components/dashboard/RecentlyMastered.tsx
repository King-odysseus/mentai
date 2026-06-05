import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../services/dashboardApi";
import { queryKeys } from "../../services/queryKeys";
import styles from "./RecentlyMastered.module.css";

export default function RecentlyMastered() {
  const { data } = useQuery({
    queryKey: queryKeys.dashboard.progress,
    queryFn: dashboardApi.getProgress,
  });

  const items = data?.recently_mastered ?? [];
  if (items.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <h4 className={styles.title}>Recently Mastered</h4>
      {items.map((c, i) => (
        <div key={i} className={styles.item}>
          <span>{c.concept}</span>
          <span className={styles.count}>{c.encounter_count}x</span>
        </div>
      ))}
    </div>
  );
}
