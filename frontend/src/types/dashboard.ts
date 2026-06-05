/** Dashboard stats types — mirrors /api/dashboard/stats and /api/dashboard/progress */

export interface DashboardStats {
  total_projects: number;
  total_concepts: number;
  total_sessions: number;
  total_learning_minutes: number;
  mastery_breakdown: Record<string, number>;
  recent_projects: {
    id: number;
    name: string;
    status: string;
    updated_at: string;
  }[];
}

export interface DailySession {
  date: string; // YYYY-MM-DD
  minutes: number;
}

export interface RecentlyMasteredItem {
  concept: string;
  encounter_count: number;
}

export interface DashboardProgress {
  daily_sessions: DailySession[];
  mastery_distribution: Record<string, number>;
  recently_mastered: RecentlyMasteredItem[];
  total_learning_time: number;
  current_streak: number;
}

/** Mastery display helpers */
export const MASTERY_COLORS: Record<string, string> = {
  introduced: "#f0c040",
  practiced: "#54aeff",
  confident: "#4ac26b",
  mastered: "#8250df",
};

export const MASTERY_ICONS: Record<string, string> = {
  introduced: "🌱",
  practiced: "🌿",
  confident: "🪴",
  mastered: "🌳",
};

export const MASTERY_ORDER = ["introduced", "practiced", "confident", "mastered"];
