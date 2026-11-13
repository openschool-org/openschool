// Carbon Tag colours for domain enums, shared by every portal that shows them.
export const SEVERITY_TAG = {
  minor: "gray",
  major: "warm-gray",
  severe: "red",
} as const;

// antd Tag colours for the same enums; undefined is the neutral default tag.
export const SEVERITY_COLOR: Record<"minor" | "major" | "severe", string | undefined> = {
  minor: undefined,
  major: "warning",
  severe: "error",
};

// antd Tag colour per notification priority; undefined is the neutral default tag.
export const NOTIFICATION_PRIORITY_COLOR: Record<"normal" | "important" | "urgent", string | undefined> = {
  normal: undefined,
  important: "warning",
  urgent: "error",
};

export const TIMETABLE_STATUS_TAG = {
  draft: { type: "gray", label: "Draft" },
  under_review: { type: "blue", label: "Under review" },
  approved: { type: "teal", label: "Approved" },
  published: { type: "green", label: "Published" },
  rejected: { type: "red", label: "Rejected" },
  archived: { type: "magenta", label: "Archived" },
} as const;
