import { useQuery } from "@tanstack/react-query";
import { patternsApi } from "../../services/patternsApi";
import { queryKeys } from "../../services/queryKeys";
import { Card, EmptyState } from "../shared";
import styles from "./PatternLibrary.module.css";

export default function PatternLibrary() {
  const { data: patterns, isLoading } = useQuery({
    queryKey: queryKeys.patterns.all,
    queryFn: () => patternsApi.list(),
  });

  if (isLoading) {
    return (
      <Card>
        <h2 className={styles.title}>Pattern Library</h2>
        <EmptyState message="Loading patterns..." />
      </Card>
    );
  }

  if (!patterns || patterns.length === 0) {
    return (
      <Card>
        <h2 className={styles.title}>Pattern Library</h2>
        <EmptyState message="Patterns you discover will appear here as you build projects." />
      </Card>
    );
  }

  // Group by category
  const grouped: Record<string, typeof patterns> = {};
  for (const p of patterns) {
    const cat = p.category || "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  return (
    <Card>
      <h2 className={styles.title}>Pattern Library</h2>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className={styles.group}>
          <div className={styles.category}>{category}</div>
          {items.map((p) => (
            <div key={p.id} className={styles.item}>
              <div className={styles.name}>{p.name}</div>
              <div className={styles.meta}>
                {p.difficulty} — seen {p.encounter_count}x
              </div>
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}
