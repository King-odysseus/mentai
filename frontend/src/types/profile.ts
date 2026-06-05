/** User profile types — mirrors app/schemas/profile.py */

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface Profile {
  id: number;
  display_name: string;
  python_level: ExperienceLevel;
  javascript_level: ExperienceLevel;
  html_css_level: ExperienceLevel;
  database_level: ExperienceLevel;
  git_level: ExperienceLevel;
  preferred_backend: string | null;
  preferred_frontend: string | null;
  preferred_database: string | null;
  learning_goal: string | null;
  time_per_week: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileCreate {
  display_name?: string;
  python_level?: ExperienceLevel;
  javascript_level?: ExperienceLevel;
  html_css_level?: ExperienceLevel;
  database_level?: ExperienceLevel;
  git_level?: ExperienceLevel;
  preferred_backend?: string | null;
  preferred_frontend?: string | null;
  preferred_database?: string | null;
  learning_goal?: string | null;
  time_per_week?: string | null;
  onboarding_complete?: boolean;
}

export interface ProfileUpdate {
  display_name?: string | null;
  python_level?: ExperienceLevel | null;
  javascript_level?: ExperienceLevel | null;
  html_css_level?: ExperienceLevel | null;
  database_level?: ExperienceLevel | null;
  git_level?: ExperienceLevel | null;
  preferred_backend?: string | null;
  preferred_frontend?: string | null;
  preferred_database?: string | null;
  learning_goal?: string | null;
  time_per_week?: string | null;
  onboarding_complete?: boolean | null;
}
