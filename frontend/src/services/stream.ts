import api from "../lib/api";

export interface Stream {
  id: string;
  name: string;
  created_at: string;
}

export interface StreamGroup {
  id: string;
  stream_id: string;
  name: string;
  created_at: string;
}

export const streamApi = {
  list: () => api.get<Stream[]>("/streams").then((r) => r.data),

  listGroups: (streamId: string) =>
    api.get<StreamGroup[]>(`/streams/${streamId}/groups`).then((r) => r.data),
};
