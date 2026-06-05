/** Design pattern types — mirrors app/schemas/pattern.py */

export interface Pattern {
  id: number;
  name: string;
  category: string;
  description: string | null;
  example_code: string | null;
  use_cases: string | null;
  related_concept_ids: string | null;
  discovered_in_project_id: number | null;
  difficulty: string;
  encounter_count: number;
}

export interface PatternCreate {
  name: string;
  category?: string;
  description?: string | null;
  example_code?: string | null;
  use_cases?: string | null;
  related_concept_ids?: string | null;
  discovered_in_project_id?: number | null;
  difficulty?: string;
}
