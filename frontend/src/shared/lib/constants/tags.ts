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

// antd Tag colour and label per timetable status; undefined colour is the neutral tag.
export const TIMETABLE_STATUS_TAG: Record<"draft" | "under_review" | "approved" | "published" | "rejected" | "archived", { color?: string; label: string }> = {
  draft: { label: "Draft" },
  under_review: { color: "processing", label: "Under review" },
  approved: { color: "cyan", label: "Approved" },
  published: { color: "success", label: "Published" },
  rejected: { color: "error", label: "Rejected" },
  archived: { color: "magenta", label: "Archived" },
};
