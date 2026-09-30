export const emailKeys = {
  all: ["email"] as const,
  status: () => ["email", "status"] as const,
  templates: () => ["email", "templates"] as const,
  preview: (key: string) => ["email", "preview", key] as const,
};
