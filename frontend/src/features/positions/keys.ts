export const positionKeys = {
  all: ["positions"] as const,
  list: () => ["positions", "list"] as const,
  mine: () => ["positions", "me"] as const,
  myLeadershipOverview: () => ["positions", "me", "leadership-overview"] as const,
  myLedClasses: () => ["positions", "me", "led-classes"] as const,
};
