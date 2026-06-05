import { api } from "./api";
import type { FileInfo, FileContent, RunResult } from "../types/project";

export const filesApi = {
  list: (projectId: number) =>
    api.get<FileInfo[]>(`/api/projects/${projectId}/files`),

  read: (projectId: number, path: string) =>
    api.get<FileContent>(
      `/api/projects/${projectId}/files/content?path=${encodeURIComponent(path)}`
    ),

  write: (projectId: number, path: string, content: string) =>
    api.put<{ path: string; saved: boolean }>(
      `/api/projects/${projectId}/files/content`,
      { path, content }
    ),

  create: (projectId: number, path: string) =>
    api.post<{ path: string; created: boolean }>(
      `/api/projects/${projectId}/files`,
      { path }
    ),

  delete: (projectId: number, path: string) =>
    api.delete<void>(
      `/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`
    ),

  run: (projectId: number, path: string) =>
    api.post<RunResult>(`/api/projects/${projectId}/run`, { path }),

  serveUrl: (projectId: number, path: string) =>
    `/api/projects/${projectId}/serve/${encodeURIComponent(path)}`,
};
