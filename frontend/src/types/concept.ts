/** Concept tracking types — mirrors app/schemas/concept.py */

export type MasteryLevel =
  | "introduced"
  | "practiced"
  | "confident"
  | "mastered";

export interface ConceptExposure {
  id: number;
  project_id: number;
  concept_title: string;
  module_title: string | null;
  mastery: MasteryLevel;
  encounter_count: number;
  last_reviewed_at: string;
  notes: string | null;
}
