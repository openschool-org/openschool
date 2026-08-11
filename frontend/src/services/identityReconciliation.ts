import api from "../lib/api";

// docs/plan.md §0 — ThunderID accounts with no matching local `users` row,
// left behind by a failed signup rollback.
export interface OrphanedIdentity {
  id: string;
  username: string;
  email: string;
}

export const identityReconciliationApi = {
  list: () => api.get<OrphanedIdentity[]>("/admin/orphaned-accounts").then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/orphaned-accounts/${id}`).then((r) => r.data),
};
