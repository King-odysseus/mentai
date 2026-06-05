import { api } from "./api";
import type { Goal, GoalCreate, TodayGoalsResponse } from "../types/goal";

export const goalsApi = {
  list: (goalType?: string, targetDate?: string) => {
    const params = new URLSearchParams();
    if (goalType) params.set("goal_type", goalType);
    if (targetDate) params.set("target_date", targetDate);
    const qs = params.toString();
    return api.get<Goal[]>(`/api/goals${qs ? `?${qs}` : ""}`);
  },

  today: () => api.get<TodayGoalsResponse>("/api/goals/today"),

  create: (data: GoalCreate) => api.post<Goal>("/api/goals", data),

  update: (id: number, data: { progress?: number; completed?: number }) =>
    api.patch<Goal>(`/api/goals/${id}`, data),

  delete: (id: number) => api.delete<void>(`/api/goals/${id}`),
};
