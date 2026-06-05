import { api } from "./api";
import type {
  ProjectListItem,
  ProjectCreate,
  ProjectUpdate,
  ProjectListResponse,
} from "../types/project";

export const projectsApi = {
  list: () => api.get<ProjectListResponse>("/api/projects"),

  get: (id: number) => api.get<ProjectListItem>(`/api/projects/${id}`),

  create: (data: ProjectCreate) =>
    api.post<ProjectListItem>("/api/projects", data),

  update: (id: number, data: ProjectUpdate) =>
    api.patch<ProjectListItem>(`/api/projects/${id}`, data),

  delete: (id: number) => api.delete<void>(`/api/projects/${id}`),
};
