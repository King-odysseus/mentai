import { api } from "./api";
import type { ConceptExposure, MasteryLevel } from "../types/concept";

export const conceptsApi = {
  byProject: (projectId: number) =>
    api.get<ConceptExposure[]>(`/api/concepts/project/${projectId}`),

  expose: (
    projectId: number,
    conceptTitle: string,
    moduleTitle?: string,
    notes?: string
  ) => {
    const params = new URLSearchParams();
    params.set("project_id", String(projectId));
    params.set("concept_title", conceptTitle);
    if (moduleTitle) params.set("module_title", moduleTitle);
    if (notes) params.set("notes", notes);
    return api.post<ConceptExposure>(`/api/concepts/expose?${params}`);
  },

  updateMastery: (exposureId: number, mastery: MasteryLevel, notes?: string) =>
    api.patch<ConceptExposure>(`/api/concepts/${exposureId}/mastery`, {
      mastery,
      notes,
    }),

  dueReview: (projectId: number) =>
    api.get<ConceptExposure[]>(`/api/concepts/project/${projectId}/due`),
};
