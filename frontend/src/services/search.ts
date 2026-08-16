import api from "../lib/api";

export interface SearchResultItem {
  id: string;
  name: string;
  subtitle: string;
}

// Matches backend models.GlobalSearchResponse — bounded (top 5 per entity)
// results for the admin header's jump-to-record search, not a paginated
// list endpoint.
export interface GlobalSearchResponse {
  students: SearchResultItem[];
  teachers: SearchResultItem[];
  guardians: SearchResultItem[];
  non_academic_staff: SearchResultItem[];
}

export const searchApi = {
  global: (q: string) =>
    api.get<GlobalSearchResponse>("/admin/search", { params: { q } }).then((r) => r.data),
};
