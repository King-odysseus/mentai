import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../services/queryKeys";
import { Modal, Spinner } from "../shared";
import type { CompareResult } from "../../types/project";
import styles from "./CompareModal.module.css";

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  projectA: number;
  projectB: number;
}

export default function CompareModal({
  open,
  onClose,
  projectA,
  projectB,
}: CompareModalProps) {
  const [tab, setTab] = useState<"files" | "concepts" | "patterns">("files");

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.projects.compare(projectA, projectB),
    queryFn: () =>
      fetch(`/api/projects/compare/${projectA}/${projectB}`).then(
        (r) => r.json() as Promise<CompareResult>
      ),
    enabled: open && projectA > 0 && projectB > 0,
  });

  return (
    <Modal open={open} onClose={onClose} title="Project Comparison">
      <div className={styles.tabs}>
        {(["files", "concepts", "patterns"] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.active : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {isLoading && <Spinner size="sm" label="Comparing projects..." />}
        {isError && (
          <p className={styles.error}>Comparison failed. Please try again.</p>
        )}
        {data && tab === "files" && <FilesTab data={data} />}
        {data && tab === "concepts" && <ConceptsTab data={data} />}
        {data && tab === "patterns" && <PatternsTab data={data} />}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tabs                                                            */
/* ------------------------------------------------------------------ */

function DiffList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={styles.diff}>
      <div className={styles.diffLabel}>
        {label} ({items.length})
      </div>
      <ul className={styles.diffList}>
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function FilesTab({ data }: { data: CompareResult }) {
  const d = data.file_diff;
  return (
    <div>
      <p className={styles.summary}>
        {d.total_a} files in {data.project_a.name} vs {d.total_b} in{" "}
        {data.project_b.name}
      </p>
      <DiffList label={`Only in ${data.project_a.name}`} items={d.only_in_a} />
      <DiffList label={`Only in ${data.project_b.name}`} items={d.only_in_b} />
      <DiffList label="In both projects" items={d.in_both} />
    </div>
  );
}

function ConceptsTab({ data }: { data: CompareResult }) {
  const concepts = data.concept_comparison ?? [];
  const onlyA = concepts.filter((c) => c.project_b_mastery === "not_seen");
  const onlyB = concepts.filter((c) => c.project_a_mastery === "not_seen");
  const both = concepts.filter(
    (c) =>
      c.project_a_mastery !== "not_seen" && c.project_b_mastery !== "not_seen"
  );

  return (
    <div>
      <p className={styles.summary}>
        Only in {data.project_a.name}: {onlyA.length} | Only in{" "}
        {data.project_b.name}: {onlyB.length} | Both: {both.length}
      </p>
      {concepts.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Concept</th>
              <th>{data.project_a.name}</th>
              <th>{data.project_b.name}</th>
            </tr>
          </thead>
          <tbody>
            {concepts.map((c, i) => (
              <tr key={i}>
                <td>{c.concept}</td>
                <td className={`${styles.mastery} ${styles[c.project_a_mastery]}`}>
                  {c.project_a_mastery}
                </td>
                <td className={`${styles.mastery} ${styles[c.project_b_mastery]}`}>
                  {c.project_b_mastery}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PatternsTab({ data }: { data: CompareResult }) {
  const pat = data.pattern_comparison;
  return (
    <div>
      <DiffList
        label={`Only in ${data.project_a.name}`}
        items={pat.only_in_a}
      />
      <DiffList
        label={`Only in ${data.project_b.name}`}
        items={pat.only_in_b}
      />
      <DiffList label="In both projects" items={pat.in_both} />
    </div>
  );
}
