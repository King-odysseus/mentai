import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../services/dashboardApi";
import { queryKeys } from "../../services/queryKeys";
import { Card, EmptyState } from "../shared";
import { MASTERY_ORDER, MASTERY_COLORS } from "../../types/dashboard";
import styles from "./MasteryDonut.module.css";

export default function MasteryDonut() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.progress,
    queryFn: dashboardApi.getProgress,
  });

  const dist = data?.mastery_distribution ?? {};
  const total = Object.values(dist).reduce((a: number, b: number) => a + b, 0) || 1;

  // SVG donut: circumference = 2 * PI * r
  const r = 40;
  const circ = 2 * Math.PI * r;
  const mastered = dist.mastered || 0;

  return (
    <Card>
      <h2 className={styles.title}>Concept Mastery</h2>
      {isLoading && <EmptyState message="Loading..." />}
      {!isLoading && total <= 0 && (
        <EmptyState message="No concepts tracked yet." />
      )}
      {total > 0 && (
        <div className={styles.row}>
          <svg viewBox="0 0 120 120" width="120" height="120">
            {MASTERY_ORDER.reduce((acc: { offset: number; elems: React.ReactNode[] }, level) => {
              const count = dist[level] || 0;
              const dash = (count / total) * circ;
              acc.elems.push(
                <circle
                  key={level}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={MASTERY_COLORS[level]}
                  strokeWidth="12"
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-acc.offset}
                  transform="rotate(-90 60 60)"
                />
              );
              acc.offset += dash;
              return acc;
            }, { offset: 0, elems: [] }).elems}
            <text x="60" y="55" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">
              {mastered}
            </text>
            <text x="60" y="72" textAnchor="middle" fontSize="10" opacity="0.5">
              mastered
            </text>
          </svg>
          <div className={styles.legend}>
            {MASTERY_ORDER.map((level) => (
              <div key={level} className={styles.legendItem}>
                <span
                  className={styles.dot}
                  style={{ background: MASTERY_COLORS[level] }}
                />
                {level}: {dist[level] || 0}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
