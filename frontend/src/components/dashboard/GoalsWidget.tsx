import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi } from "../../services/goalsApi";
import { queryKeys } from "../../services/queryKeys";
import { Card, ProgressBar, EmptyState } from "../shared";
import styles from "./GoalsWidget.module.css";
import type { GoalCreate } from "../../types/goal";

export default function GoalsWidget() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.goals.today,
    queryFn: goalsApi.today,
  });

  const createMutation = useMutation({
    mutationFn: (data: GoalCreate) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.today });
    },
  });

  const goals = data?.goals ?? [];
  const suggestions = data?.suggestions ?? [];
  const isEmpty = !isLoading && goals.length === 0 && suggestions.length === 0;

  return (
    <Card>
      <h2 className={styles.title}>Today's Goals</h2>

      {isLoading && <EmptyState message="Loading goals..." />}

      {isEmpty && (
        <EmptyState message="No goals today." />
      )}

      {goals.map((g) => (
          <div key={g.id} className={`${styles.item} ${g.completed ? styles.completed : ""}`}>
            <div className={styles.desc}>{g.description}</div>
            <ProgressBar
              value={g.progress}
              max={g.target_value ?? 1}
              color={g.completed ? "var(--color-accent)" : "var(--color-primary)"}
            />
            <div className={styles.meta}>
              {g.progress}/{g.target_value ?? "?"} {g.unit}
            </div>
          </div>
        ))}

      {suggestions.map((s, i) => (
        <div
          key={`sug-${i}`}
          className={`${styles.item} ${styles.suggestion}`}
          onClick={() => {
            if (!createMutation.isPending) {
              const today = new Date().toISOString().slice(0, 10);
              createMutation.mutate({
                goal_type: "daily",
                description: s.description,
                target_value: s.target_value,
                unit: s.unit,
                target_date: today,
              });
            }
          }}
        >
          <div className={styles.desc}>
            {s.description}
          </div>
          <div className={styles.meta}>
            Suggested: {s.target_value} {s.unit} — click to add
          </div>
        </div>
      ))}
    </Card>
  );
}
