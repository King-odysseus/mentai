/** Goal types — mirrors app/schemas/goal.py */

export type GoalType = "daily" | "weekly";

export interface Goal {
  id: number;
  goal_type: GoalType;
  description: string;
  target_value: number | null;
  progress: number;
  unit: string;
  target_date: string;
  completed: number; // 0 or 1
  created_at: string;
}

export interface GoalCreate {
  goal_type: GoalType;
  description: string;
  target_value?: number | null;
  unit?: string;
  target_date: string; // YYYY-MM-DD
}

export interface GoalUpdate {
  progress?: number;
  completed?: number;
}

export interface TodayGoalsResponse {
  goals: Goal[];
  suggestions: GoalSuggestion[];
}

export interface GoalSuggestion {
  description: string;
  target_value: number;
  unit: string;
}
