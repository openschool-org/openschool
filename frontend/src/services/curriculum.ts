import api from "../lib/api";

export interface Medium {
  id: string;
  name: string;
  created_at: string;
}

export interface Level {
  id: string;
  label: string;
  grade_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface SelectionGroup {
  id: string;
  level_id: string;
  label: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  created_at: string;
}

export interface GroupSubject {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string | null;
  // null medium means the subject is offered in any medium
  medium_id: string | null;
  medium_name: string | null;
  // informational guidance only - never enforced
  prerequisite_note: string | null;
  sort_order: number;
}

export interface CurriculumTree {
  level: Level;
  groups: CurriculumTreeGroup[];
}

export interface CurriculumTreeGroup {
  id: string;
  label: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  subjects: GroupSubject[];
}

export interface CreateMediumRequest {
  name: string;
}

export interface CreateLevelRequest {
  label: string;
  grade_id?: string;
  sort_order?: number;
}

export interface CreateSelectionGroupRequest {
  label: string;
  min_select: number;
  max_select: number;
  sort_order?: number;
}

export interface AddGroupSubjectRequest {
  subject_id: string;
  medium_id?: string;
  prerequisite_note?: string;
  sort_order?: number;
}

export const mediumApi = {
  list: () => api.get<Medium[]>("/mediums").then((r) => r.data),

  create: (data: CreateMediumRequest) =>
    api.post<Medium>("/mediums", data).then((r) => r.data),

  update: (id: string, data: CreateMediumRequest) =>
    api.put<Medium>(`/mediums/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/mediums/${id}`).then((r) => r.data),
};

export const levelApi = {
  list: () => api.get<Level[]>("/levels").then((r) => r.data),

  get: (id: string) => api.get<Level>(`/levels/${id}`).then((r) => r.data),

  tree: (id: string) =>
    api.get<CurriculumTree>(`/levels/${id}/tree`).then((r) => r.data),

  create: (data: CreateLevelRequest) =>
    api.post<Level>("/levels", data).then((r) => r.data),

  // copies the level's groups and their subjects under a new label
  duplicate: (id: string, data: CreateLevelRequest) =>
    api.post<Level>(`/levels/${id}/duplicate`, data).then((r) => r.data),

  update: (id: string, data: CreateLevelRequest) =>
    api.put<Level>(`/levels/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/levels/${id}`).then((r) => r.data),
};

export const groupApi = {
  listByLevel: (levelId: string) =>
    api.get<SelectionGroup[]>(`/levels/${levelId}/groups`).then((r) => r.data),

  create: (levelId: string, data: CreateSelectionGroupRequest) =>
    api
      .post<SelectionGroup>(`/levels/${levelId}/groups`, data)
      .then((r) => r.data),

  update: (groupId: string, data: CreateSelectionGroupRequest) =>
    api.put<SelectionGroup>(`/groups/${groupId}`, data).then((r) => r.data),

  remove: (groupId: string) =>
    api.delete(`/groups/${groupId}`).then((r) => r.data),

  listSubjects: (groupId: string) =>
    api.get<GroupSubject[]>(`/groups/${groupId}/subjects`).then((r) => r.data),

  addSubject: (groupId: string, data: AddGroupSubjectRequest) =>
    api.post(`/groups/${groupId}/subjects`, data).then((r) => r.data),

  removeSubject: (groupId: string, subjectId: string) =>
    api.delete(`/groups/${groupId}/subjects/${subjectId}`).then((r) => r.data),
};
