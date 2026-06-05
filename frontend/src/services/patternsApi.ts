import { api } from "./api";
import type { Pattern, PatternCreate } from "../types/pattern";

export const patternsApi = {
  list: (category?: string, projectId?: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (projectId) params.set("project_id", String(projectId));
    const qs = params.toString();
    return api.get<Pattern[]>(`/api/patterns${qs ? `?${qs}` : ""}`);
  },

  categories: () =>
    api.get<{ category: string; count: number }[]>("/api/patterns/categories"),

  create: (data: PatternCreate) => api.post<Pattern>("/api/patterns", data),

  incrementEncounter: (id: number) =>
    api.patch<{ id: number; encounter_count: number }>(
      `/api/patterns/${id}/encounter`,
      {}
    ),

  byProject: (projectId: number) =>
    api.get<Pattern[]>(`/api/patterns/project/${projectId}`),
};
