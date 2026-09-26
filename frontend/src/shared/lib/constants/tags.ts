// Carbon Tag colours for domain enums, shared by every portal that shows them.
export const SEVERITY_TAG = {
  minor: "gray",
  major: "warm-gray",
  severe: "red",
} as const;

export const NOTIFICATION_PRIORITY_TAG = {
  normal: "gray",
  important: "warm-gray",
  urgent: "red",
} as const;

export const TIMETABLE_STATUS_TAG = {
  draft: { type: "gray", label: "Draft" },
  under_review: { type: "blue", label: "Under review" },
  approved: { type: "teal", label: "Approved" },
  published: { type: "green", label: "Published" },
  rejected: { type: "red", label: "Rejected" },
  archived: { type: "magenta", label: "Archived" },
} as const;
