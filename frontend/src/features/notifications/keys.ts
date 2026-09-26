export const notificationKeys = {
  all: ["notifications"] as const,
  mine: () => ["notifications", "mine"] as const,
  unread: () => ["notifications", "unread-count"] as const,
  sent: () => ["notifications", "sent"] as const,
  history: (params: object) => ["notifications", "history", params] as const,
  inbox: (params: object) => ["notifications", "mine", "inbox", params] as const,
  drafts: () => ["notifications", "drafts"] as const,
  stats: (id: string) => ["notifications", "stats", id] as const,
};
