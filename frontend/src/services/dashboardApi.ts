import { api } from "./api";
import type { DashboardStats, DashboardProgress } from "../types/dashboard";

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>("/api/dashboard/stats"),

  getProgress: () => api.get<DashboardProgress>("/api/dashboard/progress"),
};
