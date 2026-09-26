export const workflowKeys = {
  all: ["workflows"] as const,
  catalog: () => ["workflows", "catalog"] as const,
  history: (key: string) => ["workflows", "history", key] as const,
  run: (id: string) => ["workflows", "run", id] as const,
};
