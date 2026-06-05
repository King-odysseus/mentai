/** Project types — mirrors app/schemas/project.py */

export interface ProjectCreate {
  name: string;
  description?: string | null;
  tech_stack?: string | null;
}

export interface ProjectUpdate {
  name?: string | null;
  description?: string | null;
  tech_stack?: string | null;
  status?: string | null;
}

export interface ProjectListItem {
  id: number;
  name: string;
  description: string | null;
  tech_stack: string | null;
  directory: string;
  status: string;
  learning_path: string | null; // JSON string — parse on use
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total: number;
}

export interface LearningPathModule {
  title: string;
  concepts: LearningPathConcept[];
}

export interface LearningPathConcept {
  title: string;
  description?: string;
}

export interface FileInfo {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface RunResult {
  output: string;
  error: string;
  exit_code: number;
}

export interface CompareResult {
  project_a: { name: string };
  project_b: { name: string };
  file_diff: {
    total_a: number;
    total_b: number;
    only_in_a: string[];
    only_in_b: string[];
    in_both: string[];
  };
  concept_comparison: ConceptCompareItem[];
  pattern_comparison: {
    only_in_a: string[];
    only_in_b: string[];
    in_both: string[];
  };
}

export interface ConceptCompareItem {
  concept: string;
  project_a_mastery: string;
  project_b_mastery: string;
}
