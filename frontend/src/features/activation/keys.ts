export const activationKeys = {
  all: ["activation"] as const,
  status: () => ["activation", "status"] as const,
  settings: () => ["activation", "settings"] as const,
  batches: () => ["activation", "batches"] as const,
};
