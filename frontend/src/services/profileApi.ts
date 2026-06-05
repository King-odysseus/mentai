import { api } from "./api";
import type { Profile, ProfileCreate } from "../types/profile";

export const profileApi = {
  get: () => api.get<Profile>("/api/profile"),

  create: (data: ProfileCreate) => api.post<Profile>("/api/profile", data),

  update: (data: Partial<ProfileCreate>) =>
    api.patch<Profile>("/api/profile", data),

  updateName: (name: string) =>
    api.put<Profile>("/api/profile/name", { name }),
};
