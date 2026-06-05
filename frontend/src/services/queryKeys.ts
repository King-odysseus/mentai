/** Centralized query key factory for TanStack Query */

export const queryKeys = {
  dashboard: {
    stats: ["dashboard", "stats"] as const,
    progress: ["dashboard", "progress"] as const,
  },
  projects: {
    all: ["projects"] as const,
    byId: (id: number) => ["projects", id] as const,
    files: (id: number) => ["projects", id, "files"] as const,
    fileContent: (id: number, path: string) =>
      ["projects", id, "files", path] as const,
    compare: (idA: number, idB: number) =>
      ["projects", "compare", idA, idB] as const,
  },
  concepts: {
    byProject: (id: number) => ["concepts", "project", id] as const,
    due: (id: number) => ["concepts", "due", id] as const,
  },
  patterns: {
    all: ["patterns"] as const,
    byProject: (id: number) => ["patterns", "project", id] as const,
  },
  goals: {
    today: ["goals", "today"] as const,
  },
  profile: {
    current: ["profile"] as const,
  },
} as const;
